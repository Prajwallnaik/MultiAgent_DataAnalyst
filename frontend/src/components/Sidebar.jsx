import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import {
  FileSpreadsheet, ChevronDown, ChevronRight, PanelLeftClose, Database,
  Columns, Rows3, Hash, Type, Calendar, ToggleLeft, Clock, History,
  Plus, MessageSquare, MessageSquareDashed, Trash2, Trash, BarChart3, Table, AlertTriangle, Pencil, Check, X, Pin, MoreHorizontal, Search, PanelLeft, SquarePen
} from 'lucide-react';
import AnimatedCounter from './ui/AnimatedCounter';
import Tooltip from './ui/Tooltip';

const API_BASE = '';

const stripEmojis = (str) => {
  return str ? str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F251}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';
};

const TYPE_ICONS = {
  'int64': Hash,
  'int32': Hash,
  'float64': Hash,
  'float32': Hash,
  'object': Type,
  'string': Type,
  'datetime64': Calendar,
  'bool': ToggleLeft,
  'category': Database,
};

function getTypeIcon(dtype) {
  const key = Object.keys(TYPE_ICONS).find((k) => dtype?.toLowerCase().includes(k));
  return TYPE_ICONS[key] || Type;
}

/**
 * ChatGPT-style sidebar with glassmorphism, 3-dots context menu (Pin, Rename, Delete),
 * visual pinned chat grouping, multi-tier haptics, and dataset schema viewer.
 */
export default function Sidebar({
  session,
  isOpen,
  onClose,
  onNewChat,
  onTemporaryChat,
  savedChats = [],
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  queryHistory = [],
  onHistoryItemClick
}) {
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSaveRename = (id) => {
    if (editTitle.trim()) {
      triggerHaptic('success');
      onRenameChat?.(id, editTitle.trim());
    } else {
      triggerHaptic('light');
    }
    setEditingId(null);
  };

  const pinnedChats = savedChats.filter((c) => c.isPinned);
  const unpinnedChats = savedChats.filter((c) => !c.isPinned);

  const renderChatItem = (chat) => {
    const isActive = chat.id === currentChatId;
    const isEditing = editingId === chat.id;
    const isMenuOpen = activeMenuId === chat.id;

    return (
      <motion.div
        key={chat.id}
        layout
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
        style={{ zIndex: isMenuOpen ? 999 : 1, position: 'relative' }}
        whileHover={{ scale: 1.01, x: 3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-300 ease-out cursor-pointer select-none ${
          isActive
            ? 'bg-gray-100 text-[#1F1F1F] font-bold shadow-sm border border-gray-200'
            : 'text-[#4A453F] hover:bg-gray-50 hover:text-[#1F1F1F]'
        }`}
        onClick={() => {
          if (!isEditing) {
            triggerHaptic(isActive ? 'light' : 'success');
            onSelectChat?.(chat);
          }
        }}
      >
        {/* Active Accent Bar removed for cleaner look */}

        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1 pl-1">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename(chat.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={() => handleSaveRename(chat.id)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#B89B73] rounded-lg px-2 py-1 text-xs text-[#1F1F1F] outline-none w-full shadow-inner transition-all duration-200"
            />
          ) : (
            <span className="truncate flex-1 text-xs font-medium text-[#1F1F1F] transition-colors duration-200 w-full block" title={stripEmojis(chat.title)}>
              {stripEmojis(chat.title)}
            </span>
          )}
        </div>

        {/* ChatGPT-style Pinned Pin Icon & 3-Dots Menu Button */}
        {!isEditing && (
          <div className="relative flex items-center gap-1 flex-shrink-0">
            {chat.isPinned && (
              <Pin size={12} className="text-[#8C8275] flex-shrink-0 transition-transform duration-200" title="Pinned chat" />
            )}

            <Tooltip content="Chat options" position="top-end">
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                }}
                className={`p-1 rounded-md hover:bg-[#E0DAD0] transition-all duration-200 cursor-pointer ${
                  activeMenuId === chat.id
                    ? 'opacity-100 bg-[#E0DAD0] text-[#1F1F1F]'
                    : 'opacity-0 group-hover:opacity-100 text-[#8C8275] hover:text-[#1F1F1F]'
                }`}
              >
                <MoreHorizontal size={14} />
              </motion.button>
            </Tooltip>

            {/* Exact ChatGPT-style Dropdown Menu */}
            <AnimatePresence>
              {activeMenuId === chat.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E9E2D7] rounded-2xl shadow-2xl p-1.5 z-[100] flex flex-col gap-0.5"
                >
                  {/* Rename */}
                  <motion.button
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setEditingId(chat.id);
                      setEditTitle(stripEmojis(chat.title));
                      setActiveMenuId(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1F1F1F] hover:bg-[#FAF7F2] transition-all duration-150 ease-out cursor-pointer"
                  >
                    <Pencil size={14} className="text-[#1F1F1F]" />
                    <span>Rename</span>
                  </motion.button>

                  {/* Pin chat / Unpin chat */}
                  <motion.button
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('success');
                      onTogglePin?.(chat.id);
                      setActiveMenuId(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1F1F1F] hover:bg-[#FAF7F2] transition-all duration-150 ease-out cursor-pointer"
                  >
                    <Pin size={14} className="text-[#1F1F1F]" />
                    <span>{chat.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
                  </motion.button>

                  {/* Delete */}
                  <motion.button
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('error');
                      onDeleteChat?.(chat.id);
                      setActiveMenuId(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#992828] hover:bg-red-50 transition-all duration-150 ease-out cursor-pointer"
                  >
                    <Trash size={14} className="text-[#992828]" />
                    <span>Delete</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                handleSaveRename(chat.id);
              }}
              className="p-1 text-[#137333] hover:text-[#0b471f] transition-all duration-200 cursor-pointer"
            >
              <Check size={12} />
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 w-[300px] glass-panel flex flex-col z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-2 border-b border-[#E6DDD0]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span 
              className="text-[24px] font-normal text-[#1F1F1F] leading-none truncate"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              Dopeness
            </span>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip content="Temporary chat" position="bottom">
              <button
                onClick={() => { triggerHaptic('medium'); onTemporaryChat(); }}
                className="w-8 h-8 flex items-center justify-center text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#EAE5DC]/60 rounded-md transition-colors cursor-pointer"
                aria-label="Temporary chat"
              >
                <MessageSquareDashed size={18} strokeWidth={1.5} />
              </button>
            </Tooltip>

            <Tooltip content="New chat" position="bottom">
              <button
                onClick={() => { triggerHaptic('medium'); onNewChat(); }}
                className="w-8 h-8 flex items-center justify-center text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#EAE5DC]/60 rounded-md transition-colors cursor-pointer"
                aria-label="New chat"
              >
                <SquarePen size={18} strokeWidth={1.5} />
              </button>
            </Tooltip>

            <Tooltip content="Close sidebar" position="bottom">
              <button
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="w-8 h-8 flex items-center justify-center text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#EAE5DC]/60 rounded-md transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <PanelLeft size={18} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Recent & Pinned Chats Section */}
          {savedChats.length > 0 && (
            <div className="flex flex-col gap-3">
              {/* Pinned Subheader & List */}
              {pinnedChats.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#8C8275] uppercase tracking-[0.15em] px-1 pt-1 select-none">
                    <span className="flex items-center gap-1.5">
                      <Pin size={11} className="text-[#B89B73] fill-[#B89B73]" />
                      Pinned
                    </span>
                    <span className="text-[9px] font-mono text-[#8C8275]">{pinnedChats.length}</span>
                  </div>
                  <div className="flex flex-col gap-1 pr-1 overflow-visible">
                    <AnimatePresence initial={false}>
                      {pinnedChats.map(renderChatItem)}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Unpinned / Recent Subheader & List */}
              {unpinnedChats.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#7C6B5D] uppercase tracking-[0.15em] px-1 pt-1 select-none">
                    <span className="flex items-center gap-1.5">
                      <History size={12} className="text-[#B89B73]" />
                      Recent Chats
                    </span>
                    <span className="text-[9px] font-mono text-[#8C8275]">{unpinnedChats.length}</span>
                  </div>
                  <div className="flex flex-col gap-1 pr-1 overflow-visible">
                    <AnimatePresence initial={false}>
                      {unpinnedChats.map(renderChatItem)}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Session Details & Schema */}
          <AnimatePresence mode="wait">
            {session && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4 border-t border-[#E6DDD0]/50 pt-4"
              >
                {/* File Badge */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] border border-[#A3E2B9]/30 flex items-center justify-center text-[#137333] flex-shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1F1F1F] truncate w-full block" title={session.filename}>
                      {session.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#7C6B5D] font-medium">
                      <span className="flex items-center gap-1">
                        <Rows3 size={11} className="text-[#7C6B5D]" />
                        <span className="font-mono"><AnimatedCounter value={session.rows} /></span> rows
                      </span>
                      <span className="text-[#E6DDD0]">|</span>
                      <span className="flex items-center gap-1">
                        <Columns size={11} className="text-[#7C6B5D]" />
                        <span className="font-mono"><AnimatedCounter value={session.columns} /></span> columns
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schema Section */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { triggerHaptic('light'); setSchemaOpen(!schemaOpen); }}
                    className="flex items-center justify-between text-[10px] font-bold text-[#7C6B5D] uppercase tracking-[0.15em] hover:text-[#1F1F1F] transition-colors"
                  >
                    <span>Dataset Schema</span>
                    <ChevronDown size={14} className={`text-[#68625B] transform transition-transform duration-200 ${schemaOpen ? '' : '-rotate-90'}`} />
                  </button>

                  <AnimatePresence>
                    {schemaOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                          {session.columnNames?.map((col) => {
                            const dtype = session.columnTypes?.[col] || 'unknown';
                            const isNumeric = dtype.includes('int') || dtype.includes('float');
                            const typeLabel = isNumeric ? 'int' : 'str';
                            const iconBg = isNumeric ? 'bg-[#E6F4EA] border-[#A3E2B9]/30 text-[#137333]' : 'bg-gray-100 border-gray-200/50 text-gray-600';
                            const indicatorText = isNumeric ? '#' : 'T';
                            return (
                              <div
                                key={col}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 shadow-sm hover:shadow transition-all"
                              >
                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold text-xs select-none ${iconBg}`}>
                                  {indicatorText}
                                </div>
                                <span className="text-[11px] font-bold text-[#1F1F1F] truncate flex-1">{col}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none ${isNumeric ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-gray-200 text-gray-600'}`}>
                                  {typeLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E6DDD0]/40">
          <div className="flex items-center gap-2 text-[10px] font-medium text-[#7C6B5D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#137333] animate-pulse" />
            <span>System status: <span className="text-[#137333] font-bold">Normal</span></span>
          </div>
        </div>
      </aside>
    </>
  );
}

