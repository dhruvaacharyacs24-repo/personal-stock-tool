'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WatchlistProps {
  onSelect: (symbol: string) => void;
  activeSymbol: string;
}

export default function Watchlist({ onSelect, activeSymbol }: WatchlistProps) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Focus and blurring state to close dropdown
  const [showDropdown, setShowDropdown] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setSymbols(JSON.parse(saved));
    } else {
      // Default list (Nifty 50 giants)
      const defaults = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'ITC.NS'];
      setSymbols(defaults);
      localStorage.setItem('watchlist', JSON.stringify(defaults));
    }
  }, []);

  useEffect(() => {
    const fetchSearch = async () => {
      if (input.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(input)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [input]);

  const addSymbol = (symToAdd: string) => {
    if (!symToAdd) return;
    const cleanSym = symToAdd.toUpperCase().trim();
    if (symbols.includes(cleanSym)) return;
    
    const newSymbols = [...symbols, cleanSym];
    setSymbols(newSymbols);
    localStorage.setItem('watchlist', JSON.stringify(newSymbols));
    setInput('');
    setShowDropdown(false);
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSymbol(input);
  };

  const removeSymbol = (sym: string) => {
    const newSymbols = symbols.filter(s => s !== sym);
    setSymbols(newSymbols);
    localStorage.setItem('watchlist', JSON.stringify(newSymbols));
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1219]/30 rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5">
        <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          YOUR WATCHLIST
        </h2>
        
        <form onSubmit={handleFormSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // delay so clicks register
            placeholder="Search stock ticker..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
          />
          <button type="submit" className="absolute right-2 top-1.5 p-1 text-slate-400 hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          
          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showDropdown && input.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-12 left-0 w-full bg-[#0F1219] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar"
              >
                {isSearching ? (
                  <div className="p-4 text-center text-slate-500 text-xs font-medium">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <ul className="py-1">
                    {searchResults.map((res: any, idx: number) => (
                      <li 
                        key={`${res.symbol}-${idx}`}
                        className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                        onClick={() => addSymbol(res.symbol)}
                      >
                        <div className="flex items-center justify-between pointer-events-none">
                          <span className="font-bold text-white text-sm">{res.symbol}</span>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 pointer-events-none">{res.exchDisp}</span>
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5 pointer-events-none">{res.shortname || res.longname}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-slate-500 text-xs font-medium">No matches found.</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {symbols.map((symbol) => (
            <motion.div
              key={symbol}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
                activeSymbol === symbol 
                  ? 'bg-indigo-500/20 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                  : 'hover:bg-indigo-500/5 hover:border-indigo-500/20 border border-transparent'
              }`}
              onClick={() => onSelect(symbol)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  activeSymbol === symbol ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'
                }`}>
                  {symbol.charAt(0)}
                </div>
                <span className={`font-semibold text-sm ${activeSymbol === symbol ? 'text-white' : 'text-slate-300'}`}>
                  {symbol}
                </span>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymbol(symbol);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
