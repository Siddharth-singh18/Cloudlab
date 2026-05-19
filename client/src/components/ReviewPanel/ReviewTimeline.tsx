import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { History, RotateCcw, Plus, Trash2, Clock, User } from 'lucide-react'
import { versionsApi } from '../../lib/api'
import { useStore } from '../../store'
import type { ProjectVersion } from '../../types'

export function ReviewTimeline() {
  const { currentProject, currentUser } = useStore()
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [label, setLabel] = useState('')

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['versions', currentProject?.id],
    queryFn: () => versionsApi.list(currentProject!.id),
    enabled: Boolean(currentProject?.id),
  })

  const createVersion = useMutation({
    mutationFn: (label?: string) => versionsApi.create(currentProject!.id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', currentProject?.id] })
      setIsCreating(false)
      setLabel('')
    },
  })

  const restoreVersion = useMutation({
    mutationFn: (versionId: string) => versionsApi.restore(currentProject!.id, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] })
      window.location.reload()
    },
  })

  const deleteVersion = useMutation({
    mutationFn: (versionId: string) => versionsApi.delete(currentProject!.id, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', currentProject?.id] })
    },
  })

  if (!currentProject) return null

  const canWrite = currentProject.permissions?.canWrite

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History size={16} className="text-editor-accent" />
          <span>Version History</span>
        </div>
        {canWrite && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-accent text-white rounded hover:bg-editor-accent/80"
          >
            <Plus size={14} />
           Checkpoint
          </button>
        )}
      </div>

      {isCreating && (
        <div className="p-3 border-b border-editor-border bg-editor-surface/50">
          <input
            type="text"
            placeholder="Version label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-2 py-1.5 mb-2 text-sm bg-editor-bg border border-editor-border rounded focus:border-editor-accent focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') createVersion.mutate(label || undefined)
              if (e.key === 'Escape') setIsCreating(false)
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => createVersion.mutate(label || undefined)}
              disabled={createVersion.isPending}
              className="px-2 py-1 text-xs bg-editor-accent text-white rounded hover:bg-editor-accent/80 disabled:opacity-50"
            >
              {createVersion.isPending ? 'Creating...' : 'Create'}
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
          <div className="p-4 text-center text-editor-muted text-sm">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center text-editor-muted text-sm">
            No versions yet. Create a checkpoint to save your project state.
          </div>
        ) : (
          <div className="p-2">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-editor-border" />
              {versions.map((version: ProjectVersion, idx: number) => (
                <div key={version.id} className="relative flex items-start gap-3 pb-4 pl-2">
                  <div
                    className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      version.isAuto
                        ? 'bg-editor-bg border-editor-accent/50'
                        : 'bg-editor-accent border-editor-accent'
                    }`}
                  >
                    {version.isAuto ? (
                      <Clock size={10} className="text-editor-accent" />
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-editor-text truncate">
                        {version.label || (version.isAuto ? 'Auto-save' : 'Checkpoint')}
                      </span>
                      {version.isAuto && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-editor-accent/20 text-editor-accent rounded">
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-editor-muted">
                      <User size={12} />
                      <span>{version.createdBy?.name || 'Unknown'}</span>
                      <span>·</span>
                      <span>{new Date(version.createdAt).toLocaleString()}</span>
                    </div>
                    {canWrite && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => restoreVersion.mutate(version.id)}
                          disabled={restoreVersion.isPending}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-surface border border-editor-border rounded hover:border-editor-accent hover:text-editor-accent"
                        >
                          <RotateCcw size={12} />
                          Restore
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this version?')) deleteVersion.mutate(version.id)
                          }}
                          className="p-1 text-xs text-editor-muted hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}