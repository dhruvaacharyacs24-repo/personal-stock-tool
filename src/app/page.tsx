'use client';

import { useState, useEffect } from 'react';
import Watchlist from '@/components/Watchlist';
import ChartContainer from '@/components/ChartContainer';
import ResultDisplay from '@/components/ResultDisplay';
import { StockData } from '@/lib/stock-service';
import { Play, Settings, Shield, History, Info, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE.NS');
  const [bestStock, setBestStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);

  useEffect(() => {
    // Load API Key and Last Result from localStorage
    const savedKey = localStorage.getItem('finnhub_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedResult = localStorage.getItem('last_scan_result');
    if (savedResult) {
      const parsed = JSON.parse(savedResult);
      setBestStock(parsed.stock);
      setLastScanDate(parsed.date);
      if (parsed.stock) setActiveSymbol(parsed.stock.symbol);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('finnhub_api_key', key);
    setShowSettings(false);
  };

  const handleScan = async () => {
    if (!apiKey) {
      alert('Please enter your Finnhub API Key in settings first.');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: watchlist, apiKey }),
      });

      const data = await response.json();
      if (data.bestStock) {
        setBestStock(data.bestStock);
        setActiveSymbol(data.bestStock.symbol);
        const scanData = { stock: data.bestStock, date: new Date().toLocaleString() };
        setLastScanDate(scanData.date);
        localStorage.setItem('last_scan_result', JSON.stringify(scanData));
      } else {
        alert('No stocks matched the strategy criteria (RSI 20-40, Price > SMA 50).');
        setBestStock(null);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      alert('An error occurred during scanning. Check your API key and connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 selection:bg-indigo-500/30">
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_50%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#05070A]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
              GRAVITY<span className="text-indigo-500 not-italic">SCAN</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {lastScanDate && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <History className="w-3 h-3" />
                LAST SCAN: {lastScanDate}
              </div>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleScan}
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white rounded-full font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all ${loading ? 'animate-pulse' : ''}`}
            >
              <Play className={`w-4 h-4 ${loading ? 'opacity-0' : ''}`} />
              {loading ? 'SCANNING...' : 'RUN SCAN'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 right-6 z-50 w-80 p-6 bg-[#0F1219] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl"
            >
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                API CONFIGURATION
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Finnhub API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your key..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 leading-relaxed">
                    <Info className="w-3 h-3" />
                    Stored locally in your browser.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveApiKey(apiKey)}
                    className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
                  >
                    SAVE KEY
                  </button>
                  <button
                    onClick={async () => {
                      if (!apiKey) return alert('Enter key first');
                      try {
                        const res = await fetch('/api/scan', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ symbols: ['AAPL'], apiKey }),
                        });
                        const d = await res.json();
                        if (d.error) alert(`FAIL: ${d.error}`);
                        else alert('SUCCESS: API Connection Verified!');
                      } catch (e) { alert('ERROR: Could not reach API'); }
                    }}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-400 rounded-lg font-bold text-[10px] transition-all uppercase tracking-widest"
                  >
                    TEST Key
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watchlist Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <Watchlist onSelect={setActiveSymbol} activeSymbol={activeSymbol} />
          
          {/* Legend / Strategy Info */}
          <div className="p-5 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl backdrop-blur-md shadow-xl transition-all hover:border-indigo-500/30">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Strategy Pulse
            </h4>
            <ul className="space-y-3 text-[11px] text-slate-300 font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-indigo-500" />
                RSI (Weekly) : 20 - 40
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                Above SMA 50 (Weekly)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                Minimum Volume 100K+ Shares
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Dashboard Content */}
        <section className="lg:col-span-9 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3">
              <ResultDisplay data={bestStock} loading={loading} />
            </div>
            
            <div className="xl:col-span-2 flex flex-col justify-end">
              <div className="p-7 bg-gradient-to-br from-indigo-500/10 to-[#0A0D14]/90 border border-indigo-500/30 rounded-3xl h-full flex flex-col justify-center shadow-[0_0_40px_-15px_rgba(99,102,241,0.2)] backdrop-blur-xl transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent italic tracking-tight">AI SCANNER<span className="not-italic opacity-50 font-medium ml-1 text-sm">v1.3</span></h3>
                </div>
                <p className="text-xs text-indigo-100/60 leading-relaxed mb-8 font-medium">
                  Select a stock from your watchlist to view its technical chart, or run a scan to find the most oversold candidate with positive structural trend.
                </p>
                <div className="flex flex-col gap-1 text-[10px] font-black tracking-widest uppercase mt-auto">
                  <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg self-start shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                    <span>SYSTEM ONLINE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[600px]">
            <ChartContainer symbol={activeSymbol} />
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/5 py-8 mt-12 bg-black/20">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
            © 2026 GRAVITYSCAN PERSONAL ANALYTICS
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">API Status</a>
            <div className="px-2 py-0.5 border border-indigo-500/30 text-indigo-400 rounded text-[9px]">
              V1.4.2 BUILD
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Finished Main Page
