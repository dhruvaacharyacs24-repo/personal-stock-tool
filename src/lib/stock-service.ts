/**
 * Stock Service to handle price fetching and indicator calculation.
 * Uses Yahoo Finance for reliable historical data (NSE/BSE included).
 */
import yf from 'yahoo-finance2';
const yahooFinance = new (yf as any)();

export interface StockData {
  symbol: string;
  rsi: number;
  sma50: number;
  price: number;
  volume: number;
  isAboveSMA: boolean;
  rsiStatus: string;
}

export interface FundamentalSnapshot {
  symbol: string;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  salesGrowth: number | null;
  profitGrowth: number | null;
  promoterHolding: number | null;
  fiiDiiHolding: number | null;
  rating: number | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  earnings: {
    latestQuarterLabel: string | null;
    latestQuarterRevenue: number | null;
    latestQuarterProfit: number | null;
    latestQuarterMargin: number | null;
    previousQuarterRevenue: number | null;
    previousQuarterProfit: number | null;
    previousQuarterMargin: number | null;
    revenueGrowthQoQ: number | null;
    profitGrowthQoQ: number | null;
    marginDelta: number | null;
    surprisePct: number | null;
  };
}

export const calculateRSI = (prices: number[], period = 14): number => {
  if (prices.length <= period) return 0;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let gain = 0;
    let loss = 0;
    if (change >= 0) gain = change;
    else loss = -change;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

export const calculateSMA = (prices: number[], period = 50): number => {
  if (prices.length < period) return 0;
  const lastX = prices.slice(-period);
  return lastX.reduce((a, b) => a + b, 0) / period;
};

export async function fetchFundamentalSnapshot(symbol: string): Promise<FundamentalSnapshot | null> {
  try {
    const result = await (yahooFinance as any).quoteSummary(symbol.toUpperCase(), {
      modules: ['summaryProfile', 'defaultKeyStatistics', 'financialData', 'earnings', 'price'],
    });

    const summaryProfile = result?.summaryProfile || {};
    const stats = result?.defaultKeyStatistics || {};
    const financialData = result?.financialData || {};
    const earningsData = result?.earnings || {};
    const priceData = result?.price || {};
    const majorHolders = result?.majorHoldersBreakdown || {};

    const currentPrice = priceData?.regularMarketPrice ?? financialData?.currentPrice ?? null;
    const trailingEps = stats?.trailingEps ?? stats?.forwardEps ?? null;
    const pe = currentPrice && trailingEps ? Number((currentPrice / trailingEps).toFixed(2)) : (stats?.forwardPE != null ? Number(stats.forwardPE.toFixed(2)) : null);
    const pb = stats?.priceToBook != null ? Number(stats.priceToBook.toFixed(2)) : null;
    const eps = trailingEps != null ? Number(trailingEps.toFixed(2)) : (stats?.forwardEps != null ? Number(stats.forwardEps.toFixed(2)) : null);

    const bookValue = stats?.bookValue ?? null;
    const netIncomeToCommon = stats?.netIncomeToCommon ?? null;
    const sharesOutstanding = stats?.sharesOutstanding ?? null;
    const roe = bookValue && netIncomeToCommon && sharesOutstanding
      ? Number(((netIncomeToCommon / (bookValue * sharesOutstanding)) * 100).toFixed(2))
      : (financialData?.returnOnEquity != null ? Number(financialData.returnOnEquity.toFixed(2)) : null);

    const operatingMargin = financialData?.operatingMargins != null ? Number((financialData.operatingMargins * 100).toFixed(2)) : null;
    const netMargin = financialData?.profitMargins != null ? Number((financialData.profitMargins * 100).toFixed(2)) : null;
    const salesGrowth = financialData?.revenueGrowth != null ? Number((financialData.revenueGrowth * 100).toFixed(2)) : null;
    const profitGrowth = financialData?.earningsGrowth != null ? Number((financialData.earningsGrowth * 100).toFixed(2)) : null;
    const debtToEquity = financialData?.debtToEquity != null ? Number(financialData.debtToEquity.toFixed(2)) : null;

    const quarterly = earningsData?.earningsChart?.quarterly || [];
    const latestQuarter = quarterly[0] || null;
    const previousQuarter = quarterly[1] || null;

    const latestRevenue = latestQuarter?.revenue ?? null;
    const previousRevenue = previousQuarter?.revenue ?? null;
    const latestProfit = latestQuarter?.earnings ?? null;
    const previousProfit = previousQuarter?.earnings ?? null;
    const latestMargin = latestQuarter?.profitMargin != null ? Number((latestQuarter.profitMargin * 100).toFixed(2)) : null;
    const previousMargin = previousQuarter?.profitMargin != null ? Number((previousQuarter.profitMargin * 100).toFixed(2)) : null;
    const revenueGrowthQoQ = latestRevenue && previousRevenue ? Number((((latestRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2)) : null;
    const profitGrowthQoQ = latestProfit && previousProfit ? Number((((latestProfit - previousProfit) / previousProfit) * 100).toFixed(2)) : null;
    const marginDelta = latestMargin != null && previousMargin != null ? Number((latestMargin - previousMargin).toFixed(2)) : null;
    const surprisePct = latestQuarter?.surprisePct != null ? Number(latestQuarter.surprisePct.toFixed(2)) : null;
    const promoterHolding = majorHolders?.insidersPercentHeld != null ? Number((majorHolders.insidersPercentHeld * 100).toFixed(2)) : null;
    const fiiDiiHolding = majorHolders?.institutionsPercentHeld != null ? Number((majorHolders.institutionsPercentHeld * 100).toFixed(2)) : null;

    let rating = 0;
    if (pe != null && pe < 30) rating += 1;
    if (pb != null && pb < 3) rating += 1;
    if (roe != null && roe > 10) rating += 1;
    if (operatingMargin != null && operatingMargin > 10) rating += 1;
    if (netMargin != null && netMargin > 8) rating += 1;
    if (debtToEquity != null && debtToEquity < 1) rating += 1;
    if (salesGrowth != null && salesGrowth > 0) rating += 1;
    if (profitGrowth != null && profitGrowth > 0) rating += 1;
    if (promoterHolding != null && promoterHolding > 35) rating += 1;
    if (fiiDiiHolding != null && fiiDiiHolding > 20) rating += 1;
    if (latestMargin != null && latestMargin > 6) rating += 1;
    const normalizedRating = Math.min(10, Number(((rating / 11) * 10).toFixed(1)));

    return {
      symbol: symbol.toUpperCase(),
      pe,
      pb,
      eps,
      roe,
      roce: null,
      debtToEquity,
      operatingMargin,
      netMargin,
      salesGrowth,
      profitGrowth,
      promoterHolding,
      fiiDiiHolding,
      rating: normalizedRating,
      sector: summaryProfile?.sector || null,
      industry: summaryProfile?.industry || null,
      currency: priceData?.currency || null,
      earnings: {
        latestQuarterLabel: latestQuarter?.date || null,
        latestQuarterRevenue: latestRevenue,
        latestQuarterProfit: latestProfit,
        latestQuarterMargin: latestMargin,
        previousQuarterRevenue: previousRevenue,
        previousQuarterProfit: previousProfit,
        previousQuarterMargin: previousMargin,
        revenueGrowthQoQ,
        profitGrowthQoQ,
        marginDelta,
        surprisePct,
      },
    };
  } catch (error) {
    console.error(`Error fetching fundamentals for ${symbol}:`, error);
    return null;
  }
}

export async function fetchCandles(symbol: string) {
  try {
    const period1 = Math.floor(Date.now() / 1000) - (15 * 365 * 24 * 60 * 60); // 15 years back for accurate RSI
    
    console.log(`[YAHOO] Fetching chart for ${symbol}...`);
    const result = await (yahooFinance as any).chart(symbol.toUpperCase(), {
      period1,
      interval: '1wk',
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      return { s: 'no_data', msg: 'No data found on Yahoo Finance' };
    }

    // Format to match the expected candle structure
    const candles = {
      s: 'ok',
      t: [] as number[],
      o: [] as number[],
      h: [] as number[],
      l: [] as number[],
      c: [] as number[],
      v: [] as number[],
    };

    let lastTime = 0;
    result.quotes.forEach((quote: any) => {
      // Filter out invalid/null quotes and strictly increasing timestamps to avoid lightweight-charts errors
      if (quote && quote.close !== null && quote.date) {
        const time = Math.floor(new Date(quote.date).getTime() / 1000);
        if (time > lastTime) {
          candles.t.push(time);
          candles.o.push(quote.open ?? quote.close ?? 0);
          candles.h.push(quote.high ?? quote.close ?? 0);
          candles.l.push(quote.low ?? quote.close ?? 0);
          candles.c.push(quote.close ?? 0);
          candles.v.push(quote.volume ?? 0);
          lastTime = time;
        }
      }
    });

    return candles;
  } catch (error: any) {
    console.error(`[YAHOO] Error fetching ${symbol}:`, error.message);
    return { s: 'error', msg: error.message };
  }
}

/**
 * Enhanced RSI calculation that returns an array of RSI values matching the input prices
 */
export const calculateRSIHistory = (prices: number[], period = 14): { time: number, value: number }[] => {
  if (prices.length <= period) return [];

  const results: { time: number, value: number }[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  results.push({ time: period, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let gain = 0;
    let loss = 0;
    if (change >= 0) gain = change;
    else loss = -change;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    results.push({ time: i, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });
  }

  return results;
};

export const calculateSMAData = (data: { time: number, value: number }[], period = 14): { time: number, value: number }[] => {
  if (data.length < period) return [];
  const results: { time: number, value: number }[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].value;
    }
    results.push({ time: data[i].time, value: Number((sum / period).toFixed(2)) });
  }
  return results;
};

export async function fetchStockReport(symbol: string): Promise<StockData | null> {
  try {
    const data = await fetchCandles(symbol) as any;

    if (data.s !== 'ok' || !data.c || data.c.length < 50) {
      console.error(`Incomplete data for ${symbol}:`, data);
      return null;
    }

    const prices = data.c; // Closing prices
    const volumes = data.v; // Volumes

    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    const rsi = calculateRSI(prices, 14);
    const sma50 = calculateSMA(prices, 50);

    const isAboveSMA = currentPrice > sma50;
    let rsiStatus = 'Neutral';
    if (rsi < 30) rsiStatus = 'Extreme Oversold';
    else if (rsi < 40) rsiStatus = 'Oversold';
    else if (rsi > 70) rsiStatus = 'Overbought';

    return {
      symbol: symbol.toUpperCase(),
      rsi: Number(rsi.toFixed(2)),
      sma50: Number(sma50.toFixed(2)),
      price: Number(currentPrice.toFixed(2)),
      volume: currentVolume,
      isAboveSMA,
      rsiStatus
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}
