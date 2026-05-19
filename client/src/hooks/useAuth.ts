import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useStore } from '../store'

export function useAuth() {
  const { currentUser, setCurrentUser } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const navigate = useNavigate()

  // Bootstrap from existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !currentUser) {
      authApi.me()
        .then(user => setCurrentUser(user))
        .catch(() => localStorage.removeItem('token'))
    }
  }, []) // eslint-disable-line

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await authApi.login(email, password)
      localStorage.setItem('token', token)
      setCurrentUser(user)
      return user
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [setCurrentUser])

  const register = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { token, user } = await authApi.register(name, email, password)
      localStorage.setItem('token', token)
      setCurrentUser(user)
      return user
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [setCurrentUser])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    localStorage.removeItem('token')
    setCurrentUser(null)
    navigate('/')
  }, [navigate, setCurrentUser])

  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    login,
    register,
    logout,
  }
}
