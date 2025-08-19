# Trading Analytics Features

Fintra now includes comprehensive trading analytics to help you track and analyze your trading performance.

## Features

### 📊 Trading Analytics Dashboard
- **Success Rate**: Track your win/loss ratio
- **Total P&L**: Monitor your overall profit and loss
- **Average P&L**: See your average performance per trade
- **Best/Worst Trades**: Identify your most and least successful trades
- **Performance by Ticker**: Analyze how you perform with different stocks
- **Monthly Performance**: Track your progress over time

### 📈 Trade Management
- **Manual Entry**: Add trades one by one with detailed information
- **Image Upload**: Upload screenshots of your trading statements and automatically extract trade data
- **Trade History**: View all your trades in a comprehensive table
- **Edit/Delete**: Modify or remove trades as needed

### 🔍 Advanced Analytics
- **Win/Loss Breakdown**: Visual representation of your trading success
- **Ticker Performance**: See which stocks you trade best
- **Monthly Trends**: Track your performance month by month
- **Percent Difference Analysis**: Monitor your percentage gains/losses

## How to Use

### 1. Set Up the Database
First, you need to create the trades table in your Supabase database. Run the SQL script in `backend/setup_trades_table.sql` in your Supabase SQL Editor.

### 2. Add Trades
You can add trades in two ways:

#### Manual Entry
1. Click "Add Trade" in the Trade History tab
2. Fill in the required fields:
   - Date
   - Ticker symbol
   - Trade type (buy/sell)
   - Number of shares
   - Price per share
3. Optionally add:
   - Realized P&L
   - Percent difference
   - Notes

#### Image Upload
1. Click "Add Trade" and select "Upload Image"
2. Upload a screenshot of your trading statement or P&L
3. The AI will automatically extract trade data
4. Review and confirm the extracted trades

### 3. View Analytics
Switch to the "Analytics" tab to see:
- Overview cards with key metrics
- Win/loss breakdown
- Best and worst trades
- Performance by ticker
- Monthly performance trends

## Data Fields

### Required Fields
- **Date**: When the trade occurred
- **Ticker**: Stock symbol (e.g., AAPL, MSFT)
- **Trade Type**: Buy or Sell
- **Shares**: Number of shares traded
- **Price**: Price per share

### Optional Fields
- **Realized P&L**: Actual profit or loss from the trade
- **Percent Difference**: Percentage gain or loss
- **Notes**: Additional information (e.g., "day trade", "swing trade")

## Analytics Calculations

### Success Rate
```
Success Rate = (Winning Trades / Total Trades) × 100
```

### Average P&L
```
Average P&L = Total P&L / Total Trades
```

### Performance Metrics
- **Total Trades**: Number of all trades
- **Winning Trades**: Trades with positive P&L
- **Losing Trades**: Trades with negative P&L
- **Total P&L**: Sum of all realized P&L values

## Tips for Day Traders and Swing Traders

### Day Traders
- Track your daily success rate
- Monitor your average P&L per trade
- Identify which stocks you trade best
- Use notes to mark different strategies

### Swing Traders
- Focus on percent difference metrics
- Track monthly performance trends
- Monitor longer-term position performance
- Use notes to document your thesis

### General Tips
- Be consistent with your data entry
- Include realized P&L for accurate analytics
- Use notes to track your trading strategy
- Regularly review your analytics to improve

## API Endpoints

### Trade Management
- `GET /api/trades` - Get all trades for the user
- `POST /api/trades` - Create a new trade
- `PUT /api/trades/{id}` - Update a trade
- `DELETE /api/trades/{id}` - Delete a trade

### Analytics
- `GET /api/trades/analytics` - Get comprehensive trading analytics
- `POST /api/trades/parse-image` - Parse trade data from image

## Security

All trade data is:
- **User-specific**: You can only see your own trades
- **Securely stored**: Data is protected with Row Level Security
- **Authenticated**: Requires valid login to access

## Getting Started

1. Sign in to your Fintra account
2. Navigate to the Trading Analytics section
3. Set up the database table (if not already done)
4. Start adding your trades
5. Explore the analytics dashboard

The trading analytics will help you identify patterns, improve your strategy, and track your progress over time.
