import React, { useEffect, Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { authApi } from './lib/api'
import { useStore } from './store'
import { useSocket } from './hooks/useSocket'
const IDELayout = lazy(() => import('./pages/IDELayout').then(m => ({ default: m.IDELayout })))
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage').then(m => ({ default: m.ProjectDetailsPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })))
const JoinPage = lazy(() => import('./pages/JoinPage').then(m => ({ default: m.JoinPage })))

function AppBootstrap() {
  const { currentUser, setCurrentUser } = useStore()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined

  useSocket(token)

  useEffect(() => {
    if (!token || currentUser) return

    authApi.me()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        localStorage.removeItem('token')
      })
  }, [token, currentUser, setCurrentUser])

  return null
}

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#161b22', color: '#e6edf3', border: '1px solid #30363d' } }} />
      <AppBootstrap />
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#070b14] text-[#e6edf3]">Loading CloudLab...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/ide/:id?" element={<IDELayout />} />
          <Route path="*" element={<IDELayout />} />
        </Routes>
      </Suspense>
    </>
  )
}
