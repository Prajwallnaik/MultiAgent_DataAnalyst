import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, AudioLines, ArrowUp, Loader2, Search } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import Tooltip from './ui/Tooltip';
import logoUrl from '../assets/logo.png';

const SUGGESTIONS = [
  'Show me the top 10 rows',
  'What are the summary statistics?',
  'Plot the distribution of values',
  'Find correlations between columns',
  'Show missing value counts',
  'What is the average of each numeric column?',
];

/**
 * Premium ChatGPT-style auto-growing query input textarea with suggestions.
 * Exported separately so it can be rendered sticky at the bottom in chat mode.
 */
export function QueryBar({ query, setQuery, onSubmit, loading, disabled, onUploadClick, session }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Auto-grow textarea height as the user types
  const handleTextareaChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    const textarea = e.target;
    textarea.style.height = 'auto';
    // Grow up to a maximum height of 160px (approx 6-8 lines)
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  // Submit on Enter, insert newline on Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query?.trim() && !loading && !disabled) {
        onSubmit();
      }
    }
  };

  // Reset textarea height when query is cleared
  useEffect(() => {
    if (!query && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [query]);

  const handleSuggestionClick = (suggestion) => {
    triggerHaptic('light');
    setQuery(suggestion);
    setShowSuggestions(false);

    // Set height to fit suggestion text
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
        }
      }, 50);
    }

    // Auto submit after a brief delay for visual feedback
    setTimeout(() => onSubmit(suggestion), 120);
  };

  return (
    <div className="sticky bottom-0 z-20 px-6 py-4">
      <div className="max-w-[760px] w-full mx-auto flex flex-col gap-3">
        {/* Suggestion Chips */}
        {!session && !loading && showSuggestions && !query && (
          <motion.div
            className="flex items-center gap-2 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Search size={12} className="text-[#8C8275]" />
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#F5F0E8]/50 border border-[#E0DAD0] text-[#68625B] hover:text-[#1F1F1F] hover:border-[#C4B8A8] hover:bg-[#EAE5DC] transition-all duration-200 cursor-pointer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Input Bar (Align items to bottom like ChatGPT for multi-line support) */}
        <div
          className={`bg-white border border-[#E5E5E5] rounded-[28px] shadow-[0_0_15px_rgba(0,0,0,0.05)] focus-within:shadow-[0_0_20px_rgba(0,0,0,0.08)] flex items-end gap-1.5 pl-3 pr-2 py-1.5 transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {/* Plus icon on the left (anchored to bottom) */}
          <Tooltip content={session ? `Change CSV (${session.filename})` : "Upload CSV dataset"} position="top">
            <motion.button
              type="button"
              onClick={() => { triggerHaptic('light'); onUploadClick(); }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#3b82f6] hover:bg-[#eff6ff] transition-all flex-shrink-0 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={20} />
            </motion.button>
          </Tooltip>

          {/* growing text area */}
          <textarea
            ref={inputRef}
            rows={1}
            value={query}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { setFocused(true); setShowSuggestions(true); }}
            onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
            placeholder={loading ? 'Running analysis...' : 'Ask anything'}
            disabled={loading || disabled}
            className="flex-1 bg-transparent border-none outline-none text-[#1F1F1F] text-[15px] font-normal resize-none py-[9.5px] max-h-[160px] overflow-y-auto no-scrollbar leading-[21px]"
            id="query-input"
            autoComplete="off"
          />

          {/* Mic icon (anchored to bottom) */}
          <Tooltip content="Voice input" position="top">
            <motion.button
              type="button"
              onClick={() => triggerHaptic('light')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#1F1F1F] hover:bg-[#F5F5F5] transition-all flex-shrink-0 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic size={18} />
            </motion.button>
          </Tooltip>

          {/* Submit circular arrow button (anchored to bottom) */}
          <Tooltip content="Send Message" position="top">
            <motion.button
              onClick={() => { triggerHaptic('medium'); onSubmit(); }}
              disabled={!query?.trim() || loading || disabled}
              className="w-10 h-10 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white disabled:bg-[#E5E5E5] disabled:text-[#A3A3A3] flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
              whileHover={query?.trim() && !loading ? { scale: 1.05 } : {}}
              whileTap={query?.trim() && !loading ? { scale: 0.95 } : {}}
              id="submit-query-btn"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : query?.trim() ? (
                <ArrowUp size={18} strokeWidth={2.5} />
              ) : (
                <AudioLines size={18} />
              )}
            </motion.button>
          </Tooltip>
        </div>

        {/* Disclaimer Footer */}
        <div className="text-center text-[11px] text-[#8C8275]/80 select-none mt-1">
          Dopeness can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
}

/**
 * Clean, premium landing screen displayed when no dataset is loaded,
 * containing the floating conversational message input area.
 */
export default function HeroSection({
  session,
  query,
  setQuery,
  onSubmit,
  loading,
  disabled,
  onUploadClick,
  uploadProgress,
  uploadError,
}) {
  const [isSpinning, setIsSpinning] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative px-6 bg-transparent w-full">
      {/* Centered Title Area */}
      <motion.div
        className="max-w-2xl w-full flex flex-col items-center text-center gap-6 mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2">
          <motion.img
            src={logoUrl}
            alt="Logo"
            width="64"
            height="64"
            className="cursor-pointer flex-shrink-0"
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
          <h1 
            className="text-[32px] md:text-[38px] font-normal text-[#2A2D31] tracking-tight leading-tight"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            What would you like to analyze?
          </h1>
        </div>

        {/* Error Details */}
        {uploadError && (
          <div className="text-xs text-rose font-medium bg-rose/5 border border-rose/15 rounded-lg p-3 w-full">
            {uploadError}
          </div>
        )}
      </motion.div>

      {/* Floating Input Bar wrapper */}
      <motion.div
        className="w-full max-w-2xl mx-auto z-10"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <QueryBar
          query={query}
          setQuery={setQuery}
          onSubmit={onSubmit}
          loading={loading}
          disabled={disabled}
          onUploadClick={onUploadClick}
          session={session}
        />
      </motion.div>
    </div>
  );
}
