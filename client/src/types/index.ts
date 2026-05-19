// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  color: string // presence color
}

export type ProjectRole = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER' | 'public' | 'none'

export interface ProjectPermissions {
  canRead: boolean
  canWrite: boolean
  canReview: boolean
  canManage: boolean
  canMerge: boolean
}

export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  language: string
  isPublic: boolean
  sourceProjectId?: string | null
  isExternalClone?: boolean
  currentUserRole?: ProjectRole
  permissions?: ProjectPermissions
}

export type FileReviewStatus = 'UNREVIEWED' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED'

export interface FileNode {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
  projectId: string
  modified?: boolean
  language?: string
  reviewStatus?: FileReviewStatus
  openCommentCount?: number
  pendingSuggestionCount?: number
}

export interface OpenTab {
  path: string
  name: string
  content: string
  language: string
  modified: boolean
}

// ─── Review system ────────────────────────────────────────────────────────────

export interface ReviewSession {
  id: string
  projectId: string
  title: string
  description?: string
  branch: string
  status: 'open' | 'merged' | 'closed'
  authorId: string
  author: User
  collaborators: User[]
  createdAt: string
  updatedAt: string
  previewUrl?: string
  buildStatus: BuildStatus
}

export interface Comment {
  id: string
  reviewId: string
  projectId?: string
  filePath: string
  lineStart: number
  lineEnd: number
  authorId: string
  author: User
  body: string
  resolved: boolean
  createdAt: string
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  commentId: string
  authorId: string
  author: User
  body: string
  createdAt: string
}

export interface Suggestion {
  id: string
  reviewId: string
  projectId?: string
  filePath: string
  lineStart: number
  lineEnd: number
  originalCode: string
  suggestedCode: string
  authorId: string
  author: User
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

// ─── Build & runtime ──────────────────────────────────────────────────────────

export type BuildStatus = 'idle' | 'running' | 'success' | 'failed'

export interface BuildResult {
  status: BuildStatus
  errors: BuildError[]
  warnings: BuildWarning[]
  duration?: number
  timestamp: string
}

export interface BuildError {
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

export interface BuildWarning {
  file: string
  line: number
  message: string
}

// ─── Collaboration ────────────────────────────────────────────────────────────

export interface Presence {
  userId: string
  user: User
  filePath?: string
  line?: number
  column?: number
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number }
}

export interface ActivityEvent {
  id: string
  type:
    | 'edit'
    | 'comment'
    | 'suggestion'
    | 'build_pass'
    | 'build_fail'
    | 'preview_deploy'
    | 'merge'
    | 'approve'
    | 'join'
    | 'leave'
  userId: string
  user: User
  description: string
  filePath?: string
  line?: number
  timestamp: string
}

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  user: User
  body: string
  createdAt: string
}

// ─── Git ──────────────────────────────────────────────────────────────────────

export interface GitBranch {
  name: string
  current: boolean
  commit: string
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface GitStatus {
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
}

export interface PullRequest {
  id: string
  sourceProjectId: string
  targetProjectId: string
  raisedById: string
  title: string
  description?: string | null
  status: 'OPEN' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'MERGED'
  createdAt: string
  resolvedAt?: string | null
  raisedBy: User
  sourceProject: { id: string; name: string }
  targetProject: { id: string; name: string }
}

export interface ProjectVersion {
  id: string
  projectId: string
  snapshotPath: string
  label: string | null
  createdById: string
  createdBy: User
  isAuto: boolean
  createdAt: string
}

// ─── Socket events ────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'presence:update': (presences: Presence[]) => void
  'comment:new': (comment: Comment) => void
  'comment:resolved': (commentId: string) => void
  'suggestion:new': (suggestion: Suggestion) => void
  'suggestion:update': (suggestion: Suggestion) => void
  'project:comment:new': (comment: Comment) => void
  'project:comment:resolved': (commentId: string) => void
  'project:suggestion:new': (suggestion: Suggestion) => void
  'project:suggestion:update': (suggestion: Suggestion) => void
  'build:status': (result: BuildResult) => void
  'activity:event': (event: ActivityEvent) => void
  'chat:message': (message: ChatMessage) => void
  'terminal:data': (data: string) => void
  'terminal:ready': (payload: { projectId: string }) => void
  'file:saved': (payload: { path: string; savedBy: string }) => void
  'yjs:sync_reply': (payload: { update: number[] }) => void
  'yjs:update': (payload: { update: number[]; filePath: string }) => void
}

export interface ClientToServerEvents {
  'room:join': (roomId: string) => void
  'room:leave': (roomId: string) => void
  'presence:update': (presence: Partial<Presence>) => void
  'terminal:create': (payload: { projectId: string; force?: boolean }) => void
  'terminal:input': (data: string) => void
  'terminal:resize': (payload: { cols: number; rows: number }) => void
  'terminal:run': (payload: { projectId: string; command: string }) => void
  'build:trigger': (projectId: string) => void
  'chat:send': (payload: { roomId: string; body: string }) => void
}
