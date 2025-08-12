from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import uvicorn
import os
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import io
import base64
import json
from typing import List, Dict
import asyncio
from datetime import datetime

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
gemini_api_key = os.getenv('GEMINI_API_KEY')
if not gemini_api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables")
else:
    genai.configure(api_key=gemini_api_key)

class ImageParseRequest(BaseModel):
    image: str
    mimeType: str = "image/jpeg"

class PortfolioRequest(BaseModel):
    tickers: List[str]

def parse_portfolio_image(image_data: str, mime_type: str):
    """Parse portfolio image using Gemini Vision API"""
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Create prompt for portfolio parsing
        prompt = """
        Analyze this portfolio or account statement image and extract financial assets with EXACT precision.
        
        CRITICAL: Extract ONLY the exact values shown in the image. Do NOT modify, estimate, or correct any numbers. Be as PRECISE as possible. Be thorough.
        
        EXTRACTION RULES:
        - Copy numbers EXACTLY as they appear in the image
        - Do not round, estimate, or "fix" any values
        - If a price shows as 150.25, use 150.25 (not 150.26 or 150.24)
        - If shares show as 10.5, use 10.5 (not 10 or 11)
        - If balance shows as 5000.00, use 5000.00 (not 5000 or 5000.01)
        
        For each asset found, extract:
        - Asset name/company name (exactly as shown in image)
        - Ticker symbol (exactly as shown, if visible)
        - Number of shares/units (exact number from image)
        - Current price per share (exact dollar amount from image)
        - Account balance (exact dollar amount from image)
        - Interest rate/APY (exact percentage from image, convert to decimal - if none, use real-time search functionality to find the most probable APY. If you're not confident, use 0.00%.)
        
        Determine asset type:
        - isStock: true if it has ticker symbol and shares (stocks, ETFs, mutual funds)
        - isStock: false if it's cash, savings, checking, CD, or money market
        
        Return the data as a JSON array with this structure:
        [
          {
            "name": "Company Name",
            "isStock": true/false,
            "ticker": "SYMBOL" (only for stocks, exactly as shown),
            "shares": 123.45 (only for stocks, exact number from image),
            "currentPrice": 150.25 (only for stocks, exact price from image),
            "balance": 5000.00 (only for cash accounts, exact balance from image),
            "apy": 0.045 (only for cash accounts, exact rate from image as decimal)
          }
        ]
        
        IMPORTANT: Only extract what you can see clearly in the image. If you're unsure about any value, omit that asset entirely.
        Only return valid JSON, no other text or explanations.
        """
        
        # Generate response from Gemini
        response = model.generate_content([prompt, image])
        
        # Parse the response
        try:
            # Extract JSON from response
            response_text = response.text.strip()
            # Remove any markdown formatting if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            assets = json.loads(response_text)
            
            # Validate and clean the parsed assets
            validated_assets = []
            for asset in assets:
                if not isinstance(asset, dict):
                    continue
                    
                # Ensure required fields exist
                if 'name' not in asset or 'isStock' not in asset:
                    continue
                
                # Set default values for missing fields
                if asset.get('isStock'):
                    # For stocks, ensure all required fields exist or set defaults
                    asset['ticker'] = asset.get('ticker', '')
                    asset['shares'] = asset.get('shares', 0)
                    asset['currentPrice'] = asset.get('currentPrice', 0)
                    asset['balance'] = 0  # Stocks don't have balance
                    asset['apy'] = 0  # Stocks don't have APY
                    
                    # Ensure numerical values are valid
                    try:
                        shares = float(asset['shares'])
                        current_price = float(asset['currentPrice'])
                        if shares <= 0 or current_price <= 0:
                            continue
                        asset['shares'] = shares
                        asset['currentPrice'] = current_price
                    except (ValueError, TypeError):
                        continue
                
                else:
                    # For cash accounts, ensure all required fields exist or set defaults
                    asset['ticker'] = ''  # Cash accounts don't have tickers
                    asset['shares'] = 0  # Cash accounts don't have shares
                    asset['currentPrice'] = 0  # Cash accounts don't have current price
                    asset['balance'] = asset.get('balance', 0)
                    asset['apy'] = asset.get('apy', 0)  # Default to 0 if APY is unknown
                    
                    try:
                        balance = float(asset['balance'])
                        if balance <= 0:
                            continue
                        asset['balance'] = balance
                        
                        apy = float(asset['apy'])
                        if apy < 0 or apy > 1:  # APY should be between 0 and 1
                            asset['apy'] = 0  # Reset to 0 if invalid
                        else:
                            asset['apy'] = apy
                    except (ValueError, TypeError):
                        continue
                
                validated_assets.append(asset)
            
            print(f"Parsed {len(validated_assets)} valid assets from image")
            return validated_assets
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response text: {response.text}")
            return []
            
    except Exception as e:
        print(f"Error processing image: {e}")
        return []

@app.get("/api/price")
async def get_price(ticker: str):
    """Return the current market price for `ticker`.
    Response: { "ticker": "AAPL", "price": 172.45 }
    """
    try:
        t = yf.Ticker(ticker)
        info = t.fast_info if hasattr(t, "fast_info") else {}
        price = None
        if info and info.get("last_price") is not None:
            price = info.get("last_price")
        else:
            hist = t.history(period="1d", interval="1m")
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])

        if price is None:
            raise Exception("price not found")

        return {"ticker": ticker.upper(), "price": float(price)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch price for {ticker}: {e}")

@app.get("/api/prices")
async def get_prices(tickers: str):
    """Return current market prices for multiple tickers.
    Query param: tickers=AAPL,MSFT,GOOGL
    Response: { "prices": {"AAPL": 172.45, "MSFT": 340.12}, "timestamp": "2024-01-01T12:00:00Z" }
    """
    try:
        ticker_list = [ticker.strip().upper() for ticker in tickers.split(',') if ticker.strip()]
        if not ticker_list:
            raise HTTPException(status_code=400, detail="No valid tickers provided")
        
        prices = {}
        failed_tickers = []
        
        # Fetch prices for all tickers
        for ticker in ticker_list:
            try:
                t = yf.Ticker(ticker)
                info = t.fast_info if hasattr(t, "fast_info") else {}
                price = None
                
                if info and info.get("last_price") is not None:
                    price = info.get("last_price")
                else:
                    hist = t.history(period="1d", interval="1m")
                    if not hist.empty:
                        price = float(hist['Close'].iloc[-1])
                
                if price is not None:
                    prices[ticker] = float(price)
                else:
                    failed_tickers.append(ticker)
                    
            except Exception as e:
                print(f"Error fetching price for {ticker}: {e}")
                failed_tickers.append(ticker)
        
        return {
            "prices": prices,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "failed_tickers": failed_tickers
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {e}")

@app.post("/api/portfolio-value")
async def get_portfolio_value(request: PortfolioRequest):
    """Calculate portfolio value with real-time prices.
    Request: { "tickers": ["AAPL", "MSFT"] }
    Response: { "portfolio_value": 12345.67, "prices": {...}, "timestamp": "..." }
    """
    try:
        if not request.tickers:
            raise HTTPException(status_code=400, detail="No tickers provided")
        
        # Get real-time prices
        prices_response = await get_prices(",".join(request.tickers))
        prices = prices_response["prices"]
        
        return {
            "prices": prices,
            "timestamp": prices_response["timestamp"],
            "failed_tickers": prices_response["failed_tickers"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating portfolio value: {e}")

@app.post("/api/parse-image")
async def parse_image(request: ImageParseRequest):
    """Parse portfolio image using Gemini Vision API"""
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Parse the image and return exact data without modifications
        assets = parse_portfolio_image(request.image, request.mimeType)
        
        return {"assets": assets}
        
    except Exception as e:
        print(f"API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)