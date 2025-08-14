from fastapi import FastAPI, HTTPException, Depends, Header
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
from typing import List, Dict, Optional
import asyncio
from datetime import datetime
from supabase import create_client, Client
from jose import jwt, JWTError

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    print("Warning: Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY")
    supabase: Optional[Client] = None
else:
    supabase = create_client(supabase_url, supabase_key)

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

# Authentication models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

# Portfolio models
class PortfolioAsset(BaseModel):
    name: str
    isStock: bool
    ticker: Optional[str] = None
    shares: Optional[float] = None
    currentPrice: Optional[float] = None
    balance: Optional[float] = None
    apy: Optional[float] = None

class PortfolioSaveRequest(BaseModel):
    assets: List[PortfolioAsset]

class ImageParseRequest(BaseModel):
    image: str
    mimeType: str = "image/jpeg"

class PortfolioRequest(BaseModel):
    tickers: List[str]

# Authentication helper functions
async def get_current_user(authorization: str = Header(None)) -> str:
    """Extract user ID from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        token = authorization.split("Bearer ")[1]
        # Verify the JWT token with Supabase
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

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
    """Return current market prices and daily change data for multiple tickers.
    Query param: tickers=AAPL,MSFT,GOOGL
    Response: { 
        "prices": {"AAPL": 172.45, "MSFT": 340.12}, 
        "daily_data": {
            "AAPL": {"open": 170.00, "current": 172.45, "change": 2.45, "change_percent": 1.44},
            "MSFT": {"open": 338.00, "current": 340.12, "change": 2.12, "change_percent": 0.63}
        },
        "timestamp": "2024-01-01T12:00:00Z" 
    }
    """
    try:
        ticker_list = [ticker.strip().upper() for ticker in tickers.split(',') if ticker.strip()]
        if not ticker_list:
            raise HTTPException(status_code=400, detail="No valid tickers provided")
        
        prices = {}
        daily_data = {}
        failed_tickers = []
        
        # Fetch prices and daily data for all tickers
        for ticker in ticker_list:
            try:
                t = yf.Ticker(ticker)
                
                # Get current price using fast_info for more accuracy
                info = t.fast_info if hasattr(t, "fast_info") else {}
                current_price = None
                
                if info and info.get("last_price") is not None:
                    current_price = info.get("last_price")
                else:
                    # Fallback to historical data
                    hist = t.history(period="1d")
                    if not hist.empty:
                        current_price = float(hist['Close'].iloc[-1])
                
                if current_price is None:
                    failed_tickers.append(ticker)
                    continue
                
                prices[ticker] = float(current_price)
                
                # Get yesterday's closing price (or last trading day) and calculate daily change
                hist = t.history(period="5d")  # Get 5 days to ensure we have the last trading day
                if hist.empty or len(hist) < 2:
                    failed_tickers.append(ticker)
                    continue
                
                # Get yesterday's closing price (last trading day)
                yesterday_close = float(hist['Close'].iloc[-2])  # Second to last entry
                daily_change = current_price - yesterday_close
                daily_change_percent = (daily_change / yesterday_close) * 100 if yesterday_close > 0 else 0
                
                daily_data[ticker] = {
                    "yesterday_close": yesterday_close,
                    "current": current_price,
                    "change": daily_change,
                    "change_percent": daily_change_percent
                }
                
                # Debug logging
                print(f"DEBUG {ticker}: Yesterday Close=${yesterday_close:.2f}, Current=${current_price:.2f}, Change=${daily_change:.2f}, Percent={daily_change_percent:.2f}%")
                    
            except Exception as e:
                print(f"Error fetching price for {ticker}: {e}")
                failed_tickers.append(ticker)
        
        return {
            "prices": prices,
            "daily_data": daily_data,
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

# Authentication endpoints
@app.post("/api/auth/register")
async def register_user(user_data: UserRegister):
    """Register a new user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "name": user_data.name
                }
            }
        })
        
        if response.user:
            return UserResponse(
                id=response.user.id,
                email=response.user.email,
                name=user_data.name
            )
        else:
            raise HTTPException(status_code=400, detail="Registration failed")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def login_user(user_data: UserLogin):
    """Login user and return session"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if response.user and response.session:
            return {
                "user": UserResponse(
                    id=response.user.id,
                    email=response.user.email,
                    name=response.user.user_metadata.get("name")
                ),
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/logout")
async def logout_user(authorization: str = Header(None)):
    """Logout user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    try:
        token = authorization.split("Bearer ")[1]
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/me")
async def get_current_user_info(user_id: str = Depends(get_current_user)):
    """Get current user information"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get user data from Supabase
        user_data = supabase.auth.get_user()
        return UserResponse(
            id=user_data.user.id,
            email=user_data.user.email,
            name=user_data.user.user_metadata.get("name")
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# Portfolio management endpoints
@app.post("/api/portfolio/save")
async def save_portfolio(
    portfolio_data: PortfolioSaveRequest,
    user_id: str = Depends(get_current_user)
):
    """Save user's portfolio assets"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Convert assets to database format
        assets_data = []
        for asset in portfolio_data.assets:
            asset_dict = {
                "user_id": user_id,
                "name": asset.name,
                "is_stock": asset.isStock,
                "ticker": asset.ticker,
                "shares": asset.shares,
                "current_price": asset.currentPrice,
                "balance": asset.balance,
                "apy": asset.apy,
                "created_at": datetime.utcnow().isoformat()
            }
            assets_data.append(asset_dict)
        
        # Delete existing assets for this user
        supabase.table("portfolio_assets").delete().eq("user_id", user_id).execute()
        
        # Insert new assets
        if assets_data:
            result = supabase.table("portfolio_assets").insert(assets_data).execute()
            return {"message": "Portfolio saved successfully", "assets_count": len(assets_data)}
        else:
            return {"message": "Portfolio cleared", "assets_count": 0}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save portfolio: {str(e)}")

@app.get("/api/portfolio")
async def get_portfolio(user_id: str = Depends(get_current_user)):
    """Get user's portfolio assets"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        result = supabase.table("portfolio_assets").select("*").eq("user_id", user_id).execute()
        
        assets = []
        for row in result.data:
            asset = PortfolioAsset(
                name=row["name"],
                isStock=row["is_stock"],
                ticker=row["ticker"],
                shares=row["shares"],
                currentPrice=row["current_price"],
                balance=row["balance"],
                apy=row["apy"]
            )
            assets.append(asset)
        
        return {"assets": assets}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get portfolio: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)