import React, { useState } from 'react'
import { MessageSquare, Clock, Hash, ChevronRight, GitPullRequest } from 'lucide-react'
import { useStore } from '../../store'
import { ReviewComments } from './ReviewComments'
import { ReviewTimeline } from './ReviewTimeline'
import { ReviewPRList } from './ReviewPRList'
import { ReviewChat } from './ReviewChat'

const TABS = [
  { id: 'review',   label: 'Review',   icon: <MessageSquare size={12} /> },
  { id: 'timeline', label: 'Versions', icon: <Clock size={12} /> },
  { id: 'prs',      label: 'PRs',      icon: <GitPullRequest size={12} /> },
  { id: 'chat',     label: 'Chat',     icon: <Hash size={12} /> },
] as const

export function ReviewPanel() {
  const {
    activeRightPanel, setActiveRightPanel,
    rightPanelOpen, setRightPanelOpen,
    comments, chatMessages,
  } = useStore()
  const [panelWidth, setPanelWidth] = useState(320)

  const openComments = comments.filter((c) => !c.resolved).length

  if (!rightPanelOpen) {
    return (
      <button
        onClick={() => setRightPanelOpen(true)}
        className="w-6 bg-editor-surface border-l border-editor-border flex items-center justify-center text-editor-muted hover:text-editor-text transition-colors shrink-0"
        title="Open review panel"
      >
        <ChevronRight size={14} />
      </button>
    )
  }

  return (
    <div
      className="bg-editor-surface border-l border-editor-border flex flex-col shrink-0 overflow-hidden relative"
      style={{ width: panelWidth }}
    >
      <div
        className="absolute top-0 left-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-editor-accent/30 transition-colors z-20"
        onMouseDown={(e) => {
          const startX = e.clientX
          const startW = panelWidth
          const onMove = (ev: MouseEvent) => {
            const delta = startX - ev.clientX
            setPanelWidth(Math.min(520, Math.max(260, startW + delta)))
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />

      {/* Tabs */}
      <div className="flex border-b border-editor-border shrink-0">
        {TABS.map(({ id, label, icon }) => {
          const badge =
            id === 'review' && openComments > 0 ? openComments
            : id === 'chat' && chatMessages.length > 0 ? null
            : null

          return (
            <button
              key={id}
              onClick={() => setActiveRightPanel(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] border-b-2 transition-colors ${
                activeRightPanel === id
                  ? 'border-editor-accent text-editor-text'
                  : 'border-transparent text-editor-muted hover:text-editor-text'
              }`}
            >
              {icon}
              {label}
              {badge != null && (
                <span className="w-4 h-4 rounded-full bg-editor-accent/20 text-editor-accent text-[9px] flex items-center justify-center font-medium">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeRightPanel === 'review'   && <ReviewComments />}
        {activeRightPanel === 'timeline' && <ReviewTimeline />}
        {activeRightPanel === 'prs'      && <ReviewPRList />}
        {activeRightPanel === 'chat'     && <ReviewChat />}
      </div>
    </div>
  )
}
