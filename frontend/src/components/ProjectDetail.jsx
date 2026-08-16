import React, { useState, useEffect } from 'react';
import { Folder, Upload, MoreHorizontal, Plus, Mic, ArrowLeft, MessageCircle, MoreVertical, Star, EyeOff, Pencil, FolderMinus, Trash2, ChevronRight, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tooltip from './ui/Tooltip';

export default function ProjectDetail({ project, onBack, onChatSelect, onStartProjectChat, onUploadClick }) {
  const [activeTab, setActiveTab] = useState('chats');
  const [projectChats, setProjectChats] = useState([]);
  const [query, setQuery] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [chatToRename, setChatToRename] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [, setTimeTrigger] = useState(Date.now());

  // Update times dynamically
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTrigger(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = () => {
      try {
        const allChatsStr = localStorage.getItem('dopeness_saved_chats');
        let allChats = [];
        if (allChatsStr) {
          allChats = JSON.parse(allChatsStr);
        }
        
        const projsStr = localStorage.getItem('dopeness_projects');
        if (projsStr) {
          const projs = JSON.parse(projsStr);
          setAllProjects(projs);
          
          const updatedProj = projs.find(p => p.id === project.id);
          if (updatedProj) {
            const projChatIds = updatedProj.chats || [];
            const filtered = allChats.filter(c => projChatIds.includes(c.id));
            filtered.sort((a, b) => {
              const timeA = a.updatedAt || a.createdAt || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
              const timeB = b.updatedAt || b.createdAt || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
              return timeB - timeA;
            });
            setProjectChats(filtered);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    load();
    window.addEventListener('projects_updated', load);
    return () => window.removeEventListener('projects_updated', load);
  }, [project]);

  // Close menus on outside click
  useEffect(() => {
    const close = () => { setActiveMenuId(null); setIsSubmenuOpen(false); setProjectSearch(''); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleDeleteChat = (chatId) => {
    // Remove from saved chats
    const allChatsStr = localStorage.getItem('dopeness_saved_chats');
    if (allChatsStr) {
      let allChats = JSON.parse(allChatsStr);
      allChats = allChats.filter(c => c.id !== chatId);
      localStorage.setItem('dopeness_saved_chats', JSON.stringify(allChats));
    }

    // Remove from projects
    const projsStr = localStorage.getItem('dopeness_projects');
    if (projsStr) {
      let projects = JSON.parse(projsStr);
      projects = projects.map(p => {
        if (p.id === project.id && p.chats) {
          return { ...p, chats: p.chats.filter(id => id !== chatId) };
        }
        return p;
      });
      localStorage.setItem('dopeness_projects', JSON.stringify(projects));
      setAllProjects(projects);
    }

    // Update local state
    setProjectChats(prev => prev.filter(c => c.id !== chatId));
    setActiveMenuId(null);
  };
  const handleStarChat = (chatId) => {
    const allChatsStr = localStorage.getItem('dopeness_saved_chats');
    if (allChatsStr) {
      let allChats = JSON.parse(allChatsStr);
      allChats = allChats.map(c => c.id === chatId ? { ...c, starred: !c.starred } : c);
      localStorage.setItem('dopeness_saved_chats', JSON.stringify(allChats));
      setProjectChats(prev => prev.map(c => c.id === chatId ? { ...c, starred: !c.starred } : c));
    }
    setActiveMenuId(null);
  };

  const handleRenameChat = (chatId, currentTitle) => {
    setChatToRename({ id: chatId, title: currentTitle });
    setRenameInput(currentTitle);
    setRenameModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSaveRename = () => {
    if (chatToRename && renameInput.trim() !== "" && renameInput !== chatToRename.title) {
      const allChatsStr = localStorage.getItem('dopeness_saved_chats');
      if (allChatsStr) {
        let allChats = JSON.parse(allChatsStr);
        allChats = allChats.map(c => c.id === chatToRename.id ? { ...c, title: renameInput.trim() } : c);
        localStorage.setItem('dopeness_saved_chats', JSON.stringify(allChats));
        setProjectChats(prev => prev.map(c => c.id === chatToRename.id ? { ...c, title: renameInput.trim() } : c));
      }
    }
    setRenameModalOpen(false);
    setChatToRename(null);
  };

  const handleChangeProject = (chatId, newProjectId) => {
    if (newProjectId === project.id) return;
    const projsStr = localStorage.getItem('dopeness_projects');
    if (projsStr) {
      let projects = JSON.parse(projsStr);
      projects = projects.map(p => {
        if (p.id === project.id && p.chats) {
          return { ...p, chats: p.chats.filter(id => id !== chatId) };
        }
        if (p.id === newProjectId) {
          const chats = p.chats || [];
          if (!chats.includes(chatId)) {
            return { ...p, chats: [...chats, chatId] };
          }
        }
        return p;
      });
      localStorage.setItem('dopeness_projects', JSON.stringify(projects));
      setAllProjects(projects);
      setProjectChats(prev => prev.filter(c => c.id !== chatId));
    }
    setActiveMenuId(null);
    setIsSubmenuOpen(false);
  };

  const handleRemoveFromProject = (chatId) => {
    const projsStr = localStorage.getItem('dopeness_projects');
    if (projsStr) {
      let projects = JSON.parse(projsStr);
      projects = projects.map(p => {
        if (p.id === project.id && p.chats) {
          return { ...p, chats: p.chats.filter(id => id !== chatId) };
        }
        return p;
      });
      localStorage.setItem('dopeness_projects', JSON.stringify(projects));
      setAllProjects(projects);
      setProjectChats(prev => prev.filter(c => c.id !== chatId));
    }
    setActiveMenuId(null);
  };

  // Format date helper (matches screenshot: "4 minutes ago" or "May 25")
  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const timestamp = new Date(ts).getTime();
    if (isNaN(timestamp)) return ts;
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col w-full h-full bg-[#FCFCFC] overflow-y-auto px-8 py-10 md:px-24"
    >
      <div className="max-w-[800px] w-full mx-auto flex flex-col gap-8">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#8C8275] hover:text-[#1F1F1F] transition-colors w-fit -ml-2 p-2 rounded-lg"
        >
          <ArrowLeft size={18} />
          <span className="text-[14px] font-medium">Back to Projects</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Folder size={28} className="text-[#1F1F1F]" strokeWidth={1.5} />
            <h1 className="text-[26px] font-medium text-[#1F1F1F] tracking-tight">{project.name}</h1>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="w-full mt-4">
          <button 
            onClick={() => {
              onStartProjectChat(project, "");
              setTimeout(() => {
                onUploadClick();
              }, 100);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E9E2D7] rounded-xl hover:border-[#D0C7BA] hover:bg-[#F9F9F9] text-[#1F1F1F] transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer w-fit"
          >
            <Plus size={18} className="text-[#8C8275]" />
            <span className="text-[14.5px] font-medium">New chat in {project.name}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col mt-6">
          
          {/* Recents (Chats) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[14px] text-[#8C8275] font-medium">Recents</h3>
            <div className="flex flex-col gap-1 w-full">
              {projectChats.length > 0 && (
                projectChats.map(chat => {
                  const isMenuOpen = activeMenuId === chat.id;
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => onChatSelect?.(chat.id)}
                    className="flex items-center justify-between py-3.5 px-3 -mx-3 rounded-[14px] hover:bg-[#F2F2F2] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full border border-[#D0C7BA] bg-white flex items-center justify-center text-[#8C8275] flex-shrink-0 shadow-sm">
                        <MessageCircle size={15} strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-normal text-[#1F1F1F]">
                          {chat.title}
                        </span>
                        {chat.starred && <Star size={13} fill="#F59E0B" className="text-[#F59E0B]" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-[#8C8275] whitespace-nowrap">
                        {formatTime(chat.updatedAt || chat.createdAt || chat.timestamp)}
                      </span>
                      
                      <div className="relative">
                        <Tooltip content="Chat options" position="top-end">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (activeMenuId === chat.id) {
                                setActiveMenuId(null);
                                setIsSubmenuOpen(false);
                              } else {
                                setActiveMenuId(chat.id); 
                                setIsSubmenuOpen(false);
                              }
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isMenuOpen ? 'bg-[#EAE5DC] text-[#1F1F1F]' : 'text-[#8C8275] hover:bg-[#EAE5DC] hover:text-[#1F1F1F] opacity-0 group-hover:opacity-100'}`}
                          >
                            <MoreVertical size={16} strokeWidth={2} />
                          </button>
                        </Tooltip>

                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.12 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-10 w-[200px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] py-1.5 z-[100] flex flex-col"
                            >
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleStarChat(chat.id); }}
                                className="flex items-center justify-between px-3.5 py-2 text-[14px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors w-full"
                              >
                                <div className="flex items-center gap-3">
                                  <Star size={15} strokeWidth={1.5} fill={chat.starred ? '#F59E0B' : 'none'} className={chat.starred ? 'text-[#F59E0B]' : ''}/> 
                                  {chat.starred ? 'Unstar' : 'Star'}
                                </div>
                                <span className="text-[#8C8275] text-[12px]">P</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRenameChat(chat.id, chat.title); }}
                                className="flex items-center justify-between px-3.5 py-2 text-[14px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors w-full"
                              >
                                <div className="flex items-center gap-3"><Pencil size={15} strokeWidth={1.5}/> Rename</div>
                                <span className="text-[#8C8275] text-[12px]">R</span>
                              </button>
                              
                              <div className="relative w-full">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setIsSubmenuOpen(!isSubmenuOpen); }}
                                  className={`flex items-center justify-between px-3.5 py-2 text-[14px] transition-colors w-full ${isSubmenuOpen ? 'bg-[#F2F2F2] text-[#1F1F1F]' : 'text-[#1F1F1F] hover:bg-[#F2F2F2]'}`}
                                >
                                  <div className="flex items-center gap-3"><Folder size={15} strokeWidth={1.5}/> Change project</div>
                                  <ChevronRight size={14} className="text-[#8C8275]" />
                                </button>
                                
                                <AnimatePresence>
                                  {isSubmenuOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -5 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute right-[calc(100%+4px)] top-0 w-[240px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] py-2 z-[110] flex flex-col overflow-hidden"
                                    >
                                      <div className="px-3 pb-2 mb-1 border-b border-[#E9E2D7]">
                                        <div className="flex items-center gap-2">
                                          <Search size={14} className="text-[#8C8275]" />
                                          <input 
                                            type="text" 
                                            placeholder="Search projects" 
                                            value={projectSearch}
                                            onChange={(e) => setProjectSearch(e.target.value)}
                                            className="w-full bg-transparent outline-none text-[13.5px] text-[#1F1F1F] placeholder:text-[#A8A096]"
                                            autoFocus
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-[200px] overflow-y-auto">
                                        {allProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(p => (
                                          <button 
                                            key={p.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleChangeProject(chat.id, p.id);
                                            }}
                                            className="flex items-center justify-between w-full text-left px-3.5 py-2 text-[13.5px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors truncate"
                                          >
                                            <span className="truncate">{p.name}</span>
                                            {p.id === project.id && <Check size={14} className="text-[#4285f4] flex-shrink-0" />}
                                          </button>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveFromProject(chat.id); }}
                                className="flex items-center justify-between px-3.5 py-2 text-[14px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors w-full"
                              >
                                <div className="flex items-center gap-3"><FolderMinus size={15} strokeWidth={1.5}/> Remove from project</div>
                              </button>
                              
                              <div className="mx-2 my-1 border-t border-[#E9E2D7]" />
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                                className="flex items-center justify-between px-3.5 py-2 text-[14px] text-[#C4342D] hover:bg-[#FEF2F2] transition-colors w-full"
                              >
                                <div className="flex items-center gap-3"><Trash2 size={15} strokeWidth={1.5}/> Delete</div>
                                <span className="text-[#C4342D]/70 text-[12px]">D</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {projectChats.length === 0 && (
              <div className="text-center py-10 text-[#8C8275] text-[14.5px]">
                No chats in this project yet. Start a new chat above!
              </div>
            )}
            </div>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {renameModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-[16px] p-6 shadow-xl w-full max-w-[420px] flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-[20px] font-bold text-[#111111]">Rename chat</h2>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') {
                    setRenameModalOpen(false);
                    setChatToRename(null);
                  }
                }}
                className="w-full border border-[#4285f4] rounded-[8px] px-3.5 py-2.5 text-[15px] text-[#1F1F1F] outline-none"
                autoFocus
                onFocus={(e) => e.target.select()}
              />
              <div className="flex justify-end gap-3 mt-1">
                <button
                  onClick={() => {
                    setRenameModalOpen(false);
                    setChatToRename(null);
                  }}
                  className="px-4 py-2 rounded-[8px] border border-[#E9E2D7] text-[14px] font-medium text-[#111111] hover:bg-[#F2F2F2] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRename}
                  className="px-5 py-2 rounded-[8px] bg-[#111111] text-white text-[14px] font-medium hover:bg-black transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
