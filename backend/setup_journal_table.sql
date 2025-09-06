-- Create journal table for Fintra
-- Run this in your Supabase SQL Editor

-- Drop existing table if it exists (this will delete all data)
DROP TABLE IF EXISTS journal CASCADE;

-- Create journal table
CREATE TABLE IF NOT EXISTS journal (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own journal entries
CREATE POLICY "Users can only access their own journal entries" ON journal
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_updated_at ON journal(updated_at);

-- Grant necessary permissions
GRANT ALL ON journal TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE journal_id_seq TO authenticated;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_journal_updated_at 
    BEFORE UPDATE ON journal 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
