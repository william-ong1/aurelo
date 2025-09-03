# Supabase Setup Guide for Fintra

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for the project to be created (2-3 minutes)

## 2. Get Your Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 3. Set Environment Variables

Create a `.env` file in the `backend/` directory with:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
GEMINI_API_KEY=your_gemini_api_key
```

## 4. Create Database Table

In your Supabase dashboard, go to SQL Editor and run:

```sql
-- Create portfolio_assets table
CREATE TABLE portfolio_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_stock BOOLEAN NOT NULL,
    ticker TEXT,
    shares DECIMAL,
    current_price DECIMAL,
    purchase_price DECIMAL,
    balance DECIMAL,
    apy DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    ticker TEXT NOT NULL,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    shares DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    realized_pnl DECIMAL,
    percent_diff DECIMAL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own assets
CREATE POLICY "Users can only access their own portfolio assets" ON portfolio_assets
    FOR ALL USING (auth.uid() = user_id);

-- Create policy to allow users to only see their own trades
CREATE POLICY "Users can only access their own trades" ON trades
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_portfolio_assets_user_id ON portfolio_assets(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_date ON trades(date);
CREATE INDEX idx_trades_ticker ON trades(ticker);
```

## 5. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## 6. Test the Setup

Start your backend server:

```bash
python app.py
```

The server should start without errors. You can test the endpoints:

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/portfolio` - Get user's portfolio (requires auth)
- `POST /api/portfolio/save` - Save user's portfolio (requires auth)
- `GET /api/trades` - Get user's trades (requires auth)
- `POST /api/trades` - Create new trade (requires auth)
- `GET /api/trades/analytics` - Get trading analytics (requires auth)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Portfolio Management
- `GET /api/portfolio` - Get user's portfolio
- `POST /api/portfolio/save` - Save user's portfolio

### Trade Management
- `GET /api/trades` - Get user's trades
- `POST /api/trades` - Create new trade
- `PUT /api/trades/{trade_id}` - Update trade
- `DELETE /api/trades/{trade_id}` - Delete trade
- `GET /api/trades/analytics` - Get trading analytics
- `POST /api/trades/parse-image` - Parse trade image

### Existing Endpoints (still work)
- `GET /api/price` - Get stock price
- `GET /api/prices` - Get multiple stock prices
- `POST /api/parse-image` - Parse portfolio image
- `POST /api/portfolio-value` - Calculate portfolio value

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure token-based authentication
- **Automatic User Isolation**: All portfolio and trade data is automatically scoped to the authenticated user