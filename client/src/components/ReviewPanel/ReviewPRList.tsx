import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GitPullRequest, Plus, CheckCircle, XCircle, AlertCircle, ArrowRight, Merge } from 'lucide-react'
import { pullRequestsApi } from '../../lib/api'
import { useStore } from '../../store'
import type { PullRequest } from '../../types'

const statusConfig = {
  OPEN: { icon: GitPullRequest, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Open' },
  CHANGES_REQUESTED: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Changes Requested' },
  APPROVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Approved' },
  REJECTED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Rejected' },
  MERGED: { icon: Merge, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Merged' },
}

export function ReviewPRList() {
  const { currentProject } = useStore()
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [newPR, setNewPR] = useState({ title: '', description: '', targetProjectId: '' })

  const { data: prs = [], isLoading } = useQuery({
    queryKey: ['pullRequests', currentProject?.id],
    queryFn: () => pullRequestsApi.list(currentProject!.id),
    enabled: Boolean(currentProject?.id),
  })

  const createPR = useMutation({
    mutationFn: (data: { title: string; description?: string }) => {
      // Auto-set targetProjectId: if this is a clone, target is original; otherwise target is self
      const targetProjectId = currentProject?.sourceProjectId || currentProject!.id
      return pullRequestsApi.create(currentProject!.id, { ...data, targetProjectId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pullRequests', currentProject?.id] })
      setIsCreating(false)
      setNewPR({ title: '', description: '', targetProjectId: '' })
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ prId, status }: { prId: string; status: 'OPEN' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' }) =>
      pullRequestsApi.updateStatus(prId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pullRequests', currentProject?.id] })
    },
  })

  const mergePR = useMutation({
    mutationFn: (prId: string) => pullRequestsApi.merge(prId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pullRequests', currentProject?.id] })
      queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] })
    },
  })

  if (!currentProject) return null

  const canWrite = currentProject.permissions?.canWrite
  const canMerge = currentProject.permissions?.canMerge

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitPullRequest size={16} className="text-editor-accent" />
          <span>Pull Requests</span>
        </div>
        {canWrite && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-accent text-white rounded hover:bg-editor-accent/80"
          >
            <Plus size={14} />
            New PR
          </button>
        )}
      </div>

      {isCreating && (
        <div className="p-3 border-b border-editor-border bg-editor-surface/50">
          <input
            type="text"
            placeholder="PR title"
            value={newPR.title}
            onChange={(e) => setNewPR({ ...newPR, title: e.target.value })}
            className="w-full px-2 py-1.5 mb-2 text-sm bg-editor-bg border border-editor-border rounded focus:border-editor-accent focus:outline-none"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={newPR.description}
            onChange={(e) => setNewPR({ ...newPR, description: e.target.value })}
            className="w-full px-2 py-1.5 mb-2 text-sm bg-editor-bg border border-editor-border rounded focus:border-editor-accent focus:outline-none resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => createPR.mutate(newPR)}
              disabled={!newPR.title || createPR.isPending}
              className="px-2 py-1 text-xs bg-editor-accent text-white rounded hover:bg-editor-accent/80 disabled:opacity-50"
            >
              {createPR.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-2 py-1 text-xs text-editor-muted hover:text-editor-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-center text-editor-muted text-sm">Loading PRs...</div>
        ) : prs.length === 0 ? (
          <div className="p-4 text-center text-editor-muted text-sm">
            No pull requests yet. Create one to propose changes.
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {prs.map((pr: PullRequest) => {
              const status = statusConfig[pr.status]
              const StatusIcon = status.icon
              const isSourceProject = pr.sourceProjectId === currentProject.id

              return (
                <div
                  key={pr.id}
                  className="p-3 bg-editor-surface border border-editor-border rounded-lg hover:border-editor-accent/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusIcon size={14} className={status.color} />
                        <span className="text-sm font-medium text-editor-text truncate">
                          {pr.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-editor-muted">
                        <span>{pr.raisedBy?.name || 'Unknown'}</span>
                        <span>·</span>
                        <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                        {pr.sourceProject && (
                          <>
                            <span>·</span>
                            <span className="truncate">
                              {isSourceProject
                                ? `→ ${pr.targetProject?.name}`
                                : `← ${pr.sourceProject?.name}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {pr.description && (
                    <p className="mt-2 text-xs text-editor-muted line-clamp-2">
                      {pr.description}
                    </p>
                  )}

                  {canMerge && pr.status !== 'MERGED' && !isSourceProject && (
                    <div className="flex gap-2 mt-3">
                      {pr.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ prId: pr.id, status: 'CHANGES_REQUESTED' })}
                            className="px-2 py-1 text-xs border border-editor-border rounded hover:border-yellow-500 hover:text-yellow-500"
                          >
                            Request Changes
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ prId: pr.id, status: 'APPROVED' })}
                            className="px-2 py-1 text-xs border border-editor-border rounded hover:border-green-500 hover:text-green-500"
                          >
                            Approve
                          </button>
                        </>
                      )}
                      {(pr.status === 'APPROVED' || pr.status === 'OPEN') && (
                        <button
                          onClick={() => mergePR.mutate(pr.id)}
                          disabled={mergePR.isPending}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          <Merge size={12} />
                          {mergePR.isPending ? 'Merging...' : 'Merge'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}