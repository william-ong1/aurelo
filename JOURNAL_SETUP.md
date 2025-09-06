# Journal Setup Guide

This guide explains how to set up the journal/notes functionality for Fintra.

## Database Setup

### 1. Create Journal Table

Run the SQL script in your Supabase SQL Editor:

```sql
-- Run this in your Supabase SQL Editor
-- File: backend/setup_journal_table.sql

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
```

### 2. Backend API Endpoints

The following API endpoints are now available:

- `POST /api/journal` - Create a new journal entry
- `GET /api/journal` - Get user's journal entries
- `PUT /api/journal/{entry_id}` - Update a journal entry
- `DELETE /api/journal/{entry_id}` - Delete a journal entry

### 3. Frontend Components

The following components have been created:

- `JournalSection.tsx` - Main journal display component
- `JournalModal.tsx` - Modal for adding/editing entries
- `journal/page.tsx` - Journal page route

### 4. Navigation

The journal has been added to both:
- Desktop sidebar navigation
- Mobile bottom navigation

## Features

### Journal Entry Structure
- **Title**: Required, max 100 characters
- **Content**: Required, max 2000 characters  
- **Tags**: Optional, comma-separated
- **Timestamps**: Automatic creation and update tracking

### Functionality
- Create, read, update, and delete journal entries
- Sort by title or last modified date
- Tag-based organization
- Responsive design matching watchlist styling
- Authentication required for all operations

### Styling
- Consistent with existing watchlist design
- Responsive table layout
- Tag display with blue pill styling
- Content truncation for long entries
- Loading states and error handling

## Usage

1. Navigate to `/journal` in the application
2. Click the `+` button to add a new entry
3. Fill in title, content, and optional tags
4. Use tags to organize entries (e.g., "technical-analysis", "aapl", "support-resistance")
5. Edit or delete entries using the action buttons

## Security

- Row Level Security (RLS) enabled
- Users can only access their own journal entries
- JWT token authentication required for all operations
- Input validation and sanitization on both frontend and backend
