This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# RSI Scan Engine

A personal stock analysis tool I built to scan my watchlist and identify the best stock to buy based on weekly RSI.

## Overview

This is a private tool designed for my own use. It analyzes selected stocks using technical indicators and returns a single best candidate based on oversold conditions and basic trend validation.

## Features

* Watchlist-based stock scanning
* Weekly RSI analysis (14-period)
* Returns one best stock (no rankings)
* Integrated charts with visualizations.
* Simple, modern UI

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* TradingView Lightweight Charts
* Yahoo Finance API (`yahoo-finance2`)

## How it Works

1. Fetch weekly RSI, price, volume, and SMA
2. Filter out structurally weak stocks
3. Select the final stock
4. Display result with chart and explanation

## Notes

This is a personal project built for learning and practical use, not a production trading system.


