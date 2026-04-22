'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { Loader2, AlertCircle, Info } from 'lucide-react';

interface ChartContainerProps {
  symbol: string;
}

export default function ChartContainer({ symbol }: ChartContainerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSmaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chartHeightPercent, setChartHeightPercent] = useState(70);
  const isDragging = useRef(false);

  const startResize = () => {
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const container = chartContainerRef.current?.parentElement?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      let newPercent = (relativeY / rect.height) * 100;
      newPercent = Math.max(30, Math.min(newPercent, 80));
      setChartHeightPercent(newPercent);
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);



  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current) return;

    // --- Main Price Chart ---
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#05070A' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        visible: false, // Hidden, RSI chart will handle time scale
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    // Main Candlestick Series
    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // set as an overlay
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // --- RSI Indicator Chart ---
    const rsiChart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#05070A' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: rsiContainerRef.current.clientWidth,
      height: rsiContainerRef.current.clientHeight,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
    });

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#6366f1',
      lineWidth: 2,
    });

    const rsiSmaSeries = rsiChart.addSeries(LineSeries, {
      color: '#fbbf24',
      lineWidth: 2,
      lineStyle: 0,
    });

    // Add 30/70 Overbought/Oversold lines
    rsiChart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.2)', lineWidth: 1, lineStyle: 2 }).setData([
      { time: 0 as any, value: 30 }, { time: 9999999999 as any, value: 30 }
    ]);
    rsiChart.addSeries(LineSeries, { color: 'rgba(255, 255, 255, 0.2)', lineWidth: 1, lineStyle: 2 }).setData([
      { time: 0 as any, value: 70 }, { time: 9999999999 as any, value: 70 }
    ]);

    // Sync logic removed to ensure stability, RSI Chart will follow Main Chart interaction via crosshair
    // Use a unified time scale logic if required in future releases.
    // chart.timeScale().subscribeVisibleTimeRangeChange(...)

    chartRef.current = chart;
    rsiChartRef.current = rsiChart;
    candleSeriesRef.current = mainSeries;
    volumeSeriesRef.current = volumeSeries;
    rsiSeriesRef.current = rsiSeries;
    rsiSmaSeriesRef.current = rsiSmaSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === chartContainerRef.current) {
          chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
        } else if (entry.target === rsiContainerRef.current) {
          rsiChart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      }
    });

    resizeObserver.observe(chartContainerRef.current);
    resizeObserver.observe(rsiContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      rsiChart.remove();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (typeof window === 'undefined') return;
      
      setLoading(true);
      setError(null);

      try {
        console.log(`[CHART] Fetching data for ${symbol}...`);
        const response = await fetch('/api/candles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        if (candleSeriesRef.current && data.candles) {
          console.log(`[CHART] Setting ${data.candles.length} candle points for ${symbol}`);
          if (data.candles.length > 0) {
            console.table(data.candles.slice(-5)); // Log last 5 points
          }
          candleSeriesRef.current.setData(data.candles);
        }
        
        if (volumeSeriesRef.current && data.candles) {
          volumeSeriesRef.current.setData(data.candles);
        }
        
        if (rsiSeriesRef.current && data.rsiData) {
          console.log(`[CHART] Setting ${data.rsiData.length} RSI points`);
          rsiSeriesRef.current.setData(data.rsiData);
        }

        if (rsiSmaSeriesRef.current && data.rsiSmaData) {
          rsiSmaSeriesRef.current.setData(data.rsiSmaData);
        }
        
        if (chartRef.current && data.candles.length > 0) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (err: any) {
        console.error('[CHART] Error:', err);
        setError(err.message || 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      // Clear data before fetching new symbol
      if (candleSeriesRef.current) candleSeriesRef.current.setData([]);
      if (rsiSeriesRef.current) rsiSeriesRef.current.setData([]);
      fetchData();
    }
  }, [symbol]);

  return (
    <div className="flex flex-col gap-1 h-[600px] bg-[#05070A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl group">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">{symbol || 'SELECT SYMBOL'}</span>
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Weekly Data Engine</span>
          {loading && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
        </div>
        <div className="text-[10px] font-bold text-slate-600 tracking-widest flex items-center gap-2">
          {error ? 'SERVICE ERROR' : 'REAL-TIME CLOUD SYNCED'}
          <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-rose-500' : 'bg-emerald-500'}`} />
        </div>
      </div>

      <div className="flex-1 relative bg-[#05070A]">
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05070A] z-20 text-center p-8">
            <AlertCircle className="w-12 h-12 text-rose-500/40 mb-6" />
            <h3 className="text-white font-bold mb-3 uppercase text-xs tracking-[0.2em]">
              Data Fetch Error
            </h3>
            <p className="text-slate-500 text-xs max-w-xs mb-8 leading-relaxed italic">
              {error}
            </p>
          </div>
        )}

        <div className="h-full flex flex-col relative">
          <div style={{ height: `${chartHeightPercent}%` }} ref={chartContainerRef} className="w-full relative z-0" />
          
          <div 
            onMouseDown={startResize}
            className="h-1 bg-white/10 hover:bg-indigo-500 cursor-row-resize flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(99,102,241,0.5)] z-20 relative"
          >
            <div className="w-12 h-0.5 bg-white/30 rounded-full" />
          </div>

          <div style={{ height: `${100 - chartHeightPercent}%` }} className="flex flex-col relative z-0">
            <div className="px-6 py-1 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-black text-slate-400 flex gap-4 uppercase tracking-widest">
                <span className="text-indigo-400 border-b border-indigo-400">RSI (14)</span>
                <span className="text-amber-400 border-b border-amber-400">SMA (14)</span>
              </span>
              <div className="flex gap-4 text-[9px] font-bold">
                <span className="text-red-500/60 uppercase">Overbought (70)</span>
                <span className="text-emerald-500/60 uppercase">Oversold (30)</span>
              </div>
            </div>
            <div ref={rsiContainerRef} className="flex-1 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
