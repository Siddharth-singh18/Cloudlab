import React, { useMemo, useState, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Folder, GitBranch, Clock, Users, ArrowRight, Search, Zap, Globe, Copy, Code, Bell, Settings, LogOut, Upload, Cloud, LayoutDashboard } from 'lucide-react'
import { projectsApi, authApi } from '../lib/api'
import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'

const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3b82f6',
  JavaScript: '#f59e0b',
  'Node.js': '#22c55e',
  React: '#38bdf8',
  Python: '#a78bfa',
  Go: '#34d399',
  Workspace: '#64748b',
}

function AvatarDropdown() {
  const { currentUser, setCurrentUser, resetWorkspaceState } = useStore(useShallow(state => ({
    currentUser: state.currentUser,
    setCurrentUser: state.setCurrentUser,
    resetWorkspaceState: state.resetWorkspaceState
  })))
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      try {
        const updatedUser = await authApi.updateAvatar(base64)
        setCurrentUser(updatedUser)
        setOpen(false)
      } catch (err) {
        alert("Failed to upload avatar")
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = async () => {
    await authApi.logout()
    resetWorkspaceState()
    setCurrentUser(null)
    navigate('/')
  }

  if (!currentUser) return null

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="focus:outline-none rounded-full ring-2 ring-transparent hover:ring-blue-500/50 transition-all">
        {currentUser.avatar ? (
          <img src={currentUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-white/10">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[#161b22] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/5">
            <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
            <div className="text-xs text-[#7d8590] truncate">{currentUser.email}</div>
          </div>
          <div className="py-1">
            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm text-[#e6edf3] hover:bg-white/5 flex items-center gap-2">
              <Upload size={14} /> Change Photo
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lang, setLang] = useState('Node.js')
  const [isPublic, setIsPublic] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createProject = useMutation({
    mutationFn: () => projectsApi.create({
      name: name.trim(),
      description: description.trim() || undefined,
      language: 'Workspace',
      isPublic,
    }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
      navigate(`/ide/${project.id}`)
    },
  })

  const create = () => {
    if (!name.trim()) return
    createProject.mutate()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Create New Workspace</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#7d8590] mb-1.5 block">Project Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. cloudlab-app"
              className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-[#7d8590] mb-1.5 block">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description…"
              className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-white/10 bg-[#161b22] text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm text-[#e6edf3]">Make public</span>
          </label>
        </div>

        <div className="flex gap-3 justify-end mt-8">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#7d8590] hover:text-white transition-colors">Cancel</button>
          <button 
            onClick={create} 
            disabled={!name.trim() || createProject.isPending}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {createProject.isPending ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { currentUser } = useStore(useShallow(state => ({ currentUser: state.currentUser })))
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const isAuth = !!(token || currentUser)

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  })

  const cloneProject = useMutation({
    mutationFn: (projectId: string) => projectsApi.clone(projectId),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/ide/${project.id}`)
    },
  })

  const filtered = useMemo(() => {
    const projects = projectsQuery.data || []
    const term = search.toLowerCase()
    return projects.filter((project: any) =>
      project.name.toLowerCase().includes(term) ||
      (project.description || '').toLowerCase().includes(term)
    )
  }, [projectsQuery.data, search])

  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-[#e6edf3] font-sans">
      <nav className="border-b border-white/5 px-4 md:px-8 py-4 flex items-center gap-4 md:gap-10 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="font-bold text-lg text-white">CloudLab</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#" className="text-[#7d8590] hover:text-white transition-colors">Dashboard</a>
          <a href="#" className="text-white border-b-2 border-blue-500 pb-1">Projects</a>
          <a href="#" className="text-[#7d8590] hover:text-white transition-colors">Templates</a>
          <a href="#" className="text-[#7d8590] hover:text-white transition-colors">Activity</a>
          <a href="#" className="text-[#7d8590] hover:text-white transition-colors">Settings</a>
        </div>

        <div className="flex-1" />
        
        <div className="flex items-center gap-5">
          <Search size={18} className="text-[#7d8590] cursor-pointer hover:text-white transition-colors" />
          <div className="relative cursor-pointer hover:text-white transition-colors">
            <Bell size={18} className="text-[#7d8590]" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-[#070b14]">3</span>
          </div>
          <AvatarDropdown />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 md:mt-10">
        <div className="relative w-full rounded-2xl overflow-hidden bg-[#0d1326] border border-blue-500/20 shadow-2xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
          
          <div className="relative z-10 max-w-lg text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <Zap size={12} className="fill-blue-400" /> Built for developers
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
              CloudLab <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Cloud</span>
            </h1>
            <p className="text-[15px] text-[#7d8590] leading-relaxed mb-8 font-medium">
              Next-generation cloud development environment. Code, collaborate in real-time, and deploy instantly straight from your browser.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center"><Users size={12} className="text-blue-400" /></div>
                  Real-time Collaboration
                </div>
                <div className="text-xs text-[#7d8590] pl-8">Code together seamlessly</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <div className="w-6 h-6 bg-purple-500/10 rounded flex items-center justify-center"><Zap size={12} className="text-purple-400" /></div>
                  Instant Deployments
                </div>
                <div className="text-xs text-[#7d8590] pl-8">Deploy in one click</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <div className="w-6 h-6 bg-indigo-500/10 rounded flex items-center justify-center"><Settings size={12} className="text-indigo-400" /></div>
                  Secure & Scalable
                </div>
                <div className="text-xs text-[#7d8590] pl-8">Enterprise-grade security</div>
              </div>
            </div>
          </div>

          <div className="lg:block relative z-10 md:mr-10">
             <button onClick={() => setShowNew(true)} className="absolute -top-6 -right-6 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all">
                <Plus size={16} /> New project
             </button>
             {/* Decorative graphic */}
             <div className="w-80 h-80 relative group cursor-pointer transition-transform duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full group-hover:bg-purple-500/30 transition-colors" />
                <div className="w-full h-full border border-blue-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)] relative z-10 overflow-hidden">
                  <img src="/cloud-hero.png" alt="Futuristic Cloud" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-12 mb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Workspaces</h2>
            <p className="text-sm text-[#7d8590] mt-1">All the projects you're working on right now.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="w-64 bg-[#161b22] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#7d8590] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex bg-[#161b22] border border-white/5 rounded-lg p-1">
              <div className="px-2 py-1 bg-blue-600 rounded text-white shadow-sm cursor-pointer"><LayoutDashboard size={14} /></div>
              <div className="px-2 py-1 text-[#7d8590] hover:text-white cursor-pointer"><Settings size={14} /></div>
            </div>
          </div>
        </div>

        {projectsQuery.isLoading ? (
          <div className="p-8 text-center text-[#7d8590] border border-white/5 rounded-2xl bg-[#0d1117]">
            Loading projects…
          </div>
        ) : projectsQuery.isError ? (
          <div className="p-8 text-center text-red-400 border border-red-500/20 rounded-2xl bg-red-500/5">
            Could not load projects. Please check the API server.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center border border-white/5 rounded-2xl bg-[#0d1117] flex flex-col items-center">
            <Folder size={48} className="text-[#7d8590] mb-4 opacity-50" />
            <p className="text-white font-medium text-lg">No projects yet</p>
            <p className="text-[#7d8590] text-sm mt-1 mb-6">Create a workspace and start building in the browser.</p>
            <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project: any) => {
              const isPublicCloneTarget = project.isPublic && !project.currentUserRole

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group bg-[#0d1117] border border-white/5 hover:border-purple-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-[200px] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-transparent group-hover:via-purple-500/50 transition-all" />
                  
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Folder size={20} className="text-blue-400 fill-blue-400/20" />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-purple-300 transition-colors truncate text-sm flex items-center gap-2">
                          {project.name} {project.isPublic && <Globe size={12} className="text-[#7d8590]" />}
                        </div>
                        <div className="text-[11px] text-[#7d8590] mt-0.5">Updated {new Date(project.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#161b22] border border-white/5"
                        style={{ color: LANG_COLOR[project.language] || '#22c55e' }}
                      >
                        {project.language}
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-[#7d8590] mb-auto leading-relaxed line-clamp-2">
                    {project.description || 'no description provided'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-[#7d8590] mt-4 mb-3">
                    <span className="flex items-center gap-1.5">
                      <GitBranch size={12} />
                      <span className="font-mono">{project.isExternalClone ? 'clone' : 'main'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={12} /> {project.collaborators?.length || 0}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#161b22] border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                        {project.owner?.name?.charAt(0) || 'A'}
                      </div>
                      <span className="text-[11px] text-[#7d8590] font-medium">
                        {project.currentUserRole ? `${project.currentUserRole.toLowerCase()} access` : 'Public review'}
                      </span>
                    </div>
                    
                    {isPublicCloneTarget ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          cloneProject.mutate(project.id)
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-[#7d8590] hover:text-white"
                        disabled={cloneProject.isPending}
                      >
                        <Copy size={12} /> Clone
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/ide/${project.id}`)
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
                      >
                        <Code size={12} /> Open IDE
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
