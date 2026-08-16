import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, Copy, Check, Code, AlertTriangle, RotateCcw, Lightbulb, Pencil, Loader
} from 'lucide-react';
import DataTable from './DataTable';
import PlotlyChart from './PlotlyChart';
import SkeletonLoader from './ui/SkeletonLoader';
import Tooltip from './ui/Tooltip';
import { triggerHaptic } from '../utils/haptics';
import logoUrl from '../assets/logo.png';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Premium ResultCard with chat-like layout, editable user prompts (ChatGPT style),
 * dynamic response replacement, glassmorphism, and animated entrance.
 */
export default function ResultCard({ entry, index, onViewInsight, onEditSubmit, loading, isLatest }) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [queryCopied, setQueryCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.query || '');
  const [isSpinning, setIsSpinning] = useState(false);
  const textareaRef = useRef(null);

  // Only run initialization (focus, auto-size, cursor-to-end) once when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const {
    query,
    output_type,
    code_type,
    generated_code,
    execution_result,
    insight_text,
    retry_count,
    fallback_used,
    failed_attempts,
    isEditingLoading,
  } = entry;

  const isError = output_type === 'error' || fallback_used;

  const handleCopyCode = () => {
    if (generated_code) {
      navigator.clipboard.writeText(generated_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const renderResult = () => {
    if (!execution_result) return null;
    const { type, data } = execution_result;

    if (type === 'plotly' && data) {
      return <PlotlyChart figure={data} />;
    }

    if (type === 'table' && data) {
      return <DataTable columns={data.columns} rows={data.rows} />;
    }

    if (type === 'scalar') {
      return (
        <div className="glass-card rounded-xl py-6 px-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Result</p>
          <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-gradient select-all">
            {data}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      className="flex flex-col gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* User Query Bubble (ChatGPT Editable Style) */}
      <div className="flex justify-end group">
        {isEditing ? (
          <div className="w-full flex flex-col">
            <div className="w-full rounded-2xl border-2 border-[#7BAAF7] bg-white transition-all duration-150">
              <textarea
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (editText.trim() && !loading) {
                      setIsEditing(false);
                      onEditSubmit?.(index, editText.trim());
                    }
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(query);
                  }
                }}
                ref={textareaRef}
                className="w-full bg-transparent border-none outline-none resize-none px-5 py-4 text-[15px] text-[#1a1a1a] leading-[1.6] placeholder:text-[#a1a1aa]"
                style={{ fontFamily: 'inherit' }}
                rows={1}
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-2 pr-1">
              <Tooltip content="Editing will re-run the query and replace the response" position="top">
                <button
                  type="button"
                  className="p-0.5 text-[#9ca3af] hover:text-[#6b7280] transition-colors cursor-help flex items-center"
                  tabIndex={-1}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M8 7.5V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    <circle cx="8" cy="5.5" r="0.75" fill="currentColor"/>
                  </svg>
                </button>
              </Tooltip>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsEditing(false);
                  setEditText(query);
                }}
                className="text-[13px] font-medium text-[#6b7280] hover:text-[#111827] transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editText.trim() && !loading) {
                    triggerHaptic('medium');
                    setIsEditing(false);
                    onEditSubmit?.(index, editText.trim());
                  }
                }}
                disabled={!editText.trim() || loading}
                className="px-3.5 py-1 rounded-full bg-[#1a1a1a] hover:bg-[#2d2d2d] disabled:bg-[#d4d4d8] text-[13px] font-medium text-white transition-all duration-150 cursor-pointer disabled:cursor-not-allowed select-none"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group/bubble flex flex-col items-end gap-1.5 max-w-[85%]">
            <div className="px-6 py-3.5 rounded-lg bg-[#f4f4f4] text-[15px] font-normal text-[#0d0d0d] select-all leading-relaxed">
              {query}
            </div>

            <div className="opacity-0 group-hover/bubble:opacity-100 flex items-center gap-1 transition-opacity duration-200 mr-2">
              <Tooltip content={entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })} position="top">
                <span className="text-[11px] text-[#4a7295] font-medium mr-1.5 select-none cursor-default">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </Tooltip>

              <Tooltip content="Retry prompt" position="top">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    if (onEditSubmit && !loading) {
                      onEditSubmit(index, query);
                    }
                  }}
                  disabled={loading}
                  className="p-1 rounded-md text-[#8C8275] hover:text-[#1F1F1F] hover:bg-[#EAE5DC] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={12} />
                </button>
              </Tooltip>

              <Tooltip content="Edit prompt" position="top">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setIsEditing(true);
                    setEditText(query);
                  }}
                  className="p-1 rounded-md text-[#8C8275] hover:text-[#1F1F1F] hover:bg-[#EAE5DC] transition-all cursor-pointer"
                >
                  <Pencil size={12} />
                </button>
              </Tooltip>

              <Tooltip content="Copy prompt" position="top">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    navigator.clipboard.writeText(query);
                    setQueryCopied(true);
                    setTimeout(() => setQueryCopied(false), 3000);
                  }}
                  className="p-1 rounded-md text-[#8C8275] hover:text-[#1F1F1F] hover:bg-[#EAE5DC] transition-all cursor-pointer"
                >
                  {queryCopied ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* AI Response Section */}
      <div className="w-full flex flex-col gap-4">
        {isEditingLoading ? (
          <div className="flex items-center gap-2.5 px-2 py-2 mt-2">
            <Loader className="animate-[spin_3s_linear_infinite] text-[#D96A4C]" size={20} strokeWidth={2.5} />
            <span className="text-[#8C8275] text-[15px] font-medium">Working</span>
          </div>
        ) : (
          <>
            {/* Insight Text */}
            {insight_text && (
              <p className="text-[15px] text-[#1F1F1F] leading-relaxed px-1">
                {insight_text}
              </p>
            )}

            {/* Dynamic Result */}
            {renderResult()}

            {/* Code Section */}
            {generated_code && (
              <div className="border border-gray-200 rounded-xl bg-white shadow-sm mb-2">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-gray-400">{code_type === 'sql' ? 'sql' : 'python'}</span>
                  <Tooltip content="Copy code" position="top">
                    <button
                      onClick={handleCopyCode}
                      className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {codeCopied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                  </Tooltip>
                </div>
                <div className="px-4 pb-4">
                  <SyntaxHighlighter
                    language={code_type === 'sql' ? 'sql' : 'python'}
                    style={prism}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      background: 'transparent',
                      fontSize: '15px',
                    }}
                    wrapLongLines={true}
                  >
                    {generated_code}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}

            {/* Failed Attempts */}
            {failed_attempts && failed_attempts.length > 0 && (
              <div className="border-t border-[#E9E2D7]/50 pt-3">
                <button
                  onClick={() => setErrorsOpen(!errorsOpen)}
                  className="inline-flex items-center gap-2 text-[11px] font-medium text-rose hover:text-rose-dark transition-colors py-1"
                >
                  <ChevronRight
                    size={12}
                    className={`transform transition-transform duration-200 ${errorsOpen ? 'rotate-90' : ''}`}
                  />
                  <AlertTriangle size={12} />
                  <span>{errorsOpen ? 'Hide' : 'Show'} error trace ({failed_attempts.length})</span>
                </button>

                {errorsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2 flex flex-col gap-3"
                  >
                    {failed_attempts.map((attempt, i) => (
                      <div
                        key={i}
                        className="border border-[#E9E2D7] bg-[#FAF8F5] rounded-xl p-4 flex flex-col gap-3 animate-fade-in"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCcw size={11} className="text-[#B89B73]" />
                          <span className="text-[10px] font-bold text-[#7C6B5D] uppercase tracking-wider">
                            Attempt {i + 1}
                          </span>
                        </div>
                        {attempt.code && (
                          <pre className="font-mono text-[10px] text-[#1F1F1F] bg-white border border-[#E9E2D7] rounded-lg p-3 whitespace-pre-wrap break-all overflow-x-auto">
                            {attempt.code}
                          </pre>
                        )}
                        <pre className="font-mono text-[10px] text-rose bg-rose/[0.02] border border-rose/10 rounded-lg p-3 whitespace-pre-wrap break-all">
                          {attempt.error}
                        </pre>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Logo at the end of the result (only for latest) */}
            {isLatest && !loading && (
              <div className="flex justify-start mt-4 mb-2">
                <div className="relative group/logo flex items-center">
                  <motion.img
                    src={logoUrl}
                    alt="Logo"
                    width="36"
                    height="36"
                    className="cursor-pointer rounded-md flex-shrink-0"
                    onClick={() => {
                      if (!isSpinning) {
                        triggerHaptic('light');
                        setIsSpinning(true);
                        setTimeout(() => setIsSpinning(false), 800);
                      }
                    }}
                    animate={isSpinning ? { rotate: 180, scale: 0.95 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                  <div className="absolute left-full ml-3 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="bg-[#1a1a1a] text-[#F3F3F3] text-[11px] italic font-medium px-3 py-1.5 rounded-xl shadow-md border border-[#333]">
                      Hi, I’m Dopeness. How can I help you today?
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
