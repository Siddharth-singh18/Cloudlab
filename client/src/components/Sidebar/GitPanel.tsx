import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight, Check, CircleDot, GitBranch, GitPullRequest,
  MessageSquare, RefreshCw, ShieldAlert, X, Github, Upload, Download
} from 'lucide-react'
import { pullRequestsApi, githubApi } from '../../lib/api'
import { useStore } from '../../store'
import { timeAgo } from '../../lib/utils'
import type { PullRequest } from '../../types'

const STATUS_STYLES: Record<PullRequest['status'], string> = {
  OPEN: 'text-blue-300 border-blue-400/20 bg-blue-500/10',
  CHANGES_REQUESTED: 'text-yellow-300 border-yellow-400/20 bg-yellow-500/10',
  APPROVED: 'text-green-300 border-green-400/20 bg-green-500/10',
  REJECTED: 'text-red-300 border-red-400/20 bg-red-500/10',
  MERGED: 'text-purple-300 border-purple-400/20 bg-purple-500/10',
}

function GitHubSection({ onClose }: { onClose?: () => void }) {
  const { currentProject } = useStore()
  const queryClient = useQueryClient()
  const [githubUrl, setGithubUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [pushBranchName, setPushBranchName] = useState('workspace-update')
  const [commitMessage, setCommitMessage] = useState('')
  const [pushLoading, setPushLoading] = useState(false)
  const [importStage, setImportStage] = useState<string | null>(null)

  const canWrite = currentProject?.permissions?.canWrite ?? false
  const githubStatusQuery = useQuery({
    queryKey: ['github-status'],
    queryFn: () => githubApi.status(),
    retry: false,
  })
  const branchesQuery = useQuery({
    queryKey: ['github-branches', githubUrl],
    queryFn: () => githubApi.branches(githubUrl),
    enabled: githubUrl.trim().length > 0,
    retry: false,
  })
  const historyQuery = useQuery({
    queryKey: ['github-history', currentProject?.id],
    queryFn: () => githubApi.history(currentProject!.id),
    enabled: !!currentProject?.id,
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('No project')
      setImportStage('Validating repository access…')
      await new Promise((resolve) => setTimeout(resolve, 250))
      setImportStage('Fetching selected branch…')
      await new Promise((resolve) => setTimeout(resolve, 250))
      setImportStage('Syncing files into CloudLab workspace…')
      return githubApi.import(currentProject.id, githubUrl, branch)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['github-history', currentProject?.id] })
      queryClient.invalidateQueries({ queryKey: ['github-status'] })
      setGithubUrl('')
      setImportStage(null)
      alert('Successfully imported from GitHub!')
    },
    onError: (err: any) => {
      setImportStage(null)
      alert(err?.response?.data?.error || 'Import failed')
    },
  })

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('No project')
      setPushLoading(true)
      return githubApi.push(currentProject.id, pushBranchName, commitMessage || undefined, githubUrl || undefined, branch || undefined)
    },
    onSuccess: (data) => {
      setPushLoading(false)
      queryClient.invalidateQueries({ queryKey: ['github-history', currentProject?.id] })
      queryClient.invalidateQueries({ queryKey: ['github-status'] })
      if (data.prUrl) {
        window.open(data.prUrl, '_blank')
      }
      alert(`Pushed to GitHub! Branch: ${data.branch}`)
    },
    onError: (err: any) => {
      setPushLoading(false)
      alert(err?.response?.data?.error || 'Push failed - Make sure GitHub is connected in settings')
    },
  })

  if (!currentProject) return null

  return (
    <div className="border-b border-editor-border pb-3 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Github size={14} className="text-editor-text" />
        <span className="text-[11px] font-semibold text-editor-text">GitHub</span>
        <div className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${
          githubStatusQuery.data?.connected
            ? 'text-green-300 border-green-400/20 bg-green-500/10'
            : 'text-yellow-300 border-yellow-400/20 bg-yellow-500/10'
        }`}>
          {githubStatusQuery.data?.connected
            ? `Connected${githubStatusQuery.data.account?.login ? ` · ${githubStatusQuery.data.account.login}` : ''}`
            : 'Token not connected'}
        </div>
      </div>

      <div className="space-y-3">
        {!githubStatusQuery.data?.connected && (
          <div className="px-2">
            <button
              className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white text-[11px] py-2 rounded flex items-center justify-center gap-2 font-medium transition-colors border border-[rgba(255,255,255,0.1)]"
              onClick={async () => {
                try {
                  const { url } = await githubApi.oauthUrl()
                  window.location.href = url
                } catch (err: any) {
                  alert(err.response?.data?.error || 'Failed to start GitHub OAuth')
                }
              }}
            >
              <Github size={14} />
              Connect with GitHub
            </button>
            <p className="text-[9px] text-editor-muted mt-2 text-center leading-tight">
              Connect to securely clone private repos and push PRs without exposing tokens.
            </p>
          </div>
        )}

        {/* IMPORT SECTION */}
        <div className="rounded border border-editor-border bg-editor-surface p-2 mx-1">
          <p className="text-[10px] font-medium text-editor-text mb-2 flex items-center gap-1.5"><Download size={12}/> Clone & Import</p>
          
          <div className="flex gap-1 mb-2">
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="github.com/user/repo"
              className="input flex-1 text-[11px]"
            />
            <button
              className="btn-ghost text-[10px] px-2 bg-editor-bg"
              onClick={() => {
                if (window.confirm('This will merge the GitHub repository with your current workspace files. Proceed?')) {
                  importMutation.mutate()
                }
              }}
              disabled={!githubUrl.trim() || importMutation.isPending || !canWrite}
              title={canWrite ? 'Import' : 'No write permission'}
            >
              {importMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : 'Import'}
            </button>
          </div>
          
          {branchesQuery.data?.length ? (
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="input w-full text-[11px]"
            >
              {branchesQuery.data.map((branchName: string) => (
                <option key={branchName} value={branchName}>
                  {branchName}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch (e.g. main)"
              className="input w-full text-[11px]"
            />
          )}
        </div>

        {importStage && (
          <div className="rounded border border-blue-500/20 bg-blue-500/10 px-2.5 py-2 text-[10px] text-blue-200">
            {importStage}
          </div>
        )}

        {/* PUSH SECTION */}
        {canWrite && (
          <div className="rounded border border-editor-border bg-editor-surface p-2 mx-1">
            <p className="text-[10px] font-medium text-editor-text mb-2 flex items-center gap-1.5"><Upload size={12}/> Push to GitHub</p>
            <div className="space-y-2">
              <input
                value={pushBranchName}
                onChange={(e) => setPushBranchName(e.target.value)}
                placeholder="Branch name (e.g. feature-update)"
                className="input w-full text-[11px]"
              />
              <input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message"
                className="input w-full text-[11px]"
              />
              <button
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 border border-blue-500/20 rounded text-[10px] font-medium transition-colors ${!githubStatusQuery.data?.connected ? 'opacity-70' : ''}`}
                onClick={() => {
                  if (!githubStatusQuery.data?.connected) {
                    alert('Please connect your GitHub account first by clicking "Connect with GitHub".')
                    return
                  }
                  pushMutation.mutate()
                }}
                disabled={pushLoading || !canWrite}
              >
                {pushLoading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                Push and Create PR
              </button>
            </div>
            
            <div className="mt-3 rounded border border-blue-500/20 bg-blue-500/5 p-2 text-[10px] text-blue-300/80">
              <p className="font-semibold text-blue-300 flex items-center gap-1 mb-1">💡 Prefer the terminal?</p>
              <p className="mb-1 leading-tight">You can raise PRs directly using the built-in GitHub CLI:</p>
              <code className="block bg-black/40 px-1.5 py-1 rounded text-editor-text mb-1 select-all">gh auth login</code>
              <code className="block bg-black/40 px-1.5 py-1 rounded text-editor-text select-all">gh pr create</code>
            </div>
          </div>
        )}

        <div className="px-2">
          <p className="text-[9px] text-editor-muted leading-tight">
            <strong className="text-editor-text">Import</strong> replaces workspace files with GitHub's branch. <strong className="text-editor-text">Push</strong> commits changes to a new branch and opens a PR.
          </p>
        </div>

        {!!historyQuery.data?.length && (
          <div className="pt-2">
            <p className="text-[10px] text-editor-muted mb-1">Recent GitHub activity</p>
            <div className="space-y-1">
              {historyQuery.data.slice(0, 4).map((entry: any) => (
                <div key={entry.id} className="rounded border border-editor-border bg-editor-bg px-2 py-1.5">
                  <p className="text-[10px] text-editor-text">{entry.description}</p>
                  <p className="text-[9px] text-editor-muted mt-0.5">{timeAgo(entry.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PullRequestComposer({ onClose }: { onClose: () => void }) {
  const { currentProject } = useStore()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const createPullRequest = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id || !currentProject.sourceProjectId) {
        throw new Error('This workspace is not linked to an original project.')
      }

      return pullRequestsApi.create(currentProject.id, {
        targetProjectId: currentProject.sourceProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pull-requests', currentProject?.id] })
      onClose()
    },
  })

  if (!currentProject?.isExternalClone || !currentProject.sourceProjectId) return null

  return (
    <div className="border border-editor-border rounded-lg p-3 bg-editor-bg mb-3 animate-fade_in">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[11px] font-semibold text-editor-text">Raise CloudLab PR</p>
          <p className="text-[10px] text-editor-muted mt-1">
            Your clone can propose changes back to the original project. Direct edits stay blocked server-side.
          </p>
        </div>
        <button className="sidebar-icon w-5 h-5" onClick={onClose} title="Close">
          <X size={12} />
        </button>
      </div>

      <div className="space-y-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="PR title"
          className="input w-full text-[11px]"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What changed in this clone?"
          className="input w-full h-24 resize-none text-[11px]"
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button className="btn-ghost flex-1 text-[11px]" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary flex-1 text-[11px]"
          disabled={!title.trim() || createPullRequest.isPending}
          onClick={() => createPullRequest.mutate()}
        >
          {createPullRequest.isPending ? 'Raising…' : 'Raise PR'}
        </button>
      </div>

      {createPullRequest.isError && (
        <div className="mt-2 rounded border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[10px] text-red-200">
          {(createPullRequest.error as any)?.response?.data?.error || 'Could not raise PR.'}
        </div>
      )}
    </div>
  )
}

function PullRequestCard({
  pullRequest,
  currentProjectId,
  canReview,
  canMerge,
}: {
  pullRequest: PullRequest
  currentProjectId: string
  canReview: boolean
  canMerge: boolean
}) {
  const queryClient = useQueryClient()
  const isIncoming = pullRequest.targetProjectId === currentProjectId

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pull-requests', currentProjectId] })
  }

  const updateStatus = useMutation({
    mutationFn: (payload: { status: 'OPEN' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'; note?: string }) =>
      pullRequestsApi.updateStatus(pullRequest.id, payload),
    onSuccess: refresh,
  })

  const mergePullRequest = useMutation({
    mutationFn: () => pullRequestsApi.merge(pullRequest.id),
    onSuccess: refresh,
  })

  const requestChanges = () => {
    const note = window.prompt('Optional note for the contributor', 'Please address the pending review feedback.')
    updateStatus.mutate({ status: 'CHANGES_REQUESTED', note: note || undefined })
  }

  const reject = () => {
    const note = window.prompt('Why is this PR being rejected?', 'Not a fit for the base project yet.')
    updateStatus.mutate({ status: 'REJECTED', note: note || undefined })
  }

  const approve = () => {
    updateStatus.mutate({ status: 'APPROVED' })
  }

  const reopen = () => {
    updateStatus.mutate({ status: 'OPEN' })
  }

  return (
    <div className="rounded-lg border border-editor-border bg-editor-bg p-3">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-editor-surface border border-editor-border flex items-center justify-center shrink-0">
          <GitPullRequest size={13} className="text-editor-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-editor-text leading-5">
                {pullRequest.title}
              </p>
              <p className="text-[10px] text-editor-muted mt-0.5">
                {isIncoming ? 'Incoming to this project' : 'Raised from this project'} by {pullRequest.raisedBy.name}
              </p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[pullRequest.status]}`}>
              {pullRequest.status.toLowerCase().replace('_', ' ')}
            </span>
          </div>

          {pullRequest.description && (
            <p className="text-[11px] text-editor-muted mt-2 leading-relaxed whitespace-pre-wrap">
              {pullRequest.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-[10px] text-editor-muted flex-wrap">
            <span className="flex items-center gap-1">
              <ArrowUpRight size={10} />
              {pullRequest.sourceProject.name} → {pullRequest.targetProject.name}
            </span>
            <span>{timeAgo(pullRequest.createdAt)}</span>
            {pullRequest.resolvedAt && <span>Resolved {timeAgo(pullRequest.resolvedAt)}</span>}
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            {isIncoming && pullRequest.status !== 'MERGED' && canReview && (
              <>
                <button
                  className="btn-ghost text-[10px]"
                  disabled={updateStatus.isPending || mergePullRequest.isPending}
                  onClick={requestChanges}
                >
                  <MessageSquare size={10} className="inline mr-1" />
                  Request changes
                </button>
                <button
                  className="btn-danger text-[10px]"
                  disabled={updateStatus.isPending || mergePullRequest.isPending}
                  onClick={reject}
                >
                  Reject
                </button>
              </>
            )}

            {isIncoming && pullRequest.status === 'OPEN' && canMerge && (
              <button
                className="btn-success text-[10px]"
                disabled={updateStatus.isPending || mergePullRequest.isPending}
                onClick={approve}
              >
                <Check size={10} className="inline mr-1" />
                Approve
              </button>
            )}

            {isIncoming && (pullRequest.status === 'OPEN' || pullRequest.status === 'APPROVED') && canMerge && (
              <button
                className="btn-primary text-[10px]"
                disabled={mergePullRequest.isPending}
                onClick={() => mergePullRequest.mutate()}
              >
                {mergePullRequest.isPending ? 'Merging…' : 'Merge with checkpoint'}
              </button>
            )}

            {isIncoming && pullRequest.status !== 'MERGED' && canMerge && pullRequest.status !== 'OPEN' && (
              <button
                className="btn-ghost text-[10px]"
                disabled={updateStatus.isPending || mergePullRequest.isPending}
                onClick={reopen}
              >
                Reopen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function GitPanel() {
  const { activeSidebarPanel, currentProject } = useStore()
  const [showComposer, setShowComposer] = useState(false)
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all')

  const canReview = currentProject?.permissions?.canReview ?? false
  const canMerge = currentProject?.permissions?.canMerge ?? false

  const pullRequestsQuery = useQuery({
    queryKey: ['pull-requests', currentProject?.id],
    queryFn: () => pullRequestsApi.list(currentProject!.id),
    enabled: activeSidebarPanel === 'git' && Boolean(currentProject?.id),
  })

  const filteredPullRequests = useMemo(() => {
    const pullRequests = pullRequestsQuery.data || []
    if (!currentProject?.id) return []

    if (filter === 'incoming') {
      return pullRequests.filter((pr: PullRequest) => pr.targetProjectId === currentProject.id)
    }
    if (filter === 'outgoing') {
      return pullRequests.filter((pr: PullRequest) => pr.sourceProjectId === currentProject.id)
    }
    return pullRequests
  }, [pullRequestsQuery.data, filter, currentProject?.id])

  if (activeSidebarPanel !== 'git') return null

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
        <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-widest">
          CloudLab PRs
        </span>
        <button
          className="sidebar-icon w-5 h-5"
          title="Refresh"
          onClick={() => pullRequestsQuery.refetch()}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-editor-border">
        <div className="flex items-center gap-2 text-[11px]">
          <GitBranch size={12} className="text-editor-muted shrink-0" />
          <span className="text-editor-text truncate">
            {currentProject?.name || 'No project selected'}
          </span>
        </div>

        {currentProject?.isExternalClone && (
          <div className="mt-2 rounded-lg border border-blue-400/20 bg-blue-500/10 px-2.5 py-2 text-[10px] text-blue-100">
            This is a clone workspace. Changes stay isolated here until you raise a PR back to the original project.
          </div>
        )}

        {!canReview && !currentProject?.isExternalClone && (
          <div className="mt-2 rounded-lg border border-editor-border bg-editor-bg px-2.5 py-2 text-[10px] text-editor-muted flex items-start gap-2">
            <ShieldAlert size={12} className="mt-0.5 shrink-0" />
            Review-only members can view PR state here, but only project reviewers and owners can change statuses.
          </div>
        )}
      </div>

      <div className="px-3 pt-3">
        <GitHubSection />
      </div>

      <div className="px-3 py-2 border-b border-editor-border flex items-center gap-1">
        {(['all', 'incoming', 'outgoing'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-2.5 py-1 rounded text-[10px] capitalize transition-colors ${
              filter === value
                ? 'bg-editor-bg text-editor-text border border-editor-border'
                : 'text-editor-muted hover:text-editor-text'
            }`}
          >
            {value}
          </button>
        ))}
        <div className="flex-1" />
        {currentProject?.isExternalClone && (
          <button
            className="btn-primary text-[10px]"
            onClick={() => setShowComposer((prev) => !prev)}
          >
            {showComposer ? 'Close' : 'Raise PR'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {showComposer && <PullRequestComposer onClose={() => setShowComposer(false)} />}

        {pullRequestsQuery.isLoading ? (
          <div className="text-[11px] text-editor-muted text-center py-8">
            Loading CloudLab pull requests…
          </div>
        ) : pullRequestsQuery.isError ? (
          <div className="text-[11px] text-red-300 border border-red-500/20 rounded-lg bg-red-500/10 p-3">
            Could not load pull requests for this project.
          </div>
        ) : filteredPullRequests.length === 0 ? (
          <div className="border border-editor-border rounded-lg bg-editor-bg p-4 text-center">
            <CircleDot size={16} className="mx-auto mb-2 text-editor-muted opacity-60" />
            <p className="text-[11px] text-editor-text">No pull requests in this view</p>
            <p className="text-[10px] text-editor-muted mt-1">
              {currentProject?.isExternalClone
                ? 'Raise a CloudLab PR when your clone is ready for review.'
                : 'Incoming and outgoing CloudLab PRs will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPullRequests.map((pullRequest: PullRequest) => (
              <PullRequestCard
                key={pullRequest.id}
                pullRequest={pullRequest}
                currentProjectId={currentProject!.id}
                canReview={canReview}
                canMerge={canMerge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
