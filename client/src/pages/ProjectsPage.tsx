import React, { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Folder, GitBranch, Clock, Users, ArrowRight, Search, Zap, Globe, Copy } from 'lucide-react'
import { filesApi, projectsApi } from '../lib/api'
import { useStore } from '../store'

const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3b82f6',
  JavaScript: '#f59e0b',
  'Node.js': '#22c55e',
  React: '#38bdf8',
  Python: '#a78bfa',
  Go: '#34d399',
}

const FRAMEWORK_OPTIONS = [
  { label: 'React', hint: 'Best for Vite + React app' },
  { label: 'TypeScript', hint: 'Blank TS workspace' },
  { label: 'JavaScript', hint: 'Blank JS workspace' },
  { label: 'Node.js', hint: 'Backend or scripts' },
  { label: 'Python', hint: 'Python workspace' },
  { label: 'Go', hint: 'Go workspace' },
]

async function bootstrapProject(projectId: string, language: string, name: string) {
  const projectName = name.trim() || 'cloudlab-project'
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cloudlab-project'

  if (language === 'JavaScript' || language === 'Node.js') {
    await filesApi.create(projectId, 'package.json', 'file').catch(() => null)
    await filesApi.write(
      projectId,
      'package.json',
      JSON.stringify(
        {
          name: safeName,
          version: '1.0.0',
          private: true,
          type: 'commonjs',
          scripts: {
            dev: 'node index.js',
            start: 'node index.js',
          },
        },
        null,
        2
      ) + '\n'
    )
    return
  }

  if (language === 'React') {
    await filesApi.create(projectId, 'package.json', 'file').catch(() => null)
    await filesApi.write(
      projectId,
      'package.json',
      JSON.stringify(
        {
          name: safeName,
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
        },
        null,
        2
      ) + '\n'
    )
    await filesApi.create(projectId, '.gitignore', 'file').catch(() => null)
    await filesApi.write(projectId, '.gitignore', 'node_modules\ndist\n.env\n')
  }
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lang, setLang] = useState('TypeScript')
  const [isPublic, setIsPublic] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createProject = useMutation({
    mutationFn: () => projectsApi.create({
      name: name.trim(),
      description: description.trim() || undefined,
      language: lang,
      isPublic,
    }),
    onSuccess: async (project) => {
      await bootstrapProject(project.id, lang, name)
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-editor-surface border border-editor-border rounded-xl p-6 w-[28rem] shadow-2xl animate-fade_in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-editor-text mb-4">New CloudLab project</h2>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-editor-muted mb-1 block">Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cloudlab-app"
              className="input w-full"
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
          </div>
          <div>
            <label className="text-[11px] text-editor-muted mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are we building?"
              className="input w-full h-20 resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-editor-muted mb-1 block">Language / Framework</label>
            <div className="grid grid-cols-2 gap-2">
              {FRAMEWORK_OPTIONS.map((option) => {
                const selected = lang === option.label
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setLang(option.label)}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                      selected
                        ? 'border-editor-accent bg-editor-accent/10 text-editor-text'
                        : 'border-editor-border bg-editor-bg text-editor-muted hover:text-editor-text hover:border-editor-accent/40'
                    }`}
                  >
                    <div className="text-[11px] font-medium">{option.label}</div>
                    <div className="text-[10px] mt-1 opacity-80">{option.hint}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-editor-muted">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Make project public so externals can clone and raise PRs
          </label>
          {createProject.isError && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(createProject.error as any)?.response?.data?.error || 'Project creation failed. Check the API server and database.'}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={create}
            disabled={!name.trim() || createProject.isPending}
          >
            {createProject.isPending ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { currentUser } = useStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token && !currentUser) {
    return <Navigate to="/login" replace state={{ next: '/projects' }} />
  }

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

  return (
    <div className="min-h-screen bg-editor-bg text-editor-text">
      <nav className="border-b border-editor-border px-8 py-4 flex items-center gap-3">
        <div
          className="w-7 h-7 bg-editor-accent rounded-lg flex items-center justify-center cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Zap size={16} className="text-editor-bg" />
        </div>
        <span className="font-semibold text-editor-text cursor-pointer" onClick={() => navigate('/')}>
          CloudLab
        </span>
        <span className="text-editor-border mx-1">/</span>
        <span className="text-editor-muted text-sm">Projects</span>
        <div className="flex-1" />
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> New project
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Your CloudLab projects</h1>
            <p className="text-sm text-editor-muted mt-1">Your project. Your cloud. Your team.</p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="input pl-8 w-56"
            />
          </div>
        </div>

        {projectsQuery.isLoading ? (
          <div className="p-8 text-center text-editor-muted border border-editor-border rounded-xl bg-editor-surface">
            Loading projects…
          </div>
        ) : projectsQuery.isError ? (
          <div className="p-8 text-center text-red-300 border border-red-500/20 rounded-xl bg-red-500/5">
            Could not load projects. Please check the API server and sign-in state.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center border border-editor-border rounded-xl bg-editor-surface">
            <p className="text-editor-text font-medium">No projects yet</p>
            <p className="text-editor-muted text-sm mt-1">Create a workspace and start building in the browser.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((project: any) => {
              const isPublicCloneTarget = project.isPublic && !project.currentUserRole

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/ide/${project.id}`)}
                  className="p-5 bg-editor-surface border border-editor-border rounded-xl hover:border-editor-accent/40 cursor-pointer transition-all group hover:shadow-lg hover:shadow-editor-accent/5"
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder size={16} className="text-yellow-400 shrink-0" />
                      <span className="font-medium text-editor-text group-hover:text-editor-accent transition-colors truncate">
                        {project.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {project.isPublic && <Globe size={13} className="text-blue-300" />}
                      <div
                        className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{
                          color: LANG_COLOR[project.language] || '#888',
                          borderColor: (LANG_COLOR[project.language] || '#888') + '40',
                          backgroundColor: (LANG_COLOR[project.language] || '#888') + '10',
                        }}
                      >
                        {project.language}
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-editor-muted mb-3 leading-relaxed min-h-[2.5rem]">
                    {project.description || 'No description yet.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-editor-muted">
                    <span className="flex items-center gap-1">
                      <GitBranch size={11} />
                      <span className="font-mono">{project.isExternalClone ? 'clone-workspace' : 'main'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {project.collaborators?.length || 0}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock size={11} /> {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-editor-border flex items-center justify-between gap-2">
                    <span className="text-[11px] text-editor-muted">
                      {project.currentUserRole ? `${project.currentUserRole.toLowerCase()} access` : 'Public review access'}
                    </span>
                    {isPublicCloneTarget ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          cloneProject.mutate(project.id)
                        }}
                        className="btn-ghost flex items-center gap-1 text-[11px]"
                        disabled={cloneProject.isPending}
                      >
                        <Copy size={12} /> Clone
                      </button>
                    ) : (
                      <ArrowRight size={13} className="text-editor-muted group-hover:text-editor-accent transition-colors" />
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
