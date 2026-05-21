import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Zap, ArrowRight, Github, Mail, Lock, User as UserIcon, Cloud, Code, Shield } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, loading, error, isAuthenticated } = useAuth()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  const nextPath = (location.state as { next?: string } | null)?.next || '/projects'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(nextPath, { replace: true })
    }
  }, [isAuthenticated, navigate, nextPath])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'register') {
      if (password !== confirmPassword) {
        alert("Passwords do not match!")
        return
      }
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

  // Google/Microsoft dummy handlers
  const handleSocial = (provider: string) => {
    alert(`${provider} login not implemented yet.`)
  }

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-[#070b14] text-[#e6edf3] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Login Card */}
        <div className="w-full max-w-4xl bg-[#0a0f1c] border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10">
          
          {/* Left Panel */}
          <div className="hidden md:flex md:w-[45%] bg-[#0d1326] p-10 flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <div className="relative z-10 flex items-center gap-2 mb-16">
              <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Zap size={14} className="text-white fill-white" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">CloudLab</div>
                <div className="text-[10px] text-[#7d8590] mt-0.5">Your project. Your cloud. Your team.</div>
              </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-center">
              <h1 className="text-4xl font-bold text-white mb-4">
                Welcome<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">back</span> <span className="text-2xl">👋</span>
              </h1>
              <p className="text-[#7d8590] text-sm leading-relaxed max-w-[250px]">
                Sign in to continue building, collaborating and shipping amazing things.
              </p>

              {/* Illustration placeholder */}
              <div className="mt-12 flex justify-center items-center">
                <div className="relative w-40 h-40">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                  <div className="relative w-full h-full bg-[#111827] border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                    <Cloud size={64} className="text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel (Form) */}
          <div className="w-full md:w-[55%] p-10 lg:p-14 flex flex-col">
            <div className="flex justify-end mb-8">
              <Link to="/register" state={{ next: nextPath }} className="text-xs font-medium text-[#7d8590] hover:text-white transition-colors flex items-center gap-1">
                New here? <span className="text-blue-400">Create one</span> <ArrowRight size={12} />
              </Link>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Sign in to <span className="text-blue-400">CloudLab</span>
            </h2>
            <p className="text-sm text-[#7d8590] mb-8">
              Open your projects, create new workspaces,<br/> and jump back into the browser IDE.
            </p>

            <form className="space-y-5" onSubmit={submit}>
              <div>
                <label className="text-[12px] font-medium text-[#e6edf3] mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#7d8590] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-[#e6edf3] mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#7d8590] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="At least 8 characters"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-white/10 bg-[#0d1117] text-blue-500 focus:ring-blue-500/50" />
                  <span className="text-xs text-[#e6edf3]">Remember me</span>
                </label>
                <a href="#" className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</a>
              </div>

              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-blue-400 hover:to-indigo-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-8 relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <span className="relative px-4 text-xs text-[#7d8590] bg-[#0a0f1c]">or continue with</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button onClick={() => handleSocial('GitHub')} className="flex items-center justify-center gap-2 py-2 bg-[#0d1117] border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium">
                <Github size={16} /> GitHub
              </button>
              <button onClick={() => handleSocial('Google')} className="flex items-center justify-center gap-2 py-2 bg-[#0d1117] border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-green-500" /> Google
              </button>
              <button onClick={() => handleSocial('Microsoft')} className="flex items-center justify-center gap-2 py-2 bg-[#0d1117] border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium">
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5"><div className="bg-[#f25022]"/><div className="bg-[#7fba00]"/><div className="bg-[#00a4ef]"/><div className="bg-[#ffb900]"/></div> MS
              </button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[#7d8590]">
              <Lock size={12} /> Secured with end-to-end encryption
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Register Layout
  return (
    <div className="min-h-screen bg-[#070b14] text-[#e6edf3] flex flex-col md:flex-row font-sans">
      
      {/* Left Panel - Branding */}
      <div className="w-full md:w-1/2 p-10 lg:p-20 flex flex-col justify-center relative overflow-hidden bg-[#070b14]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">CloudLab</span>
        </div>

        <div className="relative z-10">
          <div className="inline-block px-3 py-1 mb-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            Join thousands of developers
          </div>
          
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Create your<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">CloudLab</span> account
          </h1>
          
          <p className="text-lg text-[#7d8590] mb-12 max-w-md leading-relaxed font-medium">
            Start building, collaborating, and deploying amazing projects in the cloud.
          </p>

          <div className="space-y-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <UserIcon size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Collaborate in real-time</h3>
                <p className="text-sm text-[#7d8590]">Work together with your team seamlessly.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Cloud size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Deploy instantly</h3>
                <p className="text-sm text-[#7d8590]">Ship your code to the cloud in one click.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Shield size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Secure & Reliable</h3>
                <p className="text-sm text-[#7d8590]">Enterprise-grade security you can trust.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-10 relative">
        {/* Background glow for form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-[460px] bg-[#0d1117]/80 backdrop-blur-md border border-purple-500/20 rounded-3xl p-10 shadow-2xl relative z-10">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-[#161b22] border border-white/10 rounded-2xl flex items-center justify-center mb-6">
              <UserIcon size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Create <span className="text-purple-400">your</span> account
            </h2>
            <p className="text-sm text-[#7d8590]">
              Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label className="text-[12px] font-medium text-[#e6edf3] mb-1.5 block">Full name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/5 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#7d8590] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#e6edf3] mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/5 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#7d8590] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#e6edf3] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/5 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#7d8590] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#e6edf3] mb-1.5 block">Confirm password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8590]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/5 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#7d8590] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer mt-2">
              <input type="checkbox" required className="mt-1 rounded border-white/10 bg-[#161b22] text-blue-500 focus:ring-blue-500/50" />
              <span className="text-[12px] text-[#7d8590] leading-snug">
                I agree to the <a href="#" className="text-blue-400 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
              </span>
            </label>

            {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-400 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/25 mt-4 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'} {!loading && <ArrowRight size={16} />}
            </button>
          </form>
          
          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative px-4 text-xs text-[#7d8590] bg-[#0d1117]">or continue with</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button onClick={() => handleSocial('GitHub')} className="flex items-center justify-center gap-2 py-2.5 bg-[#161b22] border border-white/5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium text-white">
              <Github size={16} /> GitHub
            </button>
            <button onClick={() => handleSocial('Google')} className="flex items-center justify-center gap-2 py-2.5 bg-[#161b22] border border-white/5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium text-white">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-green-500" /> Google
            </button>
            <button onClick={() => handleSocial('Microsoft')} className="flex items-center justify-center gap-2 py-2.5 bg-[#161b22] border border-white/5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium text-white">
              <div className="w-4 h-4 grid grid-cols-2 gap-0.5"><div className="bg-[#f25022]"/><div className="bg-[#7fba00]"/><div className="bg-[#00a4ef]"/><div className="bg-[#ffb900]"/></div> MS
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
