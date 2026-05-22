import axios from 'axios'
import toast from 'react-hot-toast'


// export const api = axios.create({
//   baseURL: '/api',
//   withCredentials: true,
// })

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else {
      const msg = err.response?.data?.error || err.message || 'An unexpected error occurred'
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => api.get('/projects').then((r) => r.data),
  get: (id: string) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data: { name: string; description?: string; language: string; isPublic?: boolean }) =>
    api.post('/projects', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
  clone: (id: string) => api.post(`/projects/${id}/clone`).then((r) => r.data),
}

// ─── Files ────────────────────────────────────────────────────────────────────
export const filesApi = {
  tree: (projectId: string) =>
    api.get(`/projects/${projectId}/files`).then((r) => r.data),
  read: (projectId: string, filePath: string) =>
    api.get(`/projects/${projectId}/files/content`, { params: { path: filePath } }).then((r) => r.data),
  write: (projectId: string, filePath: string, content: string) =>
    api.put(`/projects/${projectId}/files/content`, { path: filePath, content }).then((r) => r.data),
  create: (projectId: string, path: string, type: 'file' | 'folder') =>
    api.post(`/projects/${projectId}/files`, { path, type }).then((r) => r.data),
  delete: (projectId: string, path: string) =>
    api.delete(`/projects/${projectId}/files`, { params: { path } }).then((r) => r.data),
  rename: (projectId: string, oldPath: string, newPath: string) =>
    api.patch(`/projects/${projectId}/files`, { oldPath, newPath }).then((r) => r.data),
  duplicate: (projectId: string, sourcePath: string, targetPath?: string) =>
    api.post(`/projects/${projectId}/files/duplicate`, { sourcePath, targetPath }).then((r) => r.data),
}

// ─── Review ───────────────────────────────────────────────────────────────────
export const reviewApi = {
  list: (projectId: string) =>
    api.get(`/projects/${projectId}/reviews`).then((r) => r.data),
  get: (reviewId: string) =>
    api.get(`/reviews/${reviewId}`).then((r) => r.data),
  create: (projectId: string, data: { title: string; description?: string }) =>
    api.post(`/projects/${projectId}/reviews`, data).then((r) => r.data),
  merge: (reviewId: string) =>
    api.post(`/reviews/${reviewId}/merge`).then((r) => r.data),
  close: (reviewId: string) =>
    api.post(`/reviews/${reviewId}/close`).then((r) => r.data),
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export const commentsApi = {
  list: (reviewId: string) =>
    api.get(`/reviews/${reviewId}/comments`).then((r) => r.data),
  create: (reviewId: string, data: {
    filePath: string; lineStart: number; lineEnd: number; body: string
  }) => api.post(`/reviews/${reviewId}/comments`, data).then((r) => r.data),
  resolve: (commentId: string) =>
    api.patch(`/comments/${commentId}/resolve`).then((r) => r.data),
  reply: (commentId: string, body: string) =>
    api.post(`/comments/${commentId}/replies`, { body }).then((r) => r.data),
}

// ─── Suggestions ──────────────────────────────────────────────────────────────
export const suggestionsApi = {
  list: (reviewId: string) =>
    api.get(`/reviews/${reviewId}/suggestions`).then((r) => r.data),
  create: (reviewId: string, data: {
    filePath: string; lineStart: number; lineEnd: number;
    originalCode: string; suggestedCode: string
  }) => api.post(`/reviews/${reviewId}/suggestions`, data).then((r) => r.data),
  accept: (suggestionId: string) =>
    api.post(`/suggestions/${suggestionId}/accept`).then((r) => r.data),
  reject: (suggestionId: string) =>
    api.post(`/suggestions/${suggestionId}/reject`).then((r) => r.data),
}

// ─── Project review state ────────────────────────────────────────────────────
export const projectReviewApi = {
  comments: (projectId: string) =>
    api.get(`/projects/${projectId}/comments`).then((r) => r.data),
  createComment: (projectId: string, data: {
    filePath: string; lineStart: number; lineEnd: number; body: string
  }) => api.post(`/projects/${projectId}/comments`, data).then((r) => r.data),
  resolveComment: (commentId: string) =>
    api.patch(`/projects/comments/${commentId}/resolve`).then((r) => r.data),
  replyToComment: (commentId: string, body: string) =>
    api.post(`/projects/comments/${commentId}/replies`, { body }).then((r) => r.data),
  suggestions: (projectId: string) =>
    api.get(`/projects/${projectId}/suggestions`).then((r) => r.data),
  createSuggestion: (projectId: string, data: {
    filePath: string; lineStart: number; lineEnd: number;
    originalCode: string; suggestedCode: string
  }) => api.post(`/projects/${projectId}/suggestions`, data).then((r) => r.data),
  acceptSuggestion: (suggestionId: string) =>
    api.post(`/projects/suggestions/${suggestionId}/accept`).then((r) => r.data),
  rejectSuggestion: (suggestionId: string) =>
    api.post(`/projects/suggestions/${suggestionId}/reject`).then((r) => r.data),
  fileStatuses: (projectId: string) =>
    api.get(`/projects/${projectId}/file-statuses`).then((r) => r.data),
}

// ─── CloudLab native PRs ─────────────────────────────────────────────────────
export const pullRequestsApi = {
  list: (projectId: string) =>
    api.get(`/projects/${projectId}/pull-requests`).then((r) => r.data),
  create: (projectId: string, data: {
    targetProjectId: string
    title: string
    description?: string
  }) => api.post(`/projects/${projectId}/pull-requests`, data).then((r) => r.data),
  updateStatus: (pullRequestId: string, data: {
    status: 'OPEN' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
    note?: string
  }) => api.patch(`/projects/pull-requests/${pullRequestId}/status`, data).then((r) => r.data),
  merge: (pullRequestId: string) =>
    api.post(`/projects/pull-requests/${pullRequestId}/merge`).then((r) => r.data),
}

// ─── Git ──────────────────────────────────────────────────────────────────────
export const gitApi = {
  status: (projectId: string) =>
    api.get(`/projects/${projectId}/git/status`).then((r) => r.data),
  branches: (projectId: string) =>
    api.get(`/projects/${projectId}/git/branches`).then((r) => r.data),
  commits: (projectId: string, branch?: string) =>
    api.get(`/projects/${projectId}/git/commits`, { params: { branch } }).then((r) => r.data),
  commit: (projectId: string, message: string, files: string[]) =>
    api.post(`/projects/${projectId}/git/commit`, { message, files }).then((r) => r.data),
  importGithub: (projectId: string, repoUrl: string) =>
    api.post(`/projects/${projectId}/git/import`, { repoUrl }).then((r) => r.data),
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  updateAvatar: (avatar: string) => api.post('/auth/avatar', { avatar }).then((r) => r.data),
}

// ─── Versions ───────────────────────────────────────────────────────────────
export const versionsApi = {
  list: (projectId: string) =>
    api.get(`/projects/${projectId}/versions`).then((r) => r.data),
  create: (projectId: string, label?: string) =>
    api.post(`/projects/${projectId}/versions`, { label }).then((r) => r.data),
  restore: (projectId: string, versionId: string) =>
    api.post(`/projects/${projectId}/versions/${versionId}/restore`).then((r) => r.data),
  delete: (projectId: string, versionId: string) =>
    api.delete(`/projects/${projectId}/versions/${versionId}`).then((r) => r.data),
}

// ─── GitHub ─────────────────────────────────────────────────────────────────
export const githubApi = {
  import: (projectId: string, repoUrl: string, branch?: string, githubToken?: string) =>
    api.post('/github/import', { projectId, githubUrl: repoUrl, branch, githubToken }).then((r) => r.data),
  push: (
    projectId: string,
    branchName?: string,
    commitMessage?: string,
    githubUrl?: string,
    githubToken?: string,
    baseBranch?: string
  ) =>
    api.post('/github/push', { projectId, branchName, commitMessage, githubUrl, githubToken, baseBranch }).then((r) => r.data),
  status: () => api.get('/github/status').then((r) => r.data),
  branches: (repoUrl: string, githubToken?: string) =>
    api.post('/github/branches', { githubUrl: repoUrl, githubToken }).then((r) => r.data),
  history: (projectId: string) =>
    api.get('/github/history', { params: { projectId } }).then((r) => r.data),
  repos: () => api.get('/github/repos').then((r) => r.data),
}

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  delete: (id: string) => api.delete(`/notifications/${id}`).then((r) => r.data),
}
