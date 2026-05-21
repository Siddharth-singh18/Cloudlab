import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { filesApi, projectsApi, projectReviewApi, reviewApi } from '../lib/api'
import { useJoinRoom } from '../hooks/useSocket'
import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import { TopBar } from '../components/TopBar/TopBar'
import { Sidebar } from '../components/Sidebar/Sidebar'
import { Editor } from '../components/Editor/Editor'
import { DiffView } from '../components/Editor/DiffView'
import { PreviewPane } from '../components/Editor/PreviewPane'
import { TerminalPanel } from '../components/Terminal/TerminalPanel'
import { ReviewPanel } from '../components/ReviewPanel/ReviewPanel'

function WorkspaceLoader({ projectId }: { projectId?: string }) {
  const {
    activeView,
    bottomPanelOpen,
    currentUser,
    setCurrentProject,
    setFileTree,
    setComments,
    setSuggestions,
    setCurrentReview,
    resetWorkspaceState,
    mobileActivePanel,
    setMobileActivePanel,
  } = useStore(useShallow(state => ({
    activeView: state.activeView,
    bottomPanelOpen: state.bottomPanelOpen,
    currentUser: state.currentUser,
    setCurrentProject: state.setCurrentProject,
    setFileTree: state.setFileTree,
    setComments: state.setComments,
    setSuggestions: state.setSuggestions,
    setCurrentReview: state.setCurrentReview,
    resetWorkspaceState: state.resetWorkspaceState,
    mobileActivePanel: state.mobileActivePanel,
    setMobileActivePanel: state.setMobileActivePanel,
  })))
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  if (!token && !currentUser) {
    return <Navigate to="/login" replace state={{ next: projectId ? `/ide/${projectId}` : '/projects' }} />
  }

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: Boolean(projectId),
  })

  const treeQuery = useQuery({
    queryKey: ['fileTree', projectId],
    queryFn: () => filesApi.tree(projectId!),
    enabled: Boolean(projectId),
  })

  const projectCommentsQuery = useQuery({
    queryKey: ['project-comments', projectId],
    queryFn: () => projectReviewApi.comments(projectId!),
    enabled: Boolean(projectId),
  })

  const projectSuggestionsQuery = useQuery({
    queryKey: ['project-suggestions', projectId],
    queryFn: () => projectReviewApi.suggestions(projectId!),
    enabled: Boolean(projectId),
  })

  const reviewsQuery = useQuery({
    queryKey: ['reviews', projectId],
    queryFn: () => reviewApi.list(projectId!),
    enabled: Boolean(projectId),
  })

  useEffect(() => {
    resetWorkspaceState()
  }, [projectId, resetWorkspaceState])

  useEffect(() => {
    if (projectQuery.data) setCurrentProject(projectQuery.data)
  }, [projectQuery.data, setCurrentProject])

  useEffect(() => {
    if (treeQuery.data) setFileTree(treeQuery.data)
  }, [treeQuery.data, setFileTree])

  useEffect(() => {
    if (projectCommentsQuery.data) setComments(projectCommentsQuery.data)
  }, [projectCommentsQuery.data, setComments])

  useEffect(() => {
    if (projectSuggestionsQuery.data) setSuggestions(projectSuggestionsQuery.data)
  }, [projectSuggestionsQuery.data, setSuggestions])

  useEffect(() => {
    if (reviewsQuery.data) setCurrentReview(reviewsQuery.data[0] || null)
  }, [reviewsQuery.data, setCurrentReview])

  useJoinRoom(projectId ? `project:${projectId}` : undefined)
  useJoinRoom(reviewsQuery.data?.[0]?.id ? `review:${reviewsQuery.data[0].id}` : undefined)

  const isLoading = projectQuery.isLoading || treeQuery.isLoading || projectCommentsQuery.isLoading || projectSuggestionsQuery.isLoading || reviewsQuery.isLoading
  const error = projectQuery.error || treeQuery.error || projectCommentsQuery.error || projectSuggestionsQuery.error || reviewsQuery.error

  if (!projectId) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-editor-bg select-none">
        <TopBar />
        <div className="flex flex-1 items-center justify-center text-editor-muted text-sm">
          Open a CloudLab project from the dashboard to start coding.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-editor-bg select-none">
        <TopBar />
        <div className="flex flex-1 items-center justify-center text-editor-muted text-sm">
          Loading CloudLab workspace…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-editor-bg select-none">
        <TopBar />
        <div className="flex flex-1 items-center justify-center text-red-300 text-sm px-6 text-center">
          Unable to load this workspace. Check your access or server connection and try again.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-editor-bg select-none">
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className={`absolute md:relative z-20 h-full w-[85%] max-w-[320px] md:w-auto bg-editor-surface md:bg-transparent border-r border-editor-border/50 shadow-2xl md:shadow-none transition-transform duration-300 ${mobileActivePanel === 'sidebar' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:flex`}>
          <Sidebar />
          {/* Mobile overlay close button */}
          {mobileActivePanel === 'sidebar' && (
            <button onClick={() => setMobileActivePanel('none')} className="md:hidden absolute top-3 right-3 text-editor-muted hover:text-white bg-editor-bg/80 p-1 rounded">
              ✕
            </button>
          )}
        </div>
        
        {/* Editor & Terminal */}
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeView === 'editor' && <Editor />}
            {activeView === 'preview' && <PreviewPane />}
            {activeView === 'diff' && <DiffView />}
          </div>
          {bottomPanelOpen && <TerminalPanel />}
        </div>
        
        {/* Review Panel */}
        <div className={`absolute right-0 md:relative z-20 h-full w-[90%] max-w-[400px] md:w-auto bg-editor-surface md:bg-transparent border-l border-editor-border/50 shadow-2xl md:shadow-none transition-transform duration-300 ${mobileActivePanel === 'review' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} md:flex`}>
          <ReviewPanel />
          {/* Mobile overlay close button */}
          {mobileActivePanel === 'review' && (
            <button onClick={() => setMobileActivePanel('none')} className="md:hidden absolute top-3 left-3 text-editor-muted hover:text-white bg-editor-bg/80 p-1 rounded z-50">
              ✕
            </button>
          )}
        </div>

        {/* Backdrop for mobile overlays */}
        {mobileActivePanel !== 'none' && (
           <div 
             className="absolute inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm"
             onClick={() => setMobileActivePanel('none')}
           />
        )}
      </div>
    </div>
  )
}

export function IDELayout() {
  const { id } = useParams()
  return <WorkspaceLoader projectId={id} />
}
