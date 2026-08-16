import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import {
  FileSpreadsheet, ChevronDown, ChevronRight, PanelRight, Database,
  Columns, Rows3, Hash, Type, Calendar, ToggleLeft, Clock, History,
  Plus, MessageSquare, MessageSquareDashed, Trash2, Trash, BarChart3, Table, AlertTriangle, Pencil, Check, X, Pin, MoreHorizontal, MoreVertical, Search, PanelLeft, SquarePen, Star, EyeOff, SlidersVertical, Archive, Code, Briefcase, Palette, Workflow
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
  onOpen,
  onNewChat,
  onTemporaryChat,
  savedChats = [],
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  queryHistory = [],
  onHistoryItemClick,
  currentView,
  onOpenProjects,
  onOpenChats
}) {
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [projectSearch, setProjectSearch] = useState('');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [groupBy, setGroupBy] = useState('none');
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [groupMenuPos, setGroupMenuPos] = useState({ top: 0, left: 0 });

  // Fetch projects when menu opens
  useEffect(() => {
    if (activeMenuId) {
      try {
        const local = localStorage.getItem('dopeness_projects');
        if (local) setAvailableProjects(JSON.parse(local));
        setProjectSearch('');
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeMenuId]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
      setGroupMenuOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const groupChatsByDate = (chats) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const groups = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      'Older': []
    };

    chats.forEach(c => {
      const d = new Date(c.updatedAt || c.createdAt || Date.now());
      if (d >= today) groups['Today'].push(c);
      else if (d >= yesterday) groups['Yesterday'].push(c);
      else if (d >= last7Days) groups['Previous 7 Days'].push(c);
      else if (d >= last30Days) groups['Previous 30 Days'].push(c);
      else groups['Older'].push(c);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const groupChatsByProject = (chats) => {
    const groups = {};
    let projects = [];
    try {
      const local = localStorage.getItem('dopeness_projects');
      if (local) projects = JSON.parse(local);
    } catch(e) {}

    chats.forEach(c => {
      const proj = projects.find(p => p.chats?.includes(c.id));
      const projName = proj ? proj.name : 'No Project';
      if (!groups[projName]) groups[projName] = [];
      groups[projName].push(c);
    });

    const sortedEntries = Object.entries(groups).sort((a, b) => {
      if (a[0] === 'No Project') return 1;
      if (b[0] === 'No Project') return -1;
      return a[0].localeCompare(b[0]);
    });

    return sortedEntries;
  };

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
            ? 'bg-[#F2F2F2] text-[#1F1F1F] font-medium'
            : 'text-[#4A453F] hover:bg-gray-50 hover:text-[#1F1F1F]'
        }`}
        onClick={() => {
          if (!isEditing) {
            triggerHaptic(isActive ? 'light' : 'success');
            onSelectChat?.(chat.id);
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
            <Tooltip content="Chat options" position="top-end">
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 4, left: rect.right - 190 });
                  setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                }}
                className={`p-1 rounded-md hover:bg-[#E0DAD0] transition-all duration-200 cursor-pointer ${
                  activeMenuId === chat.id
                    ? 'opacity-100 bg-[#E0DAD0] text-[#1F1F1F]'
                    : 'opacity-0 group-hover:opacity-100 text-[#8C8275] hover:text-[#1F1F1F]'
                }`}
              >
                <MoreVertical size={14} />
              </motion.button>
            </Tooltip>

            {/* Claude-style Dropdown Menu */}
            {createPortal(
              <AnimatePresence>
                {activeMenuId === chat.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -4 }}
                    transition={{ duration: 0.1 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ top: menuPos.top, left: menuPos.left }}
                    className="fixed w-[190px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] py-1.5 z-[1000] flex flex-col"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('success');
                        onTogglePin?.(chat.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-1.5 text-[14.5px] font-normal text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Pin size={16} className="text-[#1F1F1F]" />
                        <span>{chat.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
                      </div>
                      <span className="text-[#8C8275] text-[11px] font-medium">P</span>
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        setEditingId(chat.id);
                        setEditTitle(stripEmojis(chat.title));
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-1.5 text-[14.5px] font-normal text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Pencil size={16} className="text-[#1F1F1F]" />
                        <span>Rename</span>
                      </div>
                      <span className="text-[#8C8275] text-[11px] font-medium">R</span>
                    </button>

                    <div className="relative group/add">
                      <button className="w-full flex items-center justify-between px-3.5 py-1.5 text-[14.5px] font-normal text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Database size={16} className="text-[#1F1F1F]" />
                          <span>Add to project</span>
                        </div>
                        <ChevronRight size={14} className="text-[#8C8275] opacity-50 group-hover/add:opacity-100 transition-opacity" />
                      </button>
                      
                      {/* Add to project submenu */}
                      <div className="absolute top-[-8px] left-[98%] hidden group-hover/add:flex flex-col w-[220px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] py-1.5 z-[1100]">
                        <div className="px-3 py-1.5 flex items-center gap-2 text-[#8C8275] border-b border-[#E9E2D7] mx-1 mb-1">
                          <Search size={14} />
                          <input 
                            type="text" 
                            placeholder="Search projects" 
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-[13px] placeholder:text-[#8C8275] w-full" 
                            onClick={(e) => e.stopPropagation()} 
                          />
                        </div>
                        
                        <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
                          {availableProjects.length === 0 ? (
                            <div className="px-4 py-3 text-[13px] text-[#8C8275] text-center">No projects found</div>
                          ) : (
                            availableProjects
                              .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                              .map(p => (
                                <button 
                                  key={p.id} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic('success');
                                    
                                    // Add chat to project in local storage
                                    try {
                                      const local = localStorage.getItem('dopeness_projects');
                                      if (local) {
                                        const projList = JSON.parse(local);
                                        const updatedProjList = projList.map(proj => {
                                          if (proj.id === p.id) {
                                            const existingChats = proj.chats || [];
                                            if (!existingChats.includes(chat.id)) {
                                              return { ...proj, chats: [...existingChats, chat.id], lastUpdated: Date.now() };
                                            }
                                          }
                                          return proj;
                                        });
                                        localStorage.setItem('dopeness_projects', JSON.stringify(updatedProjList));
                                        window.dispatchEvent(new Event('projects_updated'));
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                    
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-1.5 text-[14px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors truncate"
                                >
                                  {p.name}
                                </button>
                              ))
                          )}
                          {availableProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && availableProjects.length > 0 && (
                            <div className="px-4 py-3 text-[13px] text-[#8C8275] text-center">No matches</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-[#E9E2D7] my-1 mx-2" />

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('error');
                        onDeleteChat?.(chat.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-1.5 text-[14.5px] font-normal text-[#B94747] hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Trash size={16} className="text-[#B94747]" />
                        <span>Delete</span>
                      </div>
                      <span className="text-[#8C8275] text-[11px] font-medium">D</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
            )}
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
        <div className="px-4 py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span 
              className="text-[22px] font-medium text-[#1F1F1F] leading-none truncate"
              style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif', letterSpacing: '-0.02em' }}
            >
              Dopeness
            </span>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip content="Temporary chat" position="bottom">
              <button
                onClick={() => { triggerHaptic('light'); onTemporaryChat(); }}
                className="w-8 h-8 flex items-center justify-center text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#F2F2F2] rounded-md transition-colors cursor-pointer"
                aria-label="Temporary chat"
              >
                <MessageSquareDashed size={18} strokeWidth={1.5} />
              </button>
            </Tooltip>

            <Tooltip content="Close sidebar" position="bottom">
              <button
                onClick={() => { triggerHaptic('light'); onClose(); }}
                className="w-8 h-8 flex items-center justify-center text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#F2F2F2] rounded-md transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <PanelRight size={18} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Claude style Navigation */}
        <div className="px-3 py-1 flex flex-col gap-0.5 mb-2">
          <button onClick={() => { triggerHaptic('medium'); onNewChat(); }} className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] font-medium text-[#1F1F1F] hover:bg-[#F2F2F2] rounded-lg transition-colors w-full cursor-pointer">
            <div className="flex items-center justify-center w-[22px] h-[22px] bg-[#E8E8E8] rounded-full text-[#1F1F1F]">
              <Plus size={13} strokeWidth={2} />
            </div>
            New chat
          </button>
          
          <button 
            onClick={() => { triggerHaptic('light'); onOpenProjects?.(); }}
            className={`flex items-center gap-2.5 px-2 py-1.5 text-[13px] font-medium rounded-lg transition-colors w-full mt-1 cursor-pointer ${
              currentView === 'projects' ? 'bg-[#F2F2F2] text-[#1F1F1F]' : 'text-[#1F1F1F] hover:bg-[#F2F2F2]'
            }`}
          >
            <div className="flex items-center justify-center w-[22px] h-[22px] text-[#4A453F]">
              <Database size={14} strokeWidth={1.5} />
            </div>
            Projects
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Recent & Pinned Chats Section */}
          {savedChats.length > 0 && (
            <div className="flex flex-col gap-3">
              {/* Pinned Subheader & List */}
              {pinnedChats.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[12.5px] font-normal text-[#8C8275] px-2 pt-2 pb-1 select-none">
                    <span>Pinned</span>
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
                  <div className="flex items-center justify-between text-[12.5px] font-normal text-[#8C8275] px-2 pt-2 pb-1 select-none">
                    <span>Recents</span>
                    <Tooltip content="Group by" position="top-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          const rect = e.currentTarget.getBoundingClientRect();
                          setGroupMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
                          setGroupMenuOpen(!groupMenuOpen);
                        }}
                        className={`transition-colors cursor-pointer rounded-md p-0.5 ${groupMenuOpen ? 'bg-[#EAE5DC] text-[#1F1F1F]' : 'text-[#8C8275] hover:text-[#1F1F1F] hover:bg-gray-100'}`}
                      >
                        <SlidersVertical size={14} strokeWidth={1.5} />
                      </button>
                    </Tooltip>
                  </div>
                  
                  <div className="flex flex-col gap-1 pr-1 overflow-visible">
                    {groupBy === 'none' ? (
                      <AnimatePresence initial={false}>
                        {unpinnedChats.map(renderChatItem)}
                      </AnimatePresence>
                    ) : (
                      <AnimatePresence initial={false}>
                        {(groupBy === 'date' ? groupChatsByDate(unpinnedChats) : groupChatsByProject(unpinnedChats)).map(([groupName, groupChats]) => (
                          <div key={groupName} className="mb-2 last:mb-0">
                            <div className="text-[11px] font-medium text-[#A8A096] px-3 py-1 uppercase tracking-wider">{groupName}</div>
                            <div className="flex flex-col gap-1">
                              {groupChats.map(renderChatItem)}
                            </div>
                          </div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Group By Dropdown Menu */}
                  {createPortal(
                    <AnimatePresence>
                      {groupMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97, y: -4 }}
                          transition={{ duration: 0.1 }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ top: groupMenuPos.top, left: groupMenuPos.left }}
                          className="fixed w-[140px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] py-1.5 z-[1000] flex flex-col"
                        >
                          <div className="px-3.5 py-1 text-[11px] font-medium text-[#8C8275]">Group by</div>
                          
                          {['none', 'date', 'project'].map((opt) => (
                            <button 
                              key={opt}
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setGroupBy(opt);
                                setGroupMenuOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-3.5 py-1.5 text-[14px] font-normal text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                            >
                              <span className="capitalize">{opt}</span>
                              {groupBy === opt && <Check size={14} className="text-[#4285f4]" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
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

      </aside>

      {/* Mini Sidebar (Desktop only) */}
      <aside
        className={`fixed inset-y-0 left-0 w-[60px] bg-[#F9F9F9] border-r border-[#E9E2D7] hidden md:flex flex-col items-center py-4 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex flex-col gap-4 items-center w-full">
          <Tooltip content="Open sidebar" position="right">
            <button
              onClick={() => { triggerHaptic('light'); onOpen?.(); }}
              className="w-8 h-8 flex items-center justify-center text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#F2F2F2] rounded-md transition-colors cursor-pointer"
            >
              <PanelLeft size={18} strokeWidth={1.5} />
            </button>
          </Tooltip>

          <Tooltip content="New chat" position="right">
            <button
              onClick={() => { triggerHaptic('medium'); onNewChat(); }}
              className="flex items-center justify-center w-[34px] h-[34px] bg-[#E8E8E8] hover:bg-[#DCDCDC] rounded-full text-[#1F1F1F] transition-colors cursor-pointer"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-1 items-center w-full mt-4 flex-1">
          <Tooltip content="Projects" position="right">
            <button
              onClick={() => { triggerHaptic('light'); onOpenProjects?.(); }}
              className={`w-10 h-10 flex items-center justify-center rounded-[14px] transition-colors cursor-pointer ${currentView === 'projects' ? 'bg-[#EAE5DC] text-[#1F1F1F]' : 'text-[#68625B] hover:text-[#1F1F1F] hover:bg-[#F2F2F2]'}`}
            >
              <Database size={18} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  );
}

