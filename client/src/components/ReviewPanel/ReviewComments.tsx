import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, CheckCircle, Circle, ChevronDown, ChevronRight,
  Reply, Send, Sparkles, Check, X
} from 'lucide-react'
import { useStore } from '../../store'
import { shortName, timeAgo, diffLines, getLanguageFromPath } from '../../lib/utils'
import { commentsApi, filesApi, projectReviewApi, suggestionsApi } from '../../lib/api'
import type { Comment, Suggestion } from '../../types'

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 18 }: { user: { name: string; color: string }; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-medium shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.45,
        backgroundColor: user.color + '25', color: user.color,
        border: `1.5px solid ${user.color}40`,
      }}
    >
      {shortName(user.name)}
    </div>
  )
}

// ─── Comment Thread ───────────────────────────────────────────────────────────
function CommentThread({ comment }: { comment: Comment }) {
  const { resolveComment, setHighlightedLine, currentProject, currentReview } = useStore()
  const [expanded, setExpanded] = useState(true)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const canReview = currentProject?.permissions?.canReview ?? true
  const queryClient = useQueryClient()

  const refreshProjectReviewState = async () => {
    if (currentProject?.id) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-comments', currentProject.id] }),
        queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject.id] }),
      ])
    }
  }

  const resolveCommentMutation = useMutation({
    mutationFn: async () => {
      if (comment.projectId) {
        return projectReviewApi.resolveComment(comment.id)
      }
      return commentsApi.resolve(comment.id)
    },
    onSuccess: async () => {
      resolveComment(comment.id)
      await refreshProjectReviewState()
      if (currentReview?.id) {
        await queryClient.invalidateQueries({ queryKey: ['reviews', currentReview.projectId] })
      }
    },
  })

  const replyMutation = useMutation({
    mutationFn: async () => {
      const body = replyText.trim()
      if (!body) throw new Error('Reply cannot be empty')

      if (comment.projectId) {
        return projectReviewApi.replyToComment(comment.id, body)
      }
      return commentsApi.reply(comment.id, body)
    },
    onSuccess: async () => {
      setReplyText('')
      setReplyOpen(false)
      await refreshProjectReviewState()
    },
  })

  const submitReply = () => {
    if (!replyText.trim() || replyMutation.isPending || !canReview) return
    replyMutation.mutate()
  }

  return (
    <div className={`comment-card ${comment.resolved ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-editor-surface cursor-pointer border-b border-editor-border"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-editor-muted shrink-0">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button
          className="text-[10px] font-mono text-editor-accent hover:underline truncate"
          onClick={(e) => { e.stopPropagation(); setHighlightedLine(comment.lineStart) }}
        >
          {comment.filePath.split('/').pop()}:{comment.lineStart}
        </button>
        <div className="ml-auto">
          {comment.resolved
            ? <span className="badge-resolved">resolved</span>
            : <span className="badge-open">open</span>}
        </div>
      </div>

      {expanded && (
        <>
          {/* Main comment */}
          <div className="px-3 py-2 border-b border-editor-border/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar user={comment.author} />
              <span className="text-[11px] font-medium text-editor-text">{comment.author.name}</span>
              <span className="text-[10px] text-editor-muted ml-auto">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-[11px] text-editor-muted leading-relaxed pl-5">{comment.body}</p>
          </div>

          {/* Replies */}
          {comment.replies.map((reply) => (
            <div key={reply.id} className="px-3 py-2 border-b border-editor-border/30 bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <Avatar user={reply.author} size={15} />
                <span className="text-[11px] font-medium text-editor-text">{reply.author.name}</span>
                <span className="text-[10px] text-editor-muted ml-auto">{timeAgo(reply.createdAt)}</span>
              </div>
              <p className="text-[11px] text-editor-muted leading-relaxed pl-4">{reply.body}</p>
            </div>
          ))}

          {/* Actions */}
          {!comment.resolved && (
            <div className="flex items-center gap-1 px-3 py-1.5">
              <button
                className="flex items-center gap-1 text-[10px] text-editor-muted hover:text-editor-green px-2 py-0.5 rounded border border-editor-border hover:border-editor-green transition-colors"
                onClick={() => resolveCommentMutation.mutate()}
                disabled={!canReview}
              >
                <Check size={10} /> Resolve
              </button>
              <button
                className="flex items-center gap-1 text-[10px] text-editor-muted hover:text-editor-text px-2 py-0.5 rounded border border-editor-border transition-colors"
                onClick={() => setReplyOpen(!replyOpen)}
                disabled={!canReview}
              >
                <Reply size={10} /> Reply
              </button>
            </div>
          )}

          {replyOpen && (
            <div className="px-3 pb-2 flex gap-2">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add a reply…"
                className="input flex-1 text-[11px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                    e.preventDefault()
                    submitReply()
                  }
                  if (e.key === 'Escape') setReplyOpen(false)
                }}
              />
              <button
                className="p-1.5 text-editor-accent hover:text-blue-300"
                onClick={submitReply}
                disabled={!replyText.trim() || replyMutation.isPending || !canReview}
                title="Send reply"
              >
                <Send size={12} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────
function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const { updateSuggestion, setHighlightedLine, currentProject, currentReview } = useStore()
  const diff = diffLines(suggestion.originalCode, suggestion.suggestedCode)
  const canReview = currentProject?.permissions?.canReview ?? true
  const queryClient = useQueryClient()
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (suggestion.projectId) return projectReviewApi.acceptSuggestion(suggestion.id)
      return suggestionsApi.accept(suggestion.id)
    },
    onSuccess: async (result) => {
      updateSuggestion({ ...result, status: 'accepted' })
      if (currentProject?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['project-suggestions', currentProject.id] }),
          queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject.id] }),
        ])
      }
      if (currentReview?.id) {
        await queryClient.invalidateQueries({ queryKey: ['reviews', currentReview.projectId] })
      }
    },
  })
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (suggestion.projectId) return projectReviewApi.rejectSuggestion(suggestion.id)
      return suggestionsApi.reject(suggestion.id)
    },
    onSuccess: async (result) => {
      updateSuggestion({ ...result, status: 'rejected' })
      if (currentProject?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['project-suggestions', currentProject.id] }),
          queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject.id] }),
        ])
      }
      if (currentReview?.id) {
        await queryClient.invalidateQueries({ queryKey: ['reviews', currentReview.projectId] })
      }
    },
  })

  if (suggestion.status !== 'pending') {
    return (
      <div className="comment-card opacity-50">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sparkles size={12} className="text-yellow-400" />
          <span className="text-[11px] text-editor-muted">
            Suggestion {suggestion.status}
          </span>
          {suggestion.status === 'accepted'
            ? <Check size={11} className="ml-auto text-green-400" />
            : <X size={11} className="ml-auto text-red-400" />}
        </div>
      </div>
    )
  }

  return (
    <div className="comment-card border-yellow-500/30">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/5 border-b border-yellow-500/20">
        <Sparkles size={12} className="text-yellow-400 shrink-0" />
        <span className="text-[11px] font-medium text-yellow-300 flex-1">Suggestion</span>
        <button
          className="text-[10px] font-mono text-editor-accent hover:underline"
          onClick={() => setHighlightedLine(suggestion.lineStart)}
        >
          line {suggestion.lineStart}
        </button>
      </div>

      <div className="px-3 py-2 border-b border-editor-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Avatar user={suggestion.author} />
          <span className="text-[11px] font-medium text-editor-text">{suggestion.author.name}</span>
          <span className="text-[10px] text-editor-muted ml-auto">{timeAgo(suggestion.createdAt)}</span>
        </div>

        {/* Diff preview */}
        <div className="rounded border border-editor-border overflow-hidden font-mono text-[10px]">
          {diff.slice(0, 6).map((line, i) => (
            <div
              key={i}
              className={`flex px-2 py-0.5 leading-4 ${
                line.type === 'removed' ? 'bg-red-500/10 text-red-300'
                : line.type === 'added' ? 'bg-green-500/10 text-green-300'
                : 'text-editor-muted'
              }`}
            >
              <span className="w-3 shrink-0 text-center opacity-60">
                {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
              </span>
              <span className="truncate">{line.content}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          className="btn-success flex items-center gap-1 text-[10px]"
          onClick={() => acceptMutation.mutate()}
          disabled={!canReview || acceptMutation.isPending}
        >
          <Check size={10} /> Accept
        </button>
        <button
          className="btn-danger flex items-center gap-1 text-[10px]"
          onClick={() => rejectMutation.mutate()}
          disabled={!canReview || rejectMutation.isPending}
        >
          <X size={10} /> Reject
        </button>
        <span className="text-[10px] text-editor-muted ml-auto">
          {suggestion.filePath.split('/').pop()}
        </span>
      </div>
    </div>
  )
}

// ─── File Status List ─────────────────────────────────────────────────────────
function FileStatusList() {
  const {
    fileTree,
    setHighlightedLine,
    openTabs,
    activeTabPath,
    setActiveTab,
    currentProject,
    openTab,
  } = useStore()
  const queryClient = useQueryClient()

  const openFile = useMutation({
    mutationFn: async (filePath: string) => {
      if (!currentProject?.id) return { content: '' }
      return filesApi.read(currentProject.id, filePath)
    },
    onSuccess: ({ content }, filePath) => {
      const existingTab = openTabs.find((tab) => tab.path === filePath)
      if (existingTab) {
        setActiveTab(filePath)
        return
      }

      openTab({
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        content,
        language: getLanguageFromPath(filePath),
        modified: false,
      })
      queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] })
    },
  })

  const flatten = (nodes: typeof fileTree): typeof fileTree =>
    nodes.flatMap((node) => node.type === 'folder' && node.children ? [node, ...flatten(node.children)] : [node])

  const files = flatten(fileTree).filter((node) => node.type === 'file')

  return (
    <div className="space-y-1">
      {files.map((node) => {
        const status = node.reviewStatus || 'UNREVIEWED'
        const isApproved = status === 'APPROVED'
        const isChangesRequested = status === 'CHANGES_REQUESTED'
        const label =
          status === 'APPROVED' ? 'approved'
          : status === 'CHANGES_REQUESTED' ? 'changes requested'
          : status === 'IN_REVIEW' ? 'in review'
          : 'unreviewed'

        return (
          <button
            key={node.path}
            className={`w-full flex items-center gap-2 text-[11px] px-1 py-1 rounded transition-colors ${
              activeTabPath === node.path ? 'bg-white/5' : 'hover:bg-white/[0.03]'
            }`}
            onClick={() => {
              const existingTab = openTabs.find((tab) => tab.path === node.path)
              if (existingTab) {
                setActiveTab(node.path)
              } else {
                openFile.mutate(node.path)
              }
              setHighlightedLine(null)
            }}
            title={node.path}
          >
            {isApproved
              ? <CheckCircle size={13} className="text-green-400 shrink-0" />
              : <Circle size={13} className={`${isChangesRequested ? 'text-yellow-400' : 'text-editor-muted'} shrink-0`} />}
            <span className="text-editor-muted truncate flex-1">{node.path.split('/').pop()}</span>
            {(node.openCommentCount || node.pendingSuggestionCount) ? (
              <span className="text-[10px] text-editor-muted">
                {node.openCommentCount || 0}c / {node.pendingSuggestionCount || 0}s
              </span>
            ) : null}
            <span className={`text-[10px] ${
              isApproved ? 'text-green-400' : isChangesRequested ? 'text-yellow-400' : 'text-editor-muted'
            }`}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FileStatusSummary() {
  const { fileTree } = useStore()

  const flattenFiles = (nodes: typeof fileTree): typeof fileTree =>
    nodes.flatMap((node) => {
      if (node.type === 'folder') {
        return node.children ? flattenFiles(node.children) : []
      }
      return [node]
    })

  const files = flattenFiles(fileTree).filter((node) => node.type === 'file')

  const summary = files.reduce((acc, node) => {
    const status = node.reviewStatus || 'UNREVIEWED'
    acc.total += 1
    if (status === 'APPROVED') acc.approved += 1
    if (status === 'CHANGES_REQUESTED') acc.changesRequested += 1
    if (status === 'IN_REVIEW') acc.inReview += 1
    if (status === 'UNREVIEWED') acc.unreviewed += 1
    return acc
  }, {
    total: 0,
    approved: 0,
    changesRequested: 0,
    inReview: 0,
    unreviewed: 0,
  })

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="rounded-lg border border-editor-border bg-editor-bg px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-editor-muted">Files tracked</p>
        <p className="text-sm font-semibold text-editor-text mt-1">{summary.total}</p>
      </div>
      <div className="rounded-lg border border-editor-border bg-editor-bg px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-editor-muted">Approved</p>
        <p className="text-sm font-semibold text-green-400 mt-1">{summary.approved}</p>
      </div>
      <div className="rounded-lg border border-editor-border bg-editor-bg px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-editor-muted">Changes needed</p>
        <p className="text-sm font-semibold text-yellow-300 mt-1">{summary.changesRequested}</p>
      </div>
      <div className="rounded-lg border border-editor-border bg-editor-bg px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wider text-editor-muted">Unreviewed</p>
        <p className="text-sm font-semibold text-editor-text mt-1">{summary.unreviewed}</p>
      </div>
    </div>
  )
}

// ─── New Comment Form ─────────────────────────────────────────────────────────
function NewCommentForm({ onClose }: { onClose: () => void }) {
  const { currentUser, activeTabPath, currentProject, currentReview } = useStore()
  const [body, setBody] = useState('')
  const [line, setLine] = useState('')
  const queryClient = useQueryClient()

  const createComment = useMutation({
    mutationFn: async () => {
      const lineNumber = parseInt(line, 10) || 1
      const payload = {
        filePath: activeTabPath || 'src/AuthProvider.tsx',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        body,
      }

      if (currentReview?.id) {
        return commentsApi.create(currentReview.id, payload)
      }
      if (currentProject?.id) {
        return projectReviewApi.createComment(currentProject.id, payload)
      }
      throw new Error('No active project or review')
    },
    onSuccess: async () => {
      if (currentProject?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['project-comments', currentProject.id] }),
          queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject.id] }),
        ])
      }
      setBody('')
      setLine('')
      onClose()
    },
  })

  const submit = () => {
    if (!body.trim() || !currentUser) return
    createComment.mutate()
  }

  return (
    <div className="border border-editor-border rounded-lg p-3 mb-3 bg-editor-surface animate-fade_in">
      <p className="text-[10px] text-editor-muted mb-2 font-semibold uppercase tracking-wider">New Comment</p>
      <div className="flex gap-2 mb-2">
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="Line #"
          className="input w-16 text-[11px]"
          type="number"
        />
        <span className="text-[11px] text-editor-muted self-center">
          {activeTabPath ? activeTabPath.split('/').pop() : 'current file'}
        </span>
      </div>
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a comment…"
        className="input w-full h-16 resize-none text-[11px] leading-relaxed"
      />
      <div className="flex gap-2 mt-2">
        <button className="btn-ghost text-[10px]" onClick={onClose}>Cancel</button>
        <button className="btn-primary text-[10px]" onClick={submit} disabled={!body.trim() || createComment.isPending}>
          {createComment.isPending ? 'Saving…' : 'Comment'}
        </button>
      </div>
    </div>
  )
}

function NewSuggestionForm({ onClose }: { onClose: () => void }) {
  const { activeTabPath, currentProject, currentReview } = useStore()
  const [line, setLine] = useState('')
  const [originalCode, setOriginalCode] = useState('')
  const [suggestedCode, setSuggestedCode] = useState('')
  const queryClient = useQueryClient()

  const createSuggestion = useMutation({
    mutationFn: async () => {
      const lineNumber = parseInt(line, 10) || 1
      const payload = {
        filePath: activeTabPath || 'index.ts',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        originalCode,
        suggestedCode,
      }

      if (currentReview?.id) {
        return suggestionsApi.create(currentReview.id, payload)
      }
      if (currentProject?.id) {
        return projectReviewApi.createSuggestion(currentProject.id, payload)
      }
      throw new Error('No active project or review')
    },
    onSuccess: async () => {
      if (currentProject?.id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['project-suggestions', currentProject.id] }),
          queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject.id] }),
        ])
      }
      setLine('')
      setOriginalCode('')
      setSuggestedCode('')
      onClose()
    },
  })

  return (
    <div className="border border-yellow-500/20 rounded-lg p-3 mb-3 bg-yellow-500/5 animate-fade_in">
      <p className="text-[10px] text-yellow-300 mb-2 font-semibold uppercase tracking-wider">New Suggestion</p>
      <div className="flex gap-2 mb-2">
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="Line #"
          className="input w-16 text-[11px]"
          type="number"
        />
        <span className="text-[11px] text-editor-muted self-center">
          {activeTabPath ? activeTabPath.split('/').pop() : 'current file'}
        </span>
      </div>
      <textarea
        value={originalCode}
        onChange={(e) => setOriginalCode(e.target.value)}
        placeholder="Current code"
        className="input w-full h-16 resize-none text-[11px] font-mono mb-2"
      />
      <textarea
        autoFocus
        value={suggestedCode}
        onChange={(e) => setSuggestedCode(e.target.value)}
        placeholder="Suggested replacement"
        className="input w-full h-20 resize-none text-[11px] font-mono"
      />
      <div className="flex gap-2 mt-2">
        <button className="btn-ghost text-[10px]" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary text-[10px]"
          onClick={() => createSuggestion.mutate()}
          disabled={!originalCode.trim() || !suggestedCode.trim() || createSuggestion.isPending}
        >
          {createSuggestion.isPending ? 'Saving…' : 'Add suggestion'}
        </button>
      </div>
    </div>
  )
}

// ─── Main ReviewComments ──────────────────────────────────────────────────────
export function ReviewComments() {
  const { comments, suggestions, currentProject } = useStore()
  const [showNewComment, setShowNewComment] = useState(false)
  const [showNewSuggestion, setShowNewSuggestion] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const canReview = currentProject?.permissions?.canReview ?? true

  const filteredComments = comments.filter((c) => {
    if (filter === 'open') return !c.resolved
    if (filter === 'resolved') return c.resolved
    return true
  })

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2">
        <FileStatusSummary />

        {/* Suggestions section */}
        {pendingSuggestions.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Sparkles size={11} className="text-yellow-400" />
              <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider">
                Suggestions ({pendingSuggestions.length})
              </span>
            </div>
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </div>
        )}

        {/* Comments section */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={11} className="text-editor-muted" />
            <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider">
              Comments
            </span>
          </div>
          <div className="flex items-center gap-0.5 bg-editor-bg rounded border border-editor-border overflow-hidden">
            {(['open', 'all', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[10px] transition-colors capitalize ${
                  filter === f ? 'bg-editor-surface text-editor-text' : 'text-editor-muted hover:text-editor-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {showNewComment && <NewCommentForm onClose={() => setShowNewComment(false)} />}
        {showNewSuggestion && <NewSuggestionForm onClose={() => setShowNewSuggestion(false)} />}

        {filteredComments.length === 0 ? (
          <div className="text-center py-6 text-editor-muted">
            <MessageSquare size={20} className="mx-auto mb-2 opacity-30" />
            <p className="text-[11px]">No {filter === 'all' ? '' : filter} comments</p>
          </div>
        ) : (
          filteredComments.map((c) => <CommentThread key={c.id} comment={c} />)
        )}

        {/* File status */}
        <div className="mt-3 mb-2 px-1">
          <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider">
            File Status
          </span>
        </div>
        <FileStatusList />
      </div>

      <div className="p-2 border-t border-editor-border shrink-0 flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-editor-border rounded text-[11px] text-editor-muted hover:text-editor-text hover:border-editor-accent transition-colors"
          onClick={() => {
            setShowNewSuggestion(false)
            setShowNewComment(true)
          }}
          disabled={!canReview}
        >
          <MessageSquare size={11} />
          {canReview ? 'Add comment' : 'Read-only'}
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-yellow-500/20 rounded text-[11px] text-yellow-300 hover:text-yellow-200 hover:border-yellow-400/40 transition-colors"
          onClick={() => {
            setShowNewComment(false)
            setShowNewSuggestion(true)
          }}
          disabled={!canReview}
        >
          <Sparkles size={11} />
          Suggest change
        </button>
      </div>
    </div>
  )
}
