'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

const toasts: ToastData[] = [];
let listeners: Array<(toasts: ToastData[]) => void> = [];
let counter = 0;

export function showToast(type: ToastType, title: string, message?: string) {
  const id = `toast-${++counter}`;
  toasts.push({ id, type, title, message });
  listeners.forEach((fn) => fn([...toasts]));
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
    listeners.forEach((fn) => fn([...toasts]));
  }, 4000);
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastData[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((fn) => fn !== setItems);
    };
  }, []);

  const remove = (id: string) => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
    listeners.forEach((fn) => fn([...toasts]));
  };

  const iconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };
  const colorMap = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    info: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const Icon = iconMap[item.type];
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto rounded-2xl border p-4 backdrop-blur-xl ${colorMap[item.type]} bg-black/80 shadow-2xl`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.message && (
                    <p className="text-xs mt-1 opacity-80">{item.message}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="p-0.5 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
