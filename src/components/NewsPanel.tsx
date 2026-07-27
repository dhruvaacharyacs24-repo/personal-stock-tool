'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Newspaper, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, RefreshCw, Globe } from 'lucide-react';

interface NewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  date: string;
  thumbnail: string | null;
  relatedTickers: string[];
}

interface SentimentData {
  overall: string;
  reasoning: string[];
  risks: string[];
}

interface NewsPanelProps {
  symbol: string;
  onClose?: () => void;
}

export default function NewsPanel({ symbol, onClose }: NewsPanelProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setNews(data.news || []);
      setSentiment(data.sentiment || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchNews();
    }
  }, [symbol]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const SentimentIcon = ({ overall }: { overall: string }) => {
    const color = overall === 'Bullish' ? 'text-emerald-400' : overall === 'Bearish' ? 'text-rose-400' : 'text-slate-400';
    const Icon = overall === 'Bullish' ? TrendingUp : overall === 'Bearish' ? TrendingDown : Minus;
    return <Icon className={`w-6 h-6 ${color}`} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-white/10 bg-[#0D1118]/90 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Newspaper className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">AI News Analyzer</p>
            <h4 className="text-sm font-semibold text-white">{symbol.replace('.NS', '')}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <button
              onClick={fetchNews}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              title="Refresh news"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          {loading && (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          )}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          <div className="text-[10px] uppercase tracking-[0.25em] text-rose-400 mb-1">Error</div>
          {error}
        </div>
      )}

      {loading && !news.length && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-[11px] text-slate-500 font-mono tracking-widest uppercase">Fetching latest news...</p>
          </div>
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <Globe className="w-10 h-10 text-slate-600 mb-4" />
          <p className="text-sm text-slate-400 mb-1">No news articles found</p>
          <p className="text-[11px] text-slate-600">Try clicking refresh or selecting a different stock</p>
        </div>
      )}

      {news.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* News List - 2/3 width */}
          <div className="lg:col-span-2 divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {news.map((article, idx) => (
              <motion.a
                key={article.uuid}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
              >
                {article.thumbnail && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/80">
                      {article.publisher}
                    </span>
                    <span className="text-[9px] text-slate-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(article.date)}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-200 leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                    {article.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-indigo-400 flex items-center gap-1 font-medium">
                      Read full article <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Sentiment Panel - 1/3 width */}
          {sentiment && (
            <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-white/5 p-5 bg-black/20">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Sentiment Analysis</p>
                  <div className="flex items-center gap-3 mb-2">
                    <SentimentIcon overall={sentiment.overall} />
                    <span className={`text-lg font-black tracking-tight ${
                      sentiment.overall === 'Bullish' ? 'text-emerald-400' :
                      sentiment.overall === 'Bearish' ? 'text-rose-400' :
                      'text-slate-300'
                    }`}>
                      {sentiment.overall}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-400/80 mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" />
                      Bullish Signals
                    </p>
                    <ul className="space-y-1.5">
                      {sentiment.reasoning.map((reason, i) => (
                        <li key={i} className="text-[11px] text-slate-300 leading-relaxed flex gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.25em] text-rose-400/80 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      Risk Factors
                    </p>
                    <ul className="space-y-1.5">
                      {sentiment.risks.map((risk, i) => (
                        <li key={i} className="text-[11px] text-slate-300 leading-relaxed flex gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-slate-600">
                    Powered by Groq AI · Yahoo Finance News
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </motion.div>
  );
}

