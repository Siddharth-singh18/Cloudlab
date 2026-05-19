import type {
  User, FileNode, ReviewSession, Comment, Suggestion,
  ActivityEvent, ChatMessage, BuildResult
} from '../types'

export const MOCK_USERS: User[] = [
  { id: 'user-rahul', name: 'Rahul Sharma', email: 'rahul@devforge.app', color: '#f85149' },
  { id: 'user-ananya', name: 'Ananya Gupta', email: 'ananya@devforge.app', color: '#3fb950' },
  { id: 'user-siddharth', name: 'Siddharth Singh', email: 'sid@devforge.app', color: '#ffa657' },
  { id: 'user-you', name: 'You', email: 'you@devforge.app', color: '#58a6ff' },
]

export const MOCK_FILE_TREE: FileNode[] = [
  {
    id: 'src', name: 'src', path: 'src', type: 'folder',
    projectId: 'proj-1',
    children: [
      {
        id: 'src/App.tsx', name: 'App.tsx', path: 'src/App.tsx', type: 'file',
        projectId: 'proj-1', language: 'typescript', modified: false, reviewStatus: 'IN_REVIEW',
      },
      {
        id: 'src/AuthProvider.tsx', name: 'AuthProvider.tsx', path: 'src/AuthProvider.tsx',
        type: 'file', projectId: 'proj-1', language: 'typescript', modified: true,
        reviewStatus: 'CHANGES_REQUESTED', openCommentCount: 2, pendingSuggestionCount: 1,
      },
      {
        id: 'src/useAuth.ts', name: 'useAuth.ts', path: 'src/useAuth.ts',
        type: 'file', projectId: 'proj-1', language: 'typescript', modified: false,
        reviewStatus: 'APPROVED',
      },
      {
        id: 'src/components', name: 'components', path: 'src/components', type: 'folder',
        projectId: 'proj-1',
        children: [
          { id: 'src/components/Navbar.tsx', name: 'Navbar.tsx', path: 'src/components/Navbar.tsx', type: 'file', projectId: 'proj-1', language: 'typescript', reviewStatus: 'APPROVED' },
          { id: 'src/components/LoginForm.tsx', name: 'LoginForm.tsx', path: 'src/components/LoginForm.tsx', type: 'file', projectId: 'proj-1', language: 'typescript', modified: true, reviewStatus: 'IN_REVIEW', openCommentCount: 0, pendingSuggestionCount: 0 },
        ],
      },
      {
        id: 'src/api', name: 'api', path: 'src/api', type: 'folder',
        projectId: 'proj-1',
        children: [
          { id: 'src/api/auth.ts', name: 'auth.ts', path: 'src/api/auth.ts', type: 'file', projectId: 'proj-1', language: 'typescript', reviewStatus: 'UNREVIEWED' },
        ],
      },
    ],
  },
  { id: 'package.json', name: 'package.json', path: 'package.json', type: 'file', projectId: 'proj-1', language: 'json', reviewStatus: 'UNREVIEWED' },
  { id: 'tsconfig.json', name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', projectId: 'proj-1', language: 'json', reviewStatus: 'UNREVIEWED' },
  { id: 'vite.config.ts', name: 'vite.config.ts', path: 'vite.config.ts', type: 'file', projectId: 'proj-1', language: 'typescript', reviewStatus: 'IN_REVIEW' },
]

export const MOCK_FILE_CONTENTS: Record<string, string> = {
  'src/AuthProvider.tsx': `import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, AuthState } from '../types/auth';

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TODO: add token refresh logic

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } else {
      setError(data.message);
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};`,
  'src/useAuth.ts': `import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated() {
  const { user } = useAuth();
  return !!user;
}`,
  'src/App.tsx': `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { Navbar } from './components/Navbar';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}`,
  'src/components/Navbar.tsx': `import React from 'react';
import { useAuth } from '../useAuth';
import { Link } from 'react-router-dom';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-gray-900">
        MyApp
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}`,
  'package.json': `{
  "name": "my-react-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "typescript": "^5.4.3",
    "vite": "^5.2.7",
    "@vitejs/plugin-react": "^4.2.1",
    "vitest": "^1.4.0"
  }
}`,
}

export const MOCK_REVIEW: ReviewSession = {
  id: 'review-1',
  projectId: 'proj-1',
  title: 'feat: auth system refactor',
  description: 'Refactors authentication to use proper token refresh and useCallback memoization.',
  branch: 'feature/auth-refactor',
  status: 'open',
  authorId: 'user-you',
  author: MOCK_USERS[3],
  collaborators: MOCK_USERS,
  createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  previewUrl: 'https://preview.feature-auth.devforge.app',
  buildStatus: 'success',
}

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'comment-1',
    reviewId: 'review-1',
    filePath: 'src/AuthProvider.tsx',
    lineStart: 6,
    lineEnd: 6,
    authorId: 'user-rahul',
    author: MOCK_USERS[0],
    body: 'Should we memoize this with useCallback to avoid unnecessary re-renders on every parent update?',
    resolved: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    replies: [
      {
        id: 'reply-1',
        commentId: 'comment-1',
        authorId: 'user-ananya',
        author: MOCK_USERS[1],
        body: 'Good point — login and logout are recreated every render right now. Definitely worth memoizing.',
        createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'comment-2',
    reviewId: 'review-1',
    filePath: 'src/AuthProvider.tsx',
    lineStart: 19,
    lineEnd: 19,
    authorId: 'user-siddharth',
    author: MOCK_USERS[2],
    body: 'localStorage is vulnerable to XSS attacks. We should switch to httpOnly cookies for token storage.',
    resolved: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    replies: [],
  },
  {
    id: 'comment-3',
    reviewId: 'review-1',
    filePath: 'src/useAuth.ts',
    lineStart: 4,
    lineEnd: 4,
    authorId: 'user-rahul',
    author: MOCK_USERS[0],
    body: 'Export AuthContext directly so it can be reused in tests.',
    resolved: true,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    replies: [],
  },
]

export const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: 'suggestion-1',
    reviewId: 'review-1',
    filePath: 'src/AuthProvider.tsx',
    lineStart: 12,
    lineEnd: 14,
    originalCode: `    const res = await fetch('/api/auth/login', {`,
    suggestedCode: `    let res;
    try {
      res = await fetch('/api/auth/login', {`,
    authorId: 'user-ananya',
    author: MOCK_USERS[1],
    status: 'pending',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
]

export const MOCK_ACTIVITY: ActivityEvent[] = [
  {
    id: 'act-1', type: 'build_pass', userId: 'system',
    user: { id: 'system', name: 'DevForge', email: '', color: '#3fb950' },
    description: 'Build passed in 3.42s · 284 modules',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-2', type: 'suggestion', userId: 'user-ananya', user: MOCK_USERS[1],
    description: 'suggested edit on line 12',
    filePath: 'src/AuthProvider.tsx', line: 12,
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-3', type: 'edit', userId: 'user-rahul', user: MOCK_USERS[0],
    description: 'edited AuthProvider.tsx',
    filePath: 'src/AuthProvider.tsx',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-4', type: 'comment', userId: 'user-rahul', user: MOCK_USERS[0],
    description: 'commented on line 6',
    filePath: 'src/AuthProvider.tsx', line: 6,
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-5', type: 'preview_deploy', userId: 'system',
    user: { id: 'system', name: 'DevForge', email: '', color: '#3fb950' },
    description: 'Preview deployed at preview.feature-auth.devforge.app',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-6', type: 'approve', userId: 'user-siddharth', user: MOCK_USERS[2],
    description: 'approved useAuth.ts',
    filePath: 'src/useAuth.ts',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
]

export const MOCK_CHAT: ChatMessage[] = [
  {
    id: 'msg-1', roomId: 'review-1', userId: 'user-siddharth', user: MOCK_USERS[2],
    body: 'Should we move token to httpOnly cookies instead of localStorage?',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2', roomId: 'review-1', userId: 'user-rahul', user: MOCK_USERS[0],
    body: '+1, localStorage is XSS vulnerable. Let me add a comment on line 19.',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-3', roomId: 'review-1', userId: 'user-you', user: MOCK_USERS[3],
    body: 'Agreed. Will refactor to httpOnly after this review is merged.',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
]

export const MOCK_BUILD_RESULT: BuildResult = {
  status: 'success',
  errors: [],
  warnings: [
    { file: 'src/AuthProvider.tsx', line: 9, message: "'error' is assigned but never used in catch block" },
    { file: 'src/AuthProvider.tsx', line: 21, message: "Consider using optional chaining: data?.token" },
  ],
  duration: 3420,
  timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
}
