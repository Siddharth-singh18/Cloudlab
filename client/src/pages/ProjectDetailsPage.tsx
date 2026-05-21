import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Folder, File, Code, Terminal, ArrowLeft, GitCommit, GitPullRequest, History, FileText } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { projectsApi, filesApi } from '../lib/api'
import { FileNode } from '../types'

type TabType = 'files' | 'commits' | 'prs' | 'history'

export function ProjectDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('files')
  const [activeFile, setActiveFile] = useState<string | null>(null)

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: fileTree, isLoading: treeLoading } = useQuery<FileNode[]>({
    queryKey: ['fileTree', id],
    queryFn: () => filesApi.tree(id!),
    enabled: !!id,
  })

  const { data: fileContent, isLoading: fileContentLoading } = useQuery({
    queryKey: ['fileContent', id, activeFile],
    queryFn: () => filesApi.read(id!, activeFile!).then(res => res.content),
    enabled: !!id && !!activeFile,
  })

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return (
      <div className="w-full">
        {nodes.map(node => (
          <div key={node.path} className="w-full group">
            <div 
              className="flex items-center gap-3 py-2.5 px-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-editor-border/20 last:border-0"
              style={{ paddingLeft: `${depth * 1.5 + 1.25}rem` }}
              onClick={() => {
                if (node.type === 'file') {
                  setActiveFile(node.path)
                }
              }}
            >
              {node.type === 'folder' ? (
                <Folder size={15} className="text-[#58a6ff] shrink-0" fill="currentColor" fillOpacity={0.2} />
              ) : (
                <File size={15} className="text-editor-muted shrink-0" />
              )}
              <span className={`text-[13px] font-medium tracking-wide ${
                node.type === 'file' 
                  ? 'text-editor-text group-hover:text-blue-400' 
                  : 'text-[#e6edf3]'
              }`}>
                {node.name}
              </span>
            </div>
            {node.children && renderTree(node.children, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  if (projectLoading || treeLoading) {
    return (
      <div className="min-h-screen bg-editor-bg flex items-center justify-center text-editor-muted">
        Loading workspace details...
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-editor-bg flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Project not found</h2>
        <button className="btn-ghost" onClick={() => navigate('/projects')}>Back to projects</button>
      </div>
    )
  }

  const tabs = [
    { id: 'files', label: 'Files', icon: Code },
    { id: 'commits', label: 'Commits', icon: GitCommit },
    { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'history', label: 'Version History', icon: History },
  ] as const

  return (
    <div className="min-h-screen bg-editor-bg flex flex-col">
      <nav className="border-b border-editor-border px-8 py-4 flex items-center gap-4 bg-editor-surface shadow-sm">
        <button 
          onClick={() => navigate('/projects')}
          className="text-editor-muted hover:text-editor-text transition-colors flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div className="h-4 w-px bg-editor-border" />
        <span className="font-bold text-editor-text">{project.name}</span>
        <div className="flex-1" />
        <button 
          onClick={() => navigate(`/ide/${project.id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-editor-bg rounded hover:bg-blue-400 transition-colors shadow-lg shadow-editor-accent/20 font-bold text-sm"
        >
          <Code size={16} /> Open with VS Code
        </button>
      </nav>

      <div className="w-full max-w-[1200px] mx-auto p-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-editor-text mb-2 tracking-tight">{project.name}</h1>
          <p className="text-editor-muted text-lg">{project.description || 'No description provided for this project.'}</p>
        </div>

        <div className="flex items-center gap-8 border-b border-editor-border mb-8">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setActiveFile(null)
                }}
                className={`flex items-center gap-2 pb-3 px-1 text-[15px] font-semibold border-b-[3px] transition-colors ${
                  activeTab === tab.id 
                    ? 'border-editor-accent text-editor-text' 
                    : 'border-transparent text-editor-muted hover:text-editor-text'
                }`}
              >
                <Icon size={18} className={activeTab === tab.id ? 'text-editor-accent' : ''} /> {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'files' && !activeFile && (
          <div className="bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/40 animate-fade_in overflow-hidden">
            <div className="bg-[#161b22] border-b border-editor-border px-6 py-4 flex items-center gap-2 text-sm text-editor-muted font-bold">
              <Terminal size={16} className="text-editor-accent" /> Repository Files
            </div>
            
            <div className="max-h-[700px] overflow-y-auto bg-[#0d1117] py-2">
              {fileTree && fileTree.length > 0 ? (
                renderTree(fileTree)
              ) : (
                <div className="p-12 text-center text-editor-muted text-lg">
                  This project is empty.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'files' && activeFile && (
          <div className="bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/40 animate-fade_in flex flex-col overflow-hidden">
            <div className="bg-[#161b22] border-b border-editor-border px-6 py-4 flex items-center gap-4 text-sm text-editor-muted font-bold">
              <button 
                onClick={() => setActiveFile(null)}
                className="hover:text-editor-text transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md"
              >
                <ArrowLeft size={16} /> Back to files
              </button>
              <div className="h-5 w-px bg-editor-border" />
              <div className="flex items-center gap-2 text-editor-text">
                <FileText size={16} className="text-editor-accent" /> {activeFile}
              </div>
            </div>
            
            <div className="bg-[#0d1117] min-h-[600px] flex flex-col relative">
              {fileContentLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse text-editor-muted font-mono">Loading content...</div>
                </div>
              ) : (
                <div className="h-[600px] w-full pt-4">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    path={activeFile}
                    value={fileContent}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      padding: { top: 8 },
                      lineNumbers: 'on',
                      renderWhitespace: 'none',
                      renderControlCharacters: false,
                      renderLineHighlight: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'commits' && (
          <div className="p-16 text-center bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/20 animate-fade_in mt-8">
            <div className="w-20 h-20 bg-editor-accent/10 text-editor-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <GitCommit size={40} />
            </div>
            <h3 className="text-2xl font-bold text-editor-text mb-3">No commits yet</h3>
            <p className="text-editor-muted text-lg">Open the IDE to start making changes and tracking history.</p>
          </div>
        )}

        {activeTab === 'prs' && (
          <div className="p-16 text-center bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/20 animate-fade_in mt-8">
            <div className="w-20 h-20 bg-editor-accent/10 text-editor-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <GitPullRequest size={40} />
            </div>
            <h3 className="text-2xl font-bold text-editor-text mb-3">No pull requests</h3>
            <p className="text-editor-muted text-lg">Invite collaborators and create a pull request to review code.</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-16 text-center bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/20 animate-fade_in mt-8">
            <div className="w-20 h-20 bg-editor-accent/10 text-editor-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <History size={40} />
            </div>
            <h3 className="text-2xl font-bold text-editor-text mb-3">No version history</h3>
            <p className="text-editor-muted text-lg">Automatic snapshots and labeled versions will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
