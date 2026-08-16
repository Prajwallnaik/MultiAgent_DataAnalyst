import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, MoreVertical, X, FolderPlus, Star, Pencil, Archive, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectDetail from './ProjectDetail';
import Tooltip from './ui/Tooltip';

// Helper for dynamic time formatting
const timeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(timestamp).toLocaleDateString();
};

export default function ProjectsPage({ onSelectChat, onViewingProjectChange, viewingProject, onStartProjectChat, onUploadClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [selectedProject, setSelectedProject] = useState(viewingProject || null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [sortBy, setSortBy] = useState('last_updated');
  const [sortOpen, setSortOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectGoal, setEditProjectGoal] = useState('');
  
  const [, setTimeTrigger] = useState(Date.now());

  // Update times dynamically
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTrigger(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Sync with parent breadcrumb navigation
  useEffect(() => {
    setSelectedProject(viewingProject || null);
  }, [viewingProject]);

  // Close menu on outside click
  useEffect(() => {
    const close = () => setActiveMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const [projects, setProjects] = useState(() => {
    try {
      const local = localStorage.getItem('dopeness_projects');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dopeness_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects', e);
    }
  }, [projects]);

  useEffect(() => {
    const handleProjectsUpdate = () => {
      try {
        const local = localStorage.getItem('dopeness_projects');
        if (local) setProjects(JSON.parse(local));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('projects_updated', handleProjectsUpdate);
    return () => window.removeEventListener('projects_updated', handleProjectsUpdate);
  }, []);

  const handleCreateProject = () => {
    if (!projectName.trim()) return;
    
    const newProject = {
      id: Date.now(),
      lastUpdated: Date.now(),
      name: projectName.trim(),
      goal: projectGoal.trim(),
      hasMenu: true,
      chats: []
    };
    
    setProjects([newProject, ...projects]);
    setIsModalOpen(false);
    setProjectName('');
    setProjectGoal('');
  };

  const handleUpdateProject = () => {
    if (!editProjectName.trim() || !editingProject) return;
    
    setProjects(prev => prev.map(p => p.id === editingProject.id ? { 
      ...p, 
      name: editProjectName.trim(),
      goal: editProjectGoal.trim(),
      lastUpdated: Date.now() 
    } : p));
    
    setIsEditModalOpen(false);
    setEditingProject(null);
    setEditProjectName('');
    setEditProjectGoal('');
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    onViewingProjectChange?.(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    onViewingProjectChange?.(null);
  };

  if (selectedProject) {
    return (
      <ProjectDetail 
        project={selectedProject} 
        onBack={() => {
          setSelectedProject(null);
          onViewingProjectChange?.(null);
        }}
        onChatSelect={onSelectChat}
        onStartProjectChat={onStartProjectChat}
        onUploadClick={onUploadClick}
      />
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex flex-col w-full h-full bg-[#FCFCFC] overflow-y-auto px-8 py-10 md:px-24"
      >
        <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-10">
          {/* Header Section */}
          <div className="flex items-center justify-between w-full mt-4">
            <h1 
              className="text-[32px] font-medium text-[#1F1F1F] tracking-tight"
              style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif', letterSpacing: '-0.02em' }}
            >
              Projects
            </h1>

            <div className="flex items-center gap-3">
              {isSearchOpen ? (
                <div className="flex items-center gap-2 pl-3 pr-2 py-1 rounded-full border border-[#4285f4] bg-white w-[260px] shadow-sm transition-all">
                  <Search size={18} className="text-[#8C8275] flex-shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none border-none ring-0 focus:ring-0 focus:outline-none text-[14px] text-[#1F1F1F] placeholder:text-[#8C8275] min-w-0"
                  />
                  <Tooltip content="Close search" position="bottom">
                    <button 
                      onClick={() => {
                        setProjectSearch('');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-[#F2F2F2] text-[#68625B] hover:text-[#1F1F1F] transition-colors cursor-pointer flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </Tooltip>
                </div>
              ) : (
                <Tooltip content="Search projects" position="bottom">
                  <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#E9E2D7] text-[#8C8275] hover:bg-[#F2F2F2] hover:text-[#1F1F1F] transition-colors cursor-pointer"
                  >
                    <Search size={16} />
                  </button>
                </Tooltip>
              )}
              
              <div className="relative">
                <button 
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9E2D7] text-[13px] font-normal text-[#68625B] hover:bg-[#F2F2F2] hover:text-[#1F1F1F] transition-colors cursor-pointer"
                >
                  Sort by <span className="text-[#1F1F1F] font-medium">{sortBy === 'last_updated' ? 'Last updated' : sortBy === 'date_created' ? 'Date created' : 'Alphabetical'}</span>
                  <ChevronDown size={14} className="opacity-70" />
                </button>

                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-10 w-[185px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] py-1.5 z-50 flex flex-col"
                    >
                      {[
                        { key: 'last_updated', label: 'Last updated' },
                        { key: 'date_created', label: 'Date created' },
                        { key: 'alphabetical', label: 'Alphabetical' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                          className="flex items-center justify-between px-3.5 py-2 text-[14px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                        >
                          <span>{opt.label}</span>
                          {sortBy === opt.key && <Check size={16} className="text-[#4285f4]" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#333333] text-[#F9F9F9] text-[13px] font-medium transition-colors cursor-pointer shadow-sm"
              >
                New project
              </button>
            </div>
          </div>

          {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <FolderPlus size={48} className="text-[#8C8275] mb-4" strokeWidth={1} />
            <h3 className="text-[16px] font-medium text-[#1F1F1F]">No projects yet</h3>
            <p className="text-[14px] text-[#8C8275] mt-1">Create your first project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...projects]
              .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
              .sort((a, b) => {
              if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
              if (sortBy === 'date_created') return (b.id || 0) - (a.id || 0);
              
              // last_updated fallback to id for old projects
              const aTime = a.lastUpdated || a.id || 0;
              const bTime = b.lastUpdated || b.id || 0;
              return bTime - aTime;
            }).map((project) => (
              <div 
                key={project.id} 
                onClick={() => handleSelectProject(project)}
                className="flex flex-col justify-between p-4 bg-white border border-[#E9E2D7] rounded-[14px] hover:border-[#D0C7BA] hover:shadow-sm transition-all cursor-pointer min-h-[104px] relative"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-[15px] font-medium text-[#1F1F1F]">{project.name}</h3>
                    <div className="relative">
                      <Tooltip content="Project options" position="top-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === project.id ? null : project.id); }}
                          className="text-[#8C8275] hover:text-[#1F1F1F] p-1 rounded-md hover:bg-[#F2F2F2] transition-colors cursor-pointer -mt-1 -mr-1"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </Tooltip>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {activeMenuId === project.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 w-[170px] bg-white border border-[#E9E2D7] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] py-1.5 z-50 flex flex-col"
                          >
                            <button 
                              onClick={() => {
                                setEditingProject(project);
                                setEditProjectName(project.name);
                                setEditProjectGoal(project.goal || '');
                                setIsEditModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-3 px-3.5 py-2 text-[14px] text-[#1F1F1F] hover:bg-[#F2F2F2] transition-colors cursor-pointer"
                            >
                              <Pencil size={16} className="text-[#1F1F1F]" />
                              <span>Edit details</span>
                            </button>
                            <button 
                              onClick={() => {
                                setProjects(prev => prev.filter(p => p.id !== project.id));
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-3 px-3.5 py-2 text-[14px] text-[#C4342D] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} className="text-[#C4342D]" />
                              <span>Delete</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {project.goal && (
                    <p className="text-[14.5px] text-[#4A453F] line-clamp-2 leading-relaxed">
                      {project.goal}
                    </p>
                  )}
                </div>
                <span className="text-[13px] font-normal text-[#8C8275] mt-4">
                  {timeAgo(project.lastUpdated || project.id)}
                </span>
              </div>
            ))}
          </div>
        )}
        </div>
      </motion.div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative w-full max-w-[560px] bg-white rounded-[16px] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#1F1F1F] tracking-tight">Create a project</h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-[#8C8275] hover:bg-[#F2F2F2] hover:text-[#1F1F1F] p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {/* Form */}
              <div className="px-6 pb-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium text-[#1F1F1F]">What are you working on?</label>
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Name your project" 
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9E2D7] rounded-xl outline-none focus:border-[#4285f4] focus:ring-[3px] focus:ring-[#4285f4]/15 transition-all text-[14.5px] text-[#1F1F1F] placeholder:text-[#A8A096]" 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                    }}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-medium text-[#1F1F1F]">What are you trying to achieve?</label>
                  <textarea 
                    value={projectGoal}
                    onChange={(e) => setProjectGoal(e.target.value)}
                    placeholder="Describe your project, goals, subject, etc..." 
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9E2D7] rounded-xl outline-none focus:border-[#4285f4] focus:ring-[3px] focus:ring-[#4285f4]/15 transition-all text-[14.5px] text-[#1F1F1F] placeholder:text-[#A8A096] min-h-[120px] resize-y" 
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-5 flex items-center justify-end gap-2.5 bg-white">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-[14px] font-medium text-[#1F1F1F] hover:bg-[#F2F2F2] rounded-xl border border-[#E9E2D7] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateProject}
                  disabled={!projectName.trim()}
                  className={`px-4 py-2 text-white text-[14px] font-medium rounded-xl transition-colors cursor-pointer ${
                    projectName.trim() ? 'bg-[#1F1F1F] hover:bg-[#333333]' : 'bg-[#EAE5DC] text-[#8C8275] cursor-not-allowed opacity-70'
                  }`}
                >
                  Create project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative w-full max-w-[560px] bg-white rounded-[16px] shadow-2xl flex flex-col overflow-hidden p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[22px] font-semibold text-[#1F1F1F] tracking-tight">Edit details</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="text-[#8C8275] hover:bg-[#F2F2F2] hover:text-[#1F1F1F] p-1.5 rounded-lg transition-colors cursor-pointer -mr-2"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {/* Form */}
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14.5px] font-medium text-[#1F1F1F]">Name</label>
                  <input 
                    type="text" 
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    placeholder="Project name" 
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-white border border-[#4285f4] rounded-[10px] outline-none text-[15px] text-[#1F1F1F] shadow-[0_0_0_1px_rgba(66,133,244,0.2)]" 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateProject();
                    }}
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14.5px] font-medium text-[#1F1F1F]">Description</label>
                  <textarea 
                    value={editProjectGoal}
                    onChange={(e) => setEditProjectGoal(e.target.value)}
                    className="w-full h-[120px] px-3.5 py-3 bg-white border border-[#E9E2D7] rounded-[10px] outline-none focus:border-[#4285f4] focus:ring-[3px] focus:ring-[#4285f4]/15 transition-all resize-none text-[15px] text-[#1F1F1F] placeholder:text-[#A8A096]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-8">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-[14.5px] font-medium text-[#1F1F1F] bg-white border border-[#E9E2D7] hover:bg-[#F9F9F9] hover:border-[#D0C7BA] transition-all cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProject}
                  disabled={!editProjectName.trim()}
                  className="px-5 py-2 rounded-lg bg-[#1F1F1F] hover:bg-[#333333] text-white text-[14.5px] font-medium transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
