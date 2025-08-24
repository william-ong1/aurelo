-- Create watchlist table for Fintra
-- Run this in your Supabase SQL Editor

-- Drop existing table if it exists (this will delete all data)
DROP TABLE IF EXISTS watchlist CASCADE;

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    notes TEXT,
    chart_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own watchlist items
CREATE POLICY "Users can only access their own watchlist items" ON watchlist
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_ticker ON watchlist(ticker);
CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON watchlist(created_at);

-- Grant necessary permissions
GRANT ALL ON watchlist TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE watchlist_id_seq TO authenticated;
