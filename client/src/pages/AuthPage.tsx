import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Zap, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, loading, error } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const nextPath = (location.state as { next?: string } | null)?.next || '/projects'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'register') {
      const user = await register(name, email, password)
      if (user) {
        navigate(nextPath, { replace: true })
      }
      return
    }

    const user = await login(email, password)
    if (user) {
      navigate(nextPath, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-editor-bg text-editor-text flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-editor-surface border border-editor-border rounded-2xl p-8 shadow-2xl">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 text-editor-text hover:text-editor-accent transition-colors"
        >
          <div className="w-8 h-8 bg-editor-accent rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-editor-bg" />
          </div>
          <div className="text-left">
            <div className="font-semibold">CloudLab</div>
            <div className="text-[11px] text-editor-muted">Your project. Your cloud. Your team.</div>
          </div>
        </button>

        <h1 className="text-2xl font-semibold mb-2">
          {mode === 'login' ? 'Sign in to CloudLab' : 'Create your CloudLab account'}
        </h1>
        <p className="text-sm text-editor-muted mb-6">
          {mode === 'login'
            ? 'Open your projects, create new workspaces, and jump back into the browser IDE.'
            : 'Create an account to start building projects in the browser.'}
        </p>

        <form className="space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <div>
              <label className="text-[11px] text-editor-muted mb-1 block">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="Siddharth"
                required
              />
            </div>
          )}
          <div>
            <label className="text-[11px] text-editor-muted mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-editor-muted mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-editor-accent text-editor-bg rounded-lg font-medium hover:bg-blue-400 transition-colors disabled:opacity-60"
          >
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? 'Sign in' : 'Create account')}
            {!loading && <ArrowRight size={15} />}
          </button>
        </form>

        <p className="text-sm text-editor-muted mt-5">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Link
            to={mode === 'login' ? '/register' : '/login'}
            state={{ next: nextPath }}
            className="text-editor-accent hover:underline"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}
