from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)