import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Copy, Check, FileCode, RotateCcw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

/**
 * AI Insight Panel — right-side collapsible panel showing analysis results.
 */
export default function InsightPanel({ isOpen, onClose, entry }) {
  const [copied, setCopied] = useState(false);

  if (!entry) return null;

  const { insight_text, analysis_plan, generated_code, code_type, retry_count, fallback_used } = entry;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed inset-y-0 right-0 w-[380px] max-w-[90vw] glass-panel z-40 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand/20 to-purple-500/10 border border-brand/20 flex items-center justify-center">
                  <Lightbulb size={14} className="text-brand-light" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">AI Insights</h2>
                  <p className="text-[10px] text-zinc-500">Analysis breakdown</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close insight panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
              {/* Status Indicators */}
              <div className="flex items-center gap-2 flex-wrap">
                {retry_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber/10 border border-amber/20 text-amber">
                    <RotateCcw size={10} />
                    {retry_count} retries
                  </span>
                )}
                {fallback_used && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose/10 border border-rose/20 text-rose">
                    <AlertTriangle size={10} />
                    Fallback used
                  </span>
                )}
              </div>

              {/* Insight Text */}
              {insight_text && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand">
                      Analysis
                    </h3>
                    <button
                      onClick={() => handleCopy(insight_text)}
                      className="p-1 rounded hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Copy insight"
                    >
                      {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <div className="glass-card rounded-xl p-4 border-l-2 border-brand/40">
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{insight_text}</p>
                  </div>
                </div>
              )}

              {/* Analysis Plan */}
              {analysis_plan && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    Execution Plan
                  </h3>
                  <div className="bg-zinc-800/20 border border-zinc-800/30 rounded-xl p-4">
                    <p className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{analysis_plan}</p>
                  </div>
                </div>
              )}

              {/* Generated Code */}
              {generated_code && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5">
                      <FileCode size={11} />
                      Generated {code_type || 'Python'}
                    </h3>
                    <button
                      onClick={() => handleCopy(generated_code)}
                      className="p-1 rounded hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Copy code"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-4 overflow-x-auto">
                    <pre className="font-mono text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">
                      {generated_code}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
