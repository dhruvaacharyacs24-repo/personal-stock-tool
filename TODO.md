# Fix: Fundamental Analysis Not Loading

## Steps:

### 1. Fix `stock-service.ts` - `fetchFundamentalSnapshot()`
- [x] Add `'majorHoldersBreakdown'` to the requested modules array
- [x] Fix `majorHoldersBreakdown` destructuring for v3.x yahoo-finance2 format
- [x] Add ROCE calculation (EBIT / Equity)
- [x] Changed `roce: null` to use calculated `roce` variable

### 2. Fix `api/fundamentals/route.ts` - Better error responses
- [x] Return error message alongside null snapshot
- [x] Log more detail server-side

### 3. Fix `api/candles/route.ts` - Stale error messages
- [x] Change "Finnhub" references to "Yahoo Finance"

### 4. Fix `page.tsx` - Show real error messages in UI
- [x] Add `fundamentalsError` state
- [x] Add `analysisError` state
- [x] Update `handleLoadFundamentals` to capture and display errors
- [x] Update `handleAnalyze` to capture and display errors from API
- [x] Display error in fundamentals card instead of generic "No data" message
- [x] AI analysis now passes real data (RSI, price, volume) from scanned stocks

### 5. Test
- [x] All edits verified - run `npm run dev` to test

