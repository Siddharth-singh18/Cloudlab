import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch, Eye, Code2, GitMerge, Zap, ChevronDown,
  Settings, ExternalLink, Bell, X, Check, MessageSquare,
  GitPullRequest, UserPlus, Clock, LogOut
} from 'lucide-react'
import { useStore } from '../../store'
import { useShallow } from 'zustand/react/shallow'
import { shortName, timeAgo } from '../../lib/utils'
import { notificationsApi, authApi } from '../../lib/api'

const USER_COLORS: Record<string, string> = {
  'user-rahul': '#f85149',
  'user-ananya': '#3fb950',
  'user-siddharth': '#ffa657',
  'user-you': '#58a6ff',
}

export function TopBar() {
  const {
    currentReview, presences, currentUser, currentProject, activeView, setActiveView, setMobileActivePanel
  } = useStore(useShallow(state => ({
    currentReview: state.currentReview,
    presences: state.presences,
    currentUser: state.currentUser,
    currentProject: state.currentProject,
    activeView: state.activeView,
    setActiveView: state.setActiveView,
    setMobileActivePanel: state.setMobileActivePanel
  })))
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30000,
  })

  const { data: unreadCount = { count: 0 } } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 15000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    },
  })

  const onlineCount = presences.length + 1
  const canMerge = currentProject?.permissions?.canMerge ?? true

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      console.error(e)
    } finally {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
  }

  return (
    <div className="h-10 bg-editor-surface border-b border-editor-border flex items-center justify-between px-3 gap-3 shrink-0 z-10 w-full overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => setMobileActivePanel('sidebar')} className="md:hidden text-editor-muted hover:text-white p-1">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <Link to="/projects" className="flex items-center gap-1.5 mr-1 shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-5 h-5 bg-editor-accent rounded flex items-center justify-center">
            <Zap size={12} className="text-editor-bg" />
          </div>
          <span className="text-xs font-semibold text-editor-text">CloudLab</span>
        </Link>

        {currentProject && (
          <div className="flex items-center gap-2 text-[11px] text-editor-muted min-w-0">
            <span className="text-editor-text font-medium truncate">{currentProject.name}</span>
            <span className="px-1.5 py-0.5 rounded border border-editor-border bg-editor-bg uppercase tracking-wide shrink-0">
              {currentProject.currentUserRole || 'viewer'}
            </span>
            {currentProject.isExternalClone && (
              <span className="px-1.5 py-0.5 rounded border border-editor-border bg-blue-500/10 text-blue-300 shrink-0">
                clone workspace
              </span>
            )}
          </div>
        )}

        {currentReview && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-editor-bg rounded border border-editor-border text-xs text-editor-muted shrink-0">
            <GitBranch size={11} />
            <span className="text-editor-text font-mono">{currentReview.branch}</span>
          </div>
        )}
      </div>

      <div className="flex items-center bg-editor-bg rounded border border-editor-border overflow-hidden justify-self-center">
        {[
          { id: 'editor', icon: Code2, label: 'Editor' },
          { id: 'preview', icon: Eye, label: 'Preview' },
          { id: 'diff', icon: GitMerge, label: 'Diff' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as 'editor' | 'preview' | 'diff')}
            className={`flex items-center gap-1 px-3 py-1 text-xs transition-colors ${
              activeView === id
                ? 'bg-editor-surface text-editor-text'
                : 'text-editor-muted hover:text-editor-text hover:bg-white/5'
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 min-w-0">
        {onlineCount > 0 && (
          <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center gap-1 text-[10px] text-editor-green">
            <span className="w-1.5 h-1.5 rounded-full bg-editor-green animate-pulse_dot" />
            Live · {onlineCount} online
          </span>
          <div className="flex items-center relative" ref={profileMenuRef}>
            {/* Current user avatar */}
            {currentUser && (
              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium border-2 border-editor-surface cursor-pointer hover:ring-1 hover:ring-editor-border transition-all"
                style={{ backgroundColor: currentUser.color + '30', color: currentUser.color, marginLeft: '-4px' }}
                title={currentUser.name}
              >
                {shortName(currentUser.name)}
              </div>
            )}
            
            {showProfileMenu && currentUser && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-editor-surface border border-editor-border rounded-lg shadow-2xl z-50 flex flex-col animate-fade_in">
                <div className="px-3 py-2 border-b border-editor-border">
                  <div className="text-xs font-semibold text-editor-text truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-editor-muted truncate">{currentUser.email}</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-white/5 transition-colors text-left"
                  >
                    <LogOut size={12} />
                    Log out
                  </button>
                </div>
              </div>
            )}
            {presences.slice(0, 3).map((p) => (
              <div
                key={p.userId}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium border-2 border-editor-surface"
                style={{
                  backgroundColor: (USER_COLORS[p.userId] || p.user.color) + '30',
                  color: USER_COLORS[p.userId] || p.user.color,
                  marginLeft: '-4px',
                }}
                title={p.user.name}
              >
                {shortName(p.user.name)}
              </div>
            ))}
          </div>
          </div>
        )}

        {currentReview?.previewUrl && (
          <a
            href={currentReview.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-editor-muted hover:text-editor-text border border-editor-border rounded transition-colors shrink-0"
          >
            <ExternalLink size={11} />
            Preview
          </a>
        )}

        {currentReview && (
          <button
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            disabled={!canMerge}
          >
            <GitMerge size={12} />
            {canMerge ? 'Merge' : 'Owner merge only'}
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="sidebar-icon w-7 h-7 shrink-0 relative"
          >
            <Bell size={14} />
            {unreadCount.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                {unreadCount.count > 9 ? '9+' : unreadCount.count}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-editor-surface border border-editor-border rounded-lg shadow-2xl z-50 max-h-96 flex flex-col animate-fade_in">
              <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
                <span className="text-xs font-semibold text-editor-text">Notifications</span>
                {unreadCount.count > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-[10px] text-editor-accent hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-editor-muted hover:text-editor-text"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-editor-muted text-xs">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n: any) => (
                    <div
                      key={n.id}
                      className={`px-3 py-2 border-b border-editor-border/50 hover:bg-white/5 cursor-pointer ${!n.read ? 'bg-editor-accent/5' : ''}`}
                      onClick={() => {
                        if (!n.read) markReadMutation.mutate(n.id)
                        if (n.link) window.location.href = n.link
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">
                          {n.type === 'COMMENT' && <MessageSquare size={12} className="text-blue-400" />}
                          {n.type === 'PR_OPENED' && <GitPullRequest size={12} className="text-green-400" />}
                          {n.type === 'PR_MERGED' && <GitPullRequest size={12} className="text-purple-400" />}
                          {n.type === 'MENTION' && <UserPlus size={12} className="text-yellow-400" />}
                          {n.type === 'VERSION_RESTORED' && <Clock size={12} className="text-editor-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-editor-text truncate">{n.title}</p>
                          <p className="text-[10px] text-editor-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-editor-accent rounded-full shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="sidebar-icon w-7 h-7 shrink-0 hidden md:flex">
          <Settings size={14} />
        </button>
        
        <button onClick={() => setMobileActivePanel('review')} className="md:hidden text-editor-muted hover:text-white p-1 ml-1">
           <MessageSquare size={16} />
        </button>
      </div>

      {/* Merge modal */}
      {showMergeModal && (
        <MergeModal onClose={() => setShowMergeModal(false)} />
      )}
    </div>
  )
}

function MergeModal({ onClose }: { onClose: () => void }) {
  const { comments, suggestions } = useStore(useShallow(state => ({
    comments: state.comments,
    suggestions: state.suggestions
  })))
  const openComments = comments.filter((c) => !c.resolved).length
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending').length

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-editor-surface border border-editor-border rounded-xl p-6 w-96 shadow-2xl animate-fade_in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-editor-text mb-1">Merge review</h2>
        <p className="text-xs text-editor-muted mb-4">
          Merge <span className="font-mono text-editor-accent">feature/auth-refactor</span> into <span className="font-mono">main</span>
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs p-2 rounded bg-editor-bg">
            <span className="text-editor-muted">Open comments</span>
            <span className={openComments > 0 ? 'text-yellow-400' : 'text-editor-green'}>
              {openComments > 0 ? `${openComments} unresolved` : 'All resolved ✓'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs p-2 rounded bg-editor-bg">
            <span className="text-editor-muted">Pending suggestions</span>
            <span className={pendingSuggestions > 0 ? 'text-yellow-400' : 'text-editor-green'}>
              {pendingSuggestions > 0 ? `${pendingSuggestions} pending` : 'None ✓'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs p-2 rounded bg-editor-bg">
            <span className="text-editor-muted">Build status</span>
            <span className="text-editor-green">Passed ✓</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <GitMerge size={13} />
            Confirm merge
          </button>
        </div>
      </div>
    </div>
  )
}
