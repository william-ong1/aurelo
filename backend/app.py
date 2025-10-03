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
from datetime import datetime, UTC
from supabase import create_client, Client
from jose import jwt, JWTError
import aiohttp

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

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Aurelo Finance API",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.now(UTC).isoformat(),
        "endpoints": {
            "health": "/health",
            "ping": "/ping",
            "api": "/api/*"
        }
    }

# Health check endpoint to keep server alive
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(UTC).isoformat()}

# Keep-alive endpoint that does minimal work
@app.get("/ping")
async def ping():
    return {"message": "pong", "timestamp": datetime.now(UTC).isoformat()}

# Background task to keep server alive
async def keep_alive_task():
    """Background task that pings the server every 10 minutes to prevent shutdown"""
    while True:
        try:
            # Wait 10 minutes (600 seconds)
            await asyncio.sleep(600)
            
            # Get the server URL from environment or use localhost
            server_url = os.getenv('RENDER_SERVER_URL', 'http://localhost:8000')
            
            # Ping our own health endpoint
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{server_url}/health") as response:
                    if response.status == 200:
                        print(f"Keep-alive ping successful at {datetime.now(UTC).isoformat()}")
                    else:
                        print(f"Keep-alive ping failed with status {response.status}")
        except Exception as e:
            print(f"Keep-alive task error: {e}")
            # Continue the loop even if there's an error
            await asyncio.sleep(60)  # Wait 1 minute before retrying

# Start the keep-alive task when the app starts
@app.on_event("startup")
async def startup_event():
    # Only start keep-alive task if we're on Render (has RENDER env var)
    if os.getenv('RENDER'):
        asyncio.create_task(keep_alive_task())
        print("Keep-alive task started for Render deployment")

app.add_middleware(
    CORSMiddleware,
    # allow_origins=[
    #     "http://localhost:5173", 
    #     "http://localhost:3000",
    #     "http://192.168.0.14:3000",
    #     "http://192.168.0.14:8000",
    #     "http://10.18.219.26:3000",
    #     "http://10.19.248.248:3000",
    #     "https://aurelo-finance.vercel.app",
    #     "http://10.18.143.116:3000",
    # ],
    allow_origins=["*"],   # Allow all origins
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
    purchasePrice: Optional[float] = None
    balance: Optional[float] = None
    apy: Optional[float] = None

class PortfolioSaveRequest(BaseModel):
    assets: List[PortfolioAsset]

# Trade models
class Trade(BaseModel):
    id: Optional[int] = None
    date: str
    ticker: str
    realized_pnl: Optional[float] = None
    percent_diff: Optional[float] = None

class TradeCreate(BaseModel):
    date: str
    ticker: str
    realized_pnl: Optional[float] = None
    percent_diff: Optional[float] = None
    is_image_upload: Optional[bool] = False

class TradeUpdate(BaseModel):
    date: Optional[str] = None
    ticker: Optional[str] = None
    realized_pnl: Optional[float] = None
    percent_diff: Optional[float] = None

# Watchlist models
class WatchlistItem(BaseModel):
    id: Optional[int] = None
    ticker: str
    notes: Optional[str] = None
    chart_link: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class WatchlistCreate(BaseModel):
    ticker: str
    notes: Optional[str] = None
    chart_link: Optional[str] = None

class WatchlistUpdate(BaseModel):
    ticker: Optional[str] = None
    notes: Optional[str] = None
    chart_link: Optional[str] = None

# Journal models
class JournalEntry(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    tags: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None

class JournalCreate(BaseModel):
    title: str
    content: str
    tags: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None

class JournalUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None

class JournalPositionUpdate(BaseModel):
    position_x: float
    position_y: float

class JournalSizeUpdate(BaseModel):
    width: float
    height: float

class ImageParseRequest(BaseModel):
    image: str
    mimeType: str = "image/jpeg"

class MultipleImageParseRequest(BaseModel):
    images: List[ImageParseRequest]

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

def get_current_price_for_ticker(ticker: str) -> Optional[float]:
    """Get current market price for a ticker symbol"""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1d")
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
        return None
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return None

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
        - Purchase price per share (exact dollar amount from image - this is the cost basis/price paid)
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
            "purchasePrice": 150.25 (only for stocks, exact purchase price/cost basis from image),
            "balance": 5000.00 (only for cash accounts, exact balance from image),
            "apy": 0.045 (only for cash accounts, exact rate from image as decimal)
          }
        ]
        
        IMPORTANT: 
        - The price extracted from the image should be treated as the PURCHASE PRICE (cost basis), not current market price
        - Only extract what you can see clearly in the image. If you're unsure about any value, omit that asset entirely.
        - Only return valid JSON, no other text or explanations.
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
                    asset['purchasePrice'] = asset.get('purchasePrice', 0)
                    asset['balance'] = 0  # Stocks don't have balance
                    asset['apy'] = 0  # Stocks don't have APY
                    
                    # Ensure numerical values are valid
                    try:
                        shares = float(asset['shares'])
                        purchase_price = float(asset['purchasePrice'])
                        if shares <= 0 or purchase_price <= 0:
                            continue
                        asset['shares'] = shares
                        asset['purchasePrice'] = purchase_price
                    except (ValueError, TypeError):
                        continue
                
                else:
                    # For cash accounts, ensure all required fields exist or set defaults
                    asset['ticker'] = ''  # Cash accounts don't have tickers
                    asset['shares'] = 0  # Cash accounts don't have shares
                    asset['purchasePrice'] = 0  # Cash accounts don't have purchase price
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
            
            return validated_assets
            
        except json.JSONDecodeError as e:
            return []
            
    except Exception as e:
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
                
            except Exception as e:
                failed_tickers.append(ticker)
        
        return {
            "prices": prices,
            "daily_data": daily_data,
            "timestamp": datetime.now(UTC).isoformat(),
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
        raise HTTPException(status_code=500, detail="Failed to process image")

@app.post("/api/parse-multiple-images")
async def parse_multiple_images(request: MultipleImageParseRequest):
    """Parse multiple portfolio images using Gemini Vision API"""
    try:
        if not request.images or len(request.images) == 0:
            raise HTTPException(status_code=400, detail="No images provided")
        
        all_assets = []
        
        # Process each image
        for image_request in request.images:
            if image_request.image and image_request.mimeType:
                assets = parse_portfolio_image(image_request.image, image_request.mimeType)
                all_assets.extend(assets)
        
        return {"assets": all_assets}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process images")

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
                "purchase_price": asset.purchasePrice,
                "balance": asset.balance,
                "apy": asset.apy,
                "created_at": datetime.now(UTC).isoformat()
            }
            assets_data.append(asset_dict)
        
        # Delete existing assets for this user
        supabase.table("portfolio_assets").delete().eq("user_id", user_id).execute()
        
        # Insert new assets
        if assets_data:
            supabase.table("portfolio_assets").insert(assets_data).execute()
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
        result = supabase.table("portfolio_assets").select("name,is_stock,ticker,shares,current_price,purchase_price,balance,apy").eq("user_id", user_id).execute()
        
        assets = []
        for row in result.data:
            asset = PortfolioAsset(
                name=row["name"],
                isStock=row["is_stock"],
                ticker=row["ticker"],
                shares=row["shares"],
                currentPrice=row["current_price"],
                purchasePrice=row["purchase_price"],
                balance=row["balance"],
                apy=row["apy"]
            )
            assets.append(asset)
        
        return {"assets": assets}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get portfolio: {str(e)}")

# Trade management endpoints
@app.post("/api/trades")
async def create_trade(
    trade_data: TradeCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new trade"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Only perform duplicate check for image uploads
        if trade_data.is_image_upload:
            # Check for duplicate trade - only query specific fields for efficiency
            existing_trades = supabase.table("trades").select("id,date,ticker,realized_pnl,percent_diff").eq("user_id", user_id).eq("date", trade_data.date).eq("ticker", trade_data.ticker.upper()).execute()
            
            # Check if any existing trade matches all criteria (date, ticker, realized_pnl, percent_diff)
            for existing_trade in existing_trades.data:
                if (existing_trade["realized_pnl"] == trade_data.realized_pnl and
                    existing_trade["percent_diff"] == trade_data.percent_diff):
                    # Duplicate found - return existing trade instead of creating new one
                    return {
                        "trade": Trade(
                            id=existing_trade["id"],
                            date=existing_trade["date"],
                            ticker=existing_trade["ticker"],
                            realized_pnl=existing_trade["realized_pnl"],
                            percent_diff=existing_trade["percent_diff"]
                        ),
                        "is_duplicate": True
                    }
        
        # No duplicate found, create new trade
        trade_dict = {
            "user_id": user_id,
            "date": trade_data.date,
            "ticker": trade_data.ticker.upper(),
            "realized_pnl": trade_data.realized_pnl,
            "percent_diff": trade_data.percent_diff,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        result = supabase.table("trades").insert(trade_dict).execute()
        
        if result.data:
            created_trade = result.data[0]
            return {
                "trade": Trade(
                    id=created_trade["id"],
                    date=created_trade["date"],
                    ticker=created_trade["ticker"],
                    realized_pnl=created_trade["realized_pnl"],
                    percent_diff=created_trade["percent_diff"]
                ),
                "is_duplicate": False
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create trade")
            
    except Exception as e:
        print(f"Error creating trade: {e}")
        # Check if it's a table not found error
        if "relation" in str(e).lower() and "does not exist" in str(e).lower():
            raise HTTPException(status_code=500, detail="Trades table not found. Please run the SQL script in SETUP_SUPABASE.md to create the trades table.")
        raise HTTPException(status_code=500, detail=f"Failed to create trade: {str(e)}")

@app.get("/api/trades")
async def get_trades(user_id: str = Depends(get_current_user)):
    """Get all trades for the user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        result = supabase.table("trades").select("id,date,ticker,realized_pnl,percent_diff").eq("user_id", user_id).order("date", desc=True).execute()
        
        trades = []
        for row in result.data:
            trade = Trade(
                id=row["id"],
                date=row["date"],
                ticker=row["ticker"],
                realized_pnl=row["realized_pnl"],
                percent_diff=row["percent_diff"]
            )
            trades.append(trade)
        
        return {"trades": trades}
        
    except Exception as e:
        # Check if it's a table not found error
        if "relation" in str(e).lower() and "does not exist" in str(e).lower():
            raise HTTPException(status_code=500, detail="Trades table not found. Please run the SQL script in SETUP_SUPABASE.md to create the trades table.")
        raise HTTPException(status_code=500, detail=f"Failed to get trades: {str(e)}")

@app.put("/api/trades/{trade_id}")
async def update_trade(
    trade_id: int,
    trade_data: TradeUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a trade"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Build update dictionary with only provided fields
        update_data = {}
        if trade_data.date is not None:
            update_data["date"] = trade_data.date
        if trade_data.ticker is not None:
            update_data["ticker"] = trade_data.ticker.upper()
        if trade_data.realized_pnl is not None:
            update_data["realized_pnl"] = trade_data.realized_pnl
        if trade_data.percent_diff is not None:
            update_data["percent_diff"] = trade_data.percent_diff
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = supabase.table("trades").update(update_data).eq("id", trade_id).eq("user_id", user_id).execute()
        
        if result.data:
            updated_trade = result.data[0]
            return Trade(
                id=updated_trade["id"],
                date=updated_trade["date"],
                ticker=updated_trade["ticker"],
                realized_pnl=updated_trade["realized_pnl"],
                percent_diff=updated_trade["percent_diff"]
            )
        else:
            raise HTTPException(status_code=404, detail="Trade not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update trade: {str(e)}")

@app.delete("/api/trades/{trade_id}")
async def delete_trade(
    trade_id: int,
    user_id: str = Depends(get_current_user)
):
    """Delete a trade"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        result = supabase.table("trades").delete().eq("id", trade_id).eq("user_id", user_id).execute()
        
        if result.data:
            return {"message": "Trade deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Trade not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete trade: {str(e)}")

@app.get("/api/trades/analytics")
async def get_trade_analytics(user_id: str = Depends(get_current_user)):
    """Get trading analytics and statistics"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get all trades for the user
        result = supabase.table("trades").select("id,date,ticker,realized_pnl,percent_diff").eq("user_id", user_id).execute()
        trades = result.data
        
        if not trades:
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "success_rate": 0,
                "total_pnl": 0,
                "average_pnl": 0,
                "monthly_performance": {}
            }
        
        # Calculate analytics
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t.get("realized_pnl", 0) > 0])
        losing_trades = len([t for t in trades if t.get("realized_pnl", 0) < 0])
        success_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0
        
        total_pnl = sum(t.get("realized_pnl", 0) for t in trades)
        average_pnl = total_pnl / total_trades if total_trades > 0 else 0
        

        
        # Group trades by month
        monthly_performance = {}
        for trade in trades:
            date = datetime.fromisoformat(trade["date"])
            month_key = f"{date.year}-{date.month:02d}"
            
            if month_key not in monthly_performance:
                monthly_performance[month_key] = {
                    "total_pnl": 0,
                    "total_trades": 0,
                    "winning_trades": 0,
                    "losing_trades": 0
                }
            
            monthly_performance[month_key]["total_pnl"] += trade.get("realized_pnl", 0)
            monthly_performance[month_key]["total_trades"] += 1
            if trade.get("realized_pnl", 0) > 0:
                monthly_performance[month_key]["winning_trades"] += 1
            elif trade.get("realized_pnl", 0) < 0:
                monthly_performance[month_key]["losing_trades"] += 1
        
        # Calculate success rates for each month
        for month in monthly_performance:
            total = monthly_performance[month]["total_trades"]
            winning = monthly_performance[month]["winning_trades"]
            monthly_performance[month]["success_rate"] = (winning / total) * 100 if total > 0 else 0
        
        return {
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "success_rate": round(success_rate, 2),
            "total_pnl": round(total_pnl, 2),
            "average_pnl": round(average_pnl, 2),
            "monthly_performance": monthly_performance
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trade analytics: {str(e)}")

@app.post("/api/trades/parse-image")
async def parse_trade_image(request: ImageParseRequest, user_id: str = Depends(get_current_user)):
    """Parse trade image using Gemini Vision API"""
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Parse the image for trade data
        trades = parse_trade_image_with_gemini(request.image, request.mimeType)
        
        return {"trades": trades}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process trade image")

@app.post("/api/trades/parse-multiple-images")
async def parse_multiple_trade_images(request: MultipleImageParseRequest, user_id: str = Depends(get_current_user)):
    """Parse multiple trade images using Gemini Vision API"""
    try:
        if not request.images or len(request.images) == 0:
            raise HTTPException(status_code=400, detail="No images provided")
        
        all_trades = []
        
        # Process each image
        for image_request in request.images:
            if image_request.image and image_request.mimeType:
                trades = parse_trade_image_with_gemini(image_request.image, image_request.mimeType)
                all_trades.extend(trades)
        
        return {"trades": all_trades}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process trade images")

def parse_trade_image_with_gemini(image_data: str, mime_type: str):
    """Parse trade image using Gemini Vision API"""
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Create prompt for trade parsing
        prompt = """
        Analyze this trading statement or profit/loss image and extract trade data with EXACT precision.
        
        CRITICAL: Extract ONLY the exact values shown in the image. Do NOT modify, estimate, or correct any numbers. Be as PRECISE as possible.
        
        EXTRACTION RULES:
        - Copy numbers EXACTLY as they appear in the image
        - Do not round, estimate, or "fix" any values
        - If P&L shows as +$2.00, use 2.00 (positive)
        - If P&L shows as -$34.21, use -34.21 (negative)
        - If percent shows as +5.13%, use 5.13 (positive)
        - If percent shows as -6.29%, use -6.29 (negative)
        
        REQUIRED FIELDS (must extract these):
        - Date (in YYYY-MM-DD format, convert from "Aug 25, 2025" to "2025-08-25")
        - Ticker symbol (extract ONLY the stock symbol, not the full description):
          * For stock trades like "OPEN market sell" → use "OPEN"
          * For stock trades like "IXHL market sell" → use "IXHL"
          * For options trades like "QQQ $572 Put 8/25" → use "QQQ $572 Put 8/25"
        - Realized P&L (exact dollar amount from image, include sign)
        - Percent difference (exact percentage from image, include sign)

        FORMAT EXAMPLES:
        - Stock trade: "OPEN market sell" → ticker: "OPEN", date: "2025-08-25"
        - Stock trade: "IXHL market sell" → ticker: "IXHL", date: "2025-08-25"
        - Stock trade: "THAR market sell" → ticker: "THAR", date: "2025-08-25"
        - Options trade: "QQQ $572 Put 8/25" → ticker: "QQQ $572 Put 8/25", date: "2025-08-25"
        - P&L: "+$27.82" → realized_pnl: 27.82
        - P&L: "-$34.21" → realized_pnl: -34.21
        - Percent: "+3.30%" → percent_diff: 3.30
        - Percent: "-6.29%" → percent_diff: -6.29
        
        Return the data as a JSON array with this structure:
        [
          {
            "date": "2025-08-25",
            "ticker": "OPEN",
            "realized_pnl": 27.82,
            "percent_diff": 3.30
          },
          {
            "date": "2025-08-25",
            "ticker": "QQQ $572 Put 8/25",
            "realized_pnl": 2.00,
            "percent_diff": 5.13
          }
        ]
        
        IMPORTANT: 
        - Extract ALL trades visible in the list
        - Convert date format from "Aug 25, 2025" to "2025-08-25"
        - Include the sign (+ or -) for P&L and percentage values
        - For stock trades, extract ONLY the ticker symbol (e.g., "OPEN" not "OPEN market sell")
        - For options trades, use the full option description as ticker
        - Only return valid JSON, no other text or explanations
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
            
            trades = json.loads(response_text)
            
            # Validate and clean the parsed trades
            validated_trades = []
            for trade in trades:
                if not isinstance(trade, dict):
                    continue
                    
                # Ensure required fields exist
                required_fields = ['date', 'ticker', 'realized_pnl', 'percent_diff']
                if not all(field in trade for field in required_fields):
                    continue
                
                # Ensure numerical values are valid
                try:
                    realized_pnl = float(trade['realized_pnl'])
                    percent_diff = float(trade['percent_diff'])
                    trade['realized_pnl'] = realized_pnl
                    trade['percent_diff'] = percent_diff
                except (ValueError, TypeError):
                    continue
                
                # Convert ticker to uppercase
                trade['ticker'] = trade['ticker'].upper()
                
                validated_trades.append(trade)
            
            return validated_trades
            
        except json.JSONDecodeError as e:
            return []
            
    except Exception as e:
        return []

# Watchlist API endpoints
@app.post("/api/watchlist")
async def create_watchlist_item(item: WatchlistCreate, user_id: str = Depends(get_current_user)):
    """Create a new watchlist item"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Clean ticker symbol
        ticker = item.ticker.strip().upper()
        
        # Check if item already exists for this user
        existing = supabase.table('watchlist').select('*').eq('user_id', user_id).eq('ticker', ticker).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Ticker already in watchlist")
        
        # Insert new item
        data = {
            'user_id': user_id,
            'ticker': ticker,
            'notes': item.notes if item.notes and item.notes.strip() else None,
            'chart_link': item.chart_link if item.chart_link and item.chart_link.strip() else None
        }
        
        result = supabase.table('watchlist').insert(data).execute()
        
        if result.data:
            return {"message": "Watchlist item created successfully", "item": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create watchlist item")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/watchlist")
async def get_watchlist(user_id: str = Depends(get_current_user)):
    """Get user's watchlist"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        result = supabase.table('watchlist').select('id,ticker,notes,chart_link,created_at').eq('user_id', user_id).order('created_at', desc=True).execute()
        return {"watchlist": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/watchlist/{item_id}")
async def update_watchlist_item(item_id: int, item: WatchlistUpdate, user_id: str = Depends(get_current_user)):
    """Update a watchlist item"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if item exists and belongs to user
        existing = supabase.table('watchlist').select('*').eq('id', item_id).eq('user_id', user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        
        # Prepare update data
        update_data = {}
        if item.ticker is not None:
            update_data['ticker'] = item.ticker.strip().upper()
        if item.notes is not None:
            update_data['notes'] = item.notes if item.notes.strip() else None
        if item.chart_link is not None:
            update_data['chart_link'] = item.chart_link if item.chart_link.strip() else None
        
        # Always set updated_at when updating
        update_data['updated_at'] = datetime.now(UTC).isoformat()
        
        # Update item
        result = supabase.table('watchlist').update(update_data).eq('id', item_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {"message": "Watchlist item updated successfully", "item": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update watchlist item")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/watchlist/{item_id}")
async def delete_watchlist_item(item_id: int, user_id: str = Depends(get_current_user)):
    """Delete a watchlist item"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if item exists and belongs to user
        existing = supabase.table('watchlist').select('*').eq('id', item_id).eq('user_id', user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        
        # Delete item
        result = supabase.table('watchlist').delete().eq('id', item_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {"message": "Watchlist item deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete watchlist item")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# Journal API endpoints
@app.post("/api/journal")
async def create_journal_entry(entry: JournalCreate, user_id: str = Depends(get_current_user)):
    """Create a new journal entry"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Insert new entry
        data = {
            'user_id': user_id,
            'title': entry.title.strip(),
            'content': entry.content.strip(),
            'tags': entry.tags.strip() if entry.tags and entry.tags.strip() else None,
            'position_x': entry.position_x,
            'position_y': entry.position_y,
            'width': entry.width,
            'height': entry.height
        }
        
        result = supabase.table('journal').insert(data).execute()
        
        if result.data:
            return {"message": "Journal entry created successfully", "entry": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create journal entry")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/journal")
async def get_journal_entries(user_id: str = Depends(get_current_user)):
    """Get user's journal entries"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        result = supabase.table('journal').select('id,title,content,tags,created_at,updated_at,position_x,position_y,width,height').eq('user_id', user_id).order('updated_at', desc=True).order('created_at', desc=True).execute()
        return {"entries": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/journal/{entry_id}")
async def update_journal_entry(entry_id: int, entry: JournalUpdate, user_id: str = Depends(get_current_user)):
    """Update a journal entry"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if entry exists and belongs to user
        existing = supabase.table('journal').select('*').eq('id', entry_id).eq('user_id', user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Prepare update data
        update_data = {}
        if entry.title is not None:
            update_data['title'] = entry.title.strip()
        if entry.content is not None:
            update_data['content'] = entry.content.strip()
        if entry.tags is not None:
            update_data['tags'] = entry.tags.strip() if entry.tags.strip() else None
        
        # Always set updated_at when updating
        update_data['updated_at'] = datetime.now(UTC).isoformat()
        
        # Update entry
        result = supabase.table('journal').update(update_data).eq('id', entry_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {"message": "Journal entry updated successfully", "entry": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update journal entry")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/journal/{entry_id}")
async def delete_journal_entry(entry_id: int, user_id: str = Depends(get_current_user)):
    """Delete a journal entry"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if entry exists and belongs to user
        existing = supabase.table('journal').select('*').eq('id', entry_id).eq('user_id', user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Delete entry
        result = supabase.table('journal').delete().eq('id', entry_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {"message": "Journal entry deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete journal entry")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/journal/{entry_id}/position")
async def update_journal_position(entry_id: int, position: JournalPositionUpdate, user_id: str = Depends(get_current_user)):
    """Update journal entry position"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if entry exists and belongs to user
        existing = supabase.table('journal').select('*').eq('id', entry_id).eq('user_id', user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Update position
        result = supabase.table('journal').update({
            'position_x': position.position_x,
            'position_y': position.position_y
        }).eq('id', entry_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {"message": "Position updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update position")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/journal/{entry_id}/size")
async def update_journal_size(entry_id: int, size: JournalSizeUpdate, user_id: str = Depends(get_current_user)):
    """Update journal entry size"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if entry exists and belongs to user
        existing = supabase.table('journal').select('*').eq('id', entry_id).eq('user_id', user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        # Update size
        result = supabase.table('journal').update({
            'width': size.width,
            'height': size.height
        }).eq('id', entry_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {"message": "Size updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update size")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)