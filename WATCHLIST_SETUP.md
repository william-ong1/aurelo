# Watchlist Feature Setup

## Overview
The watchlist feature allows users to track stocks and assets they're interested in monitoring. Users can add ticker symbols with optional notes and custom chart links.

## Features
- ✅ Add ticker symbols to watchlist
- ✅ Add optional notes for each ticker
- ✅ Add optional custom chart links
- ✅ Default TradingView chart links if no custom link provided
- ✅ Edit and delete watchlist items
- ✅ Authentication required for all operations
- ✅ Responsive design for mobile and desktop

## Backend Setup

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of backend/setup_watchlist_table.sql
```

This will create:
- `watchlist` table with proper RLS (Row Level Security)
- Indexes for performance
- Proper permissions for authenticated users

### 2. API Endpoints
The following endpoints are now available:

- `POST /api/watchlist` - Create new watchlist item
- `GET /api/watchlist` - Get user's watchlist
- `PUT /api/watchlist/{item_id}` - Update watchlist item
- `DELETE /api/watchlist/{item_id}` - Delete watchlist item

### 3. Backend Dependencies
The backend already includes all necessary dependencies. No additional setup required.

## Frontend Setup

### 1. New Components Created
- `frontend/app/watchlist/page.tsx` - Watchlist page
- `frontend/app/components/WatchlistSection.tsx` - Main watchlist component
- `frontend/app/components/WatchlistModal.tsx` - Add/edit modal

### 2. Navigation Updates
- Added "Watchlist" link to sidebar (desktop)
- Added "Watchlist" link to mobile bottom navigation
- Uses Eye icon for consistency

### 3. Features
- **Authentication Loading**: Shows spinner while checking login status
- **Watchlist Loading**: Shows spinner while retrieving watchlist data
- **Empty State**: Helpful message when watchlist is empty
- **Sign-in Prompt**: Shows when user is not authenticated
- **Form Validation**: Ensures ticker symbol is provided
- **Auto-formatting**: Converts ticker to uppercase and removes spaces
- **Character Limits**: 500 characters for notes
- **Chart Links**: Defaults to TradingView if no custom link provided

## Usage

### Adding Items
1. Navigate to Watchlist page
2. Click the "+" button (or "Add First Item" if empty)
3. Enter ticker symbol (required)
4. Add optional notes
5. Add optional custom chart link
6. Click "Add to Watchlist"

### Editing Items
1. Click the edit (pencil) icon on any watchlist item
2. Modify ticker, notes, or chart link
3. Click "Update Item"

### Deleting Items
1. Click the delete (trash) icon on any watchlist item
2. Confirm deletion

### Viewing Charts
- Click the "Chart" link next to any ticker
- Opens in new tab
- Uses custom link if provided, otherwise defaults to TradingView

## Data Structure

### WatchlistItem
```typescript
interface WatchlistItem {
  id: number;
  ticker: string;
  notes?: string;
  chart_link?: string;
  created_at: string;
}
```

### Database Schema
```sql
CREATE TABLE watchlist (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    notes TEXT,
    chart_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security
- All endpoints require authentication
- Row Level Security (RLS) ensures users can only access their own data
- Input validation and sanitization
- SQL injection protection via Supabase

## Testing
1. Start the backend server
2. Run the SQL setup script in Supabase
3. Navigate to the watchlist page
4. Try adding, editing, and deleting items
5. Test with and without authentication
6. Test on mobile and desktop

## Notes
- Ticker symbols are automatically converted to uppercase
- Duplicate tickers are prevented per user
- Chart links open in new tabs for better UX
- All operations show loading states for better UX
