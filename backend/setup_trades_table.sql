-- Create trades table for Fintra Trading Analytics
-- Run this in your Supabase SQL Editor

-- Drop existing table if it exists (this will delete all data)
DROP TABLE IF EXISTS trades CASCADE;

-- Create trades table with simplified schema
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    ticker TEXT NOT NULL,
    realized_pnl DECIMAL,
    percent_diff DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own trades
CREATE POLICY "Users can only access their own trades" ON trades
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);

-- Grant necessary permissions
GRANT ALL ON trades TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE trades_id_seq TO authenticated;
