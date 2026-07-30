import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Download, Plus, ArrowDown, Loader } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';

import Sidebar from './components/Sidebar';
import ResultCard from './components/ResultCard';
import HeroSection, { QueryBar } from './components/HeroSection';
import InsightPanel from './components/InsightPanel';
import SkeletonLoader from './components/ui/SkeletonLoader';
import Tooltip from './components/ui/Tooltip';
import logoUrl from './assets/logo.png';

const API_BASE = '';

export default function App() {
  // Core state
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [loading, setLoading] = useState(false);

  // Saved chats (ChatGPT style history)
  const [savedChats, setSavedChats] = useState(() => {
    try {
      const local = localStorage.getItem('dopeness_saved_chats');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState(null);

  // Sync savedChats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dopeness_saved_chats', JSON.stringify(savedChats));
    } catch (e) {
      console.error('Failed to write saved chats:', e);
    }
  }, [savedChats]);

  // Auto-sync active conversation to savedChats (ChatGPT style title & ordering)
  useEffect(() => {
    if (!session && history.length === 0) return;
    if (isTemporary) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = `chat_${Date.now()}`;
      setCurrentChatId(chatId);
    }

    setSavedChats((prev) => {
      const existing = prev.find((c) => c.id === chatId);

      // ChatGPT style title logic: user prompt title > CSV title
      let title = existing?.customTitle;
      if (!title) {
        const firstQuery = history[0]?.query;
        if (firstQuery) {
          title = firstQuery.length > 32 ? `${firstQuery.slice(0, 32)}...` : firstQuery;
        } else if (session?.filename) {
          title = `Analysis: ${session.filename}`;
        } else {
          title = 'New Chat';
        }
      }

      const updatedChat = {
        id: chatId,
        title,
        customTitle: existing?.customTitle || null,
        isPinned: existing?.isPinned || false,
        session,
        history,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      const existingIdx = prev.findIndex((c) => c.id === chatId);
      let newChats;
      if (existingIdx >= 0) {
        newChats = [...prev];
        newChats[existingIdx] = updatedChat;
      } else {
        newChats = [updatedChat, ...prev];
      }

      // Sort pinned chats first, then newest activity (ChatGPT style)
      return newChats.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
    });
  }, [session, history]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Panel state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightEntry, setInsightEntry] = useState(null);
  const [hoverHistoryOpen, setHoverHistoryOpen] = useState(false);

  // Refs
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Custom Scrollbar States
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setIsScrollable(scrollHeight > clientHeight);
    const maxScroll = scrollHeight - clientHeight;
    setScrollPercent(maxScroll > 0 ? scrollTop / maxScroll : 0);
  };

  const scrollUp = () => {
    triggerHaptic('light');
    scrollContainerRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
  };

  const scrollDown = () => {
    triggerHaptic('light');
    scrollContainerRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  };

  const handleTrackClick = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percent = Math.max(0, Math.min(1, clickY / rect.height));
    const { scrollHeight, clientHeight } = container;
    container.scrollTo({
      top: percent * (scrollHeight - clientHeight),
      behavior: 'smooth'
    });
  };

  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;
    const startY = e.clientY;
    const startScrollTop = container.scrollTop;
    const { scrollHeight, clientHeight } = container;
    const maxScroll = scrollHeight - clientHeight;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaPercent = deltaY / 220;
      container.scrollTop = startScrollTop + deltaPercent * maxScroll;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Re-check scroll state on history change
  useEffect(() => {
    setTimeout(handleScroll, 100);
  }, [history, loading]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setUploadError('Only CSV files are accepted.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Upload failed');
      }

      const data = await res.json();
      triggerHaptic('success');

      // Start fresh chat session for newly uploaded file
      const newChatId = `chat_${Date.now()}`;
      setCurrentChatId(newChatId);
      setHistory([]);
      setSession({
        sessionId: data.session_id,
        filename: data.filename,
        rows: data.rows,
        columns: data.columns,
        columnNames: data.column_names,
        columnTypes: data.column_types,
        schemaContext: data.schema_context,
      });
      setSidebarOpen(true);
    } catch (err) {
      triggerHaptic('error');
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submitQuery = async (q) => {
    const trimmed = (q || query).trim();
    if (!trimmed || loading) return;

    if (!session) {
      setUploadError("Please upload a CSV dataset to run your query.");
      fileInputRef.current?.click();
      return;
    }

    setLoading(true);
    setPendingQuery(trimmed);
    setQuery('');

    try {
      const formData = new FormData();
      formData.append('session_id', session.sessionId);
      formData.append('query', trimmed);

      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Query failed');
      }

      const data = await res.json();
      triggerHaptic('success');

      setHistory((prev) => [
        ...prev,
        {
          query: trimmed,
          output_type: data.output_type,
          code_type: data.code_type,
          generated_code: data.generated_code,
          analysis_plan: data.analysis_plan,
          execution_result: data.execution_result,
          insight_text: data.insight_text,
          retry_count: data.retry_count,
          fallback_used: data.fallback_used,
          failed_attempts: data.failed_attempts,
        },
      ]);
    } catch (err) {
      triggerHaptic('error');
      setHistory((prev) => [
        ...prev,
        {
          query: trimmed,
          output_type: 'error',
          execution_result: { type: 'scalar', data: err.message },
          insight_text: null,
          analysis_plan: null,
          retry_count: 0,
          fallback_used: true,
          failed_attempts: [],
          generated_code: '',
          code_type: 'python',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInsight = (entry) => {
    setInsightEntry(entry);
    setInsightOpen(true);
  };

  const [editingCardIndex, setEditingCardIndex] = useState(null);

  const handleEditQuery = async (index, newQueryText) => {
    const trimmed = newQueryText.trim();
    if (!trimmed || loading || !session) return;

    setLoading(true);
    setEditingCardIndex(index);

    // 1. Immediately update prompt text, set skeleton loading, and branch history like ChatGPT
    setHistory((prev) => {
      const branched = prev.slice(0, index + 1);
      branched[index] = {
        ...branched[index],
        query: trimmed,
        isEditingLoading: true,
      };
      return branched;
    });

    try {
      const formData = new FormData();
      formData.append('session_id', session.sessionId);
      formData.append('query', trimmed);

      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Query failed');
      }

      const data = await res.json();
      triggerHaptic('success');

      // 2. Replace entry with new execution result, chart/table, code, & insights
      setHistory((prev) => {
        const next = [...prev];
        next[index] = {
          query: trimmed,
          output_type: data.output_type,
          code_type: data.code_type,
          generated_code: data.generated_code,
          analysis_plan: data.analysis_plan,
          execution_result: data.execution_result,
          insight_text: data.insight_text,
          retry_count: data.retry_count,
          fallback_used: data.fallback_used,
          failed_attempts: data.failed_attempts,
          isEditingLoading: false,
        };
        return next;
      });
    } catch (err) {
      triggerHaptic('error');
      setHistory((prev) => {
        const next = [...prev];
        next[index] = {
          query: trimmed,
          output_type: 'error',
          execution_result: { type: 'scalar', data: err.message },
          insight_text: null,
          analysis_plan: null,
          retry_count: 0,
          fallback_used: true,
          failed_attempts: [],
          generated_code: '',
          code_type: 'python',
          isEditingLoading: false,
        };
        return next;
      });
    } finally {
      setLoading(false);
      setEditingCardIndex(null);
    }
  };

  const handleExportReport = () => {
    if (history.length === 0) return;

    let iframe = document.getElementById('download_iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'download_iframe';
      iframe.name = 'download_iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE}/api/export_report`;
    form.target = 'download_iframe';

    const filenameInput = document.createElement('input');
    filenameInput.type = 'hidden';
    filenameInput.name = 'filename';
    filenameInput.value = session?.filename || 'session';
    form.appendChild(filenameInput);

    const historyInput = document.createElement('input');
    historyInput.type = 'hidden';
    historyInput.name = 'history_json';

    const sanitizedHistory = history.map(entry => {
      const exec = entry.execution_result;
      return {
        query: entry.query,
        insight_text: entry.insight_text,
        generated_code: entry.generated_code,
        execution_result: exec ? {
          type: exec.type,
          data: exec.data
        } : null
      };
    });
    historyInput.value = JSON.stringify(sanitizedHistory);
    form.appendChild(historyInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleUploadClick = () => {
    // Open sidebar on mobile, or trigger file input
    setSidebarOpen(true);
  };

  const handleNewChat = () => {
    triggerHaptic('medium');
    setSession(null);
    setHistory([]);
    setCurrentChatId(null);
    setQuery('');
    setLoading(false);
    setUploading(false);
    setUploadError(null);
    setInsightOpen(false);
    setIsTemporary(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTemporaryChat = () => {
    triggerHaptic('medium');
    setSession(null);
    setHistory([]);
    setCurrentChatId(null);
    setQuery('');
    setPendingQuery('');
    setLoading(false);
    setUploading(false);
    setUploadError(null);
    setInsightOpen(false);
    setIsTemporary(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectChat = (chat) => {
    setCurrentChatId(chat.id);
    setSession(chat.session);
    setHistory(chat.history || []);
    setInsightOpen(false);
    setUploadError(null);
    setIsTemporary(false);
  };

  const handleDeleteChat = (chatId) => {
    setSavedChats((prev) => prev.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) {
      handleNewChat();
    }
  };

  const handleRenameChat = (chatId, newTitle) => {
    if (!newTitle.trim()) return;
    setSavedChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: newTitle.trim(), customTitle: newTitle.trim() } : c))
    );
  };

  const handleTogglePin = (chatId) => {
    triggerHaptic('light');
    setSavedChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c)).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      })
    );
  };

  const handleHistoryItemClick = (idx, queryText) => {
    triggerHaptic('light');
    const cardEl = document.getElementById(`chat-card-${idx}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (queryText) {
      setQuery(queryText);
    }
  };

  return (
    <div className="flex h-screen bg-transparent text-zinc-100 font-sans antialiased overflow-hidden">
      <Sidebar
        session={session}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onTemporaryChat={handleTemporaryChat}
        savedChats={savedChats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onTogglePin={handleTogglePin}
        queryHistory={history}
        onHistoryItemClick={handleHistoryItemClick}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col h-screen relative transition-[padding-left] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] bg-white ${sidebarOpen ? 'md:pl-[300px]' : 'pl-0'
        }`}>
        {/* Top Navigation Bar */}
        <header className="sticky top-0 bg-transparent px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger menu (show when sidebar closed) */}
            {!sidebarOpen && (
              <motion.button
                onClick={() => { triggerHaptic('light'); setSidebarOpen(true); }}
                className="p-2 rounded-lg hover:bg-[#F5F0E8] text-[#68625B] hover:text-[#000000] transition-colors cursor-pointer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Open Navigation"
              >
                <Menu size={18} />
              </motion.button>
            )}

            {/* User Logo */}
            <div className="flex items-center gap-2 select-none">
              <span className="text-xs font-semibold text-zinc-100 tracking-wide">
                Workspace
              </span>
              {isTemporary && (
                <span className="text-[10px] bg-[#EAE5DC] text-[#68625B] px-2 py-0.5 rounded-full font-medium ml-2">
                  Temporary Chat
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export Word Button */}
            {(session || history.length > 0) && (
              <Tooltip content={history.length === 0 ? "Ask at least one query to export report" : "Export analysis report as Word document"} position="bottom-end">
                <motion.button
                  onClick={() => { triggerHaptic('medium'); handleExportReport(); }}
                  disabled={history.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    history.length > 0
                      ? 'bg-[#1F1F1F] hover:bg-[#333333] text-white cursor-pointer'
                      : 'bg-[#EAE5DC] text-[#8C8275] cursor-not-allowed opacity-70'
                  }`}
                  whileHover={history.length > 0 ? { scale: 1.03 } : {}}
                  whileTap={history.length > 0 ? { scale: 0.97 } : {}}
                >
                  <Download size={13} />
                  <span>Export Word</span>
                </motion.button>
              </Tooltip>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key="workspace"
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {!session || (history.length === 0 && !loading) ? (
                <HeroSection
                  session={session}
                  query={query}
                  setQuery={setQuery}
                  onSubmit={submitQuery}
                  loading={loading || uploading}
                  disabled={uploading}
                  onUploadClick={() => fileInputRef.current?.click()}
                  uploadProgress={uploadProgress}
                  uploadError={uploadError}
                />
              ) : (
                <>
                  {/* Scrollable Results Area */}
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar"
                  >
                    <div className="max-w-[760px] w-full mx-auto flex flex-col gap-8">
                      {/* Results */}
                      {history.map((entry, idx) => (
                        <div key={idx} id={`chat-card-${idx}`} className="scroll-mt-6">
                          <ResultCard
                            entry={entry}
                            index={idx}
                            onViewInsight={handleViewInsight}
                            onEditSubmit={handleEditQuery}
                            loading={loading}
                            isLatest={idx === history.length - 1}
                          />
                        </div>
                      ))}

                      {/* Global Loading State for NEW prompts */}
                      {loading && editingCardIndex === null && (
                        <div className="flex flex-col gap-6 w-full px-6 md:px-8">
                          {/* User Query Bubble (matching ResultCard) */}
                          <div className="flex justify-end w-full">
                            <div className="relative group/bubble flex flex-col items-end gap-1.5 max-w-[85%]">
                              <div className="px-6 py-3.5 rounded-[24px] bg-[#f4f4f4] text-[15px] font-normal text-[#0d0d0d] select-all leading-relaxed">
                                {pendingQuery}
                              </div>
                            </div>
                          </div>

                          <motion.div
                            className="flex-1 flex flex-col gap-4"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            {/* Working Loading State */}
                            <div className="flex items-center gap-2.5 px-2 py-2 mt-4">
                              <Loader className="animate-[spin_3s_linear_infinite] text-[#D96A4C]" size={20} strokeWidth={2.5} />
                              <span className="text-[#8C8275] text-[15px] font-medium">Working</span>
                            </div>
                          </motion.div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  {/* Scroll to bottom button */}
                  <div className="w-full flex justify-center h-0 relative z-30 pointer-events-none">
                    <AnimatePresence>
                      {isScrollable && scrollPercent < 0.95 && (
                        <motion.div
                          className="absolute bottom-4 pointer-events-auto"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                        >
                        <Tooltip content="Scroll to bottom" position="top">
                          <button
                            onClick={() => {
                              triggerHaptic('light');
                              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="w-9 h-9 rounded-full bg-[#333333] text-white flex items-center justify-center shadow-lg hover:bg-[#1F1F1F] transition-colors cursor-pointer border border-[#444444]"
                          >
                            <ArrowDown size={16} strokeWidth={2.5} />
                          </button>
                        </Tooltip>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Query Input Bar */}
                  <QueryBar
                    query={query}
                    setQuery={setQuery}
                    onSubmit={submitQuery}
                    loading={loading}
                    disabled={!session}
                    onUploadClick={() => fileInputRef.current?.click()}
                    session={session}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Insight Panel (Right Side) */}
      <InsightPanel
        isOpen={insightOpen}
        onClose={() => setInsightOpen(false)}
        entry={insightEntry}
      />

      {/* Floating Hover Conversational History Widget */}
      {history.length > 0 && (
        <div
          className="fixed right-10 top-1/2 -translate-y-1/2 z-40 flex items-center gap-3"
          onMouseEnter={() => setHoverHistoryOpen(true)}
          onMouseLeave={() => setHoverHistoryOpen(false)}
        >
          {/* Conversational Popover List */}
          <AnimatePresence>
            {hoverHistoryOpen && (
              <motion.div
                initial={{ opacity: 0, x: 15, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white border border-[#E9E2D7] rounded-[20px] shadow-lg p-3 w-64 max-h-[320px] flex flex-col gap-1 text-[#1F1F1F] z-50 select-none mr-1"
              >
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[260px] pr-1 scrollbar-thin">
                  {history.map((entry, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        triggerHaptic('light');
                        document.getElementById(`chat-card-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-left w-full text-xs font-normal px-3 py-2.5 rounded-xl hover:bg-[#F2F2F2] active:bg-[#EAEAEA] transition-colors border border-transparent truncate cursor-pointer text-[#4A453F] hover:text-[#1F1F1F]"
                      title={entry.query}
                    >
                      {entry.query}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger Indicator (Dynamic Stacked Lines matching conversation history length) */}
          <div className="flex flex-col gap-[3px] cursor-pointer py-3.5 px-2 bg-white border border-[#E0DAD0] rounded-full shadow-sm hover:shadow-md transition-all duration-200 min-w-[28px] items-center justify-center">
            {[...Array(Math.min(history.length, 8))].map((_, i) => (
              <div key={i} className="w-3.5 h-[2px] bg-[#68625B] rounded-full" />
            ))}
          </div>
        </div>
      )}

      {/* Custom Right-Side Scrollbar Slider */}
      {history.length > 0 && isScrollable && (
        <div className="fixed right-3 top-1/4 bottom-1/4 w-5 z-40 flex flex-col items-center justify-between py-4 bg-white/85 backdrop-blur-md border border-[#E0DAD0] rounded-full shadow-md select-none">
          {/* Scroll Up Button */}
          <button
            onClick={scrollUp}
            className="w-4 h-4 flex items-center justify-center text-[7px] text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#F5F0E8] rounded-full transition-colors cursor-pointer select-none"
            title="Scroll Up"
          >
            ▲
          </button>

          {/* Slider Track */}
          <div
            onClick={handleTrackClick}
            className="flex-1 w-1 bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] border border-[#E9E2D7] rounded-full relative my-3 cursor-pointer"
            title="Jump to position"
          >
            {/* Scroll Thumb */}
            <div
              onMouseDown={handleThumbMouseDown}
              className="absolute left-1/2 -translate-x-1/2 w-2 bg-[#8C8275] rounded-full shadow-sm cursor-pointer hover:bg-[#68625B] transition-all duration-100"
              style={{
                height: '40px',
                top: `${scrollPercent * (100 - (40 / 220) * 100)}%`,
              }}
            />
          </div>

          {/* Scroll Down Button */}
          <button
            onClick={scrollDown}
            className="w-4 h-4 flex items-center justify-center text-[7px] text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#F5F0E8] rounded-full transition-colors cursor-pointer select-none"
            title="Scroll Down"
          >
            ▼
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
        className="hidden"
      />
    </div>
  );
}
