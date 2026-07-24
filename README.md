# GravityScan: Automated AI Stock Analyzer

GravityScan is a high-performance, real-time technical stock screener and charting dashboard designed to track Indian NSE/BSE markets. The application leverages a sleek dark-mode aesthetic to surface algorithmic buy signals based on deep weekly RSI screening and structural price trends.

## Deployed using Vercel: https://personal-stock-tool.vercel.app/

## ✨ Core Features

* **Nifty 50 Scanner**: Instantly evaluate the Nifty 50 index. The engine evaluates their Weekly Relative Strength Index (RSI), applies liquidity filters (100K+ shares), and surfaces the absolute most oversold, fundamentally sound "Alpha Selection."
* **Advanced Charting Engine**: Integrated with TradingView's Lightweight Charts, displaying up to 15-years of historical candlestick data at a time for highly accurate RSI calculations.
* **Volume Overlays**: Intelligent, color-coded volume histograms dynamically sit natively within the lowest 20% overlay of the main price chart.
* **Dual-Pane Resizable Layout**: Inspect momentum with an independent RSI timeline panel. You can easily click and drag the horizontal splitter to adjust the sizes of your price chart and RSI indicator in real time.
* **Premium Glassmorphic UI**: High-end styling featuring glowing typography, dynamic background blurs, interactive micro-animations via Framer Motion, and distinct neon drop shadows.
* **Completely Free Backend**: Powered by Yahoo Finance, requiring zero API keys to operate.

## 🛠 Tech Stack

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Styling**: TailwindCSS
* **Interactive UI**: Framer Motion, Lucide-React
* **Charting Engine**: `lightweight-charts` by TradingView
* **Data Integration**: `yahoo-finance2` (Real-time data fetching, ticker search, and OHLCV parsing)
* **Architecture**: Serverless API Route Handlers

## 🚀 Setup & Installation

**Prerequisites:** Node.js v18+

1. Clone the repository: 
```bash
git clone https://github.com/dhruvaacharyacs24-repo/personal-stock-tool.git
cd personal-stock-tool
```

2. Install the necessary dependencies:
```bash
npm install
```

3. Spin up the Next.js development server:
```bash
npm run dev
```

4. Navigate to `http://localhost:3000`. Click "RUN SCAN" to immediately see the top Nifty 50 opportunities.

## 📎 License & Ownership

Developed for deep technical evaluations and AI courtroom sandbox scenarios. Designed purely for personal research and not intended for institutional financial advice.
