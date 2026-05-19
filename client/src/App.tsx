import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { authApi } from './lib/api'
import { useStore } from './store'
import { useSocket } from './hooks/useSocket'
import { IDELayout } from './pages/IDELayout'
import { LandingPage } from './pages/LandingPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { AuthPage } from './pages/AuthPage'

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
      <AppBootstrap />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/ide/:id?" element={<IDELayout />} />
        <Route path="*" element={<IDELayout />} />
      </Routes>
    </>
  )
}
