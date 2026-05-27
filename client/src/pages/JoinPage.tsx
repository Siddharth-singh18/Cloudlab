import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Check, Users, ArrowRight, Zap, Folder, ShieldAlert } from 'lucide-react'
import { projectsApi } from '../lib/api'
import { useStore } from '../store'
import toast from 'react-hot-toast'

export function JoinPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useStore()
  
  const [error, setError] = useState<string | null>(null)

  const joinMutation = useMutation({
    mutationFn: () => projectsApi.joinWithToken(token!),
    onSuccess: (data) => {
      toast.success('Successfully joined the workspace!')
      navigate(`/ide/${data.projectId}`)
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Invalid or expired invite link.')
    }
  })

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      const currentUrl = window.location.pathname
      localStorage.setItem('redirectAfterLogin', currentUrl)
      navigate('/login')
    }
  }, [currentUser, navigate])

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={20} className="text-white fill-white" />
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">CloudLab</span>
        </div>

        <div className="bg-[#0d1326]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
          
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Users size={32} className="text-blue-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">You've been invited!</h1>
          <p className="text-[#7d8590] text-sm mb-8 leading-relaxed">
            Someone has invited you to collaborate on their CloudLab workspace. Join the team to start coding together in real-time.
          </p>

          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-left mb-6">
              <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-200">Invite Failed</h3>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {joinMutation.isPending ? 'Joining workspace...' : 'Accept Invitation & Join'}
                {!joinMutation.isPending && <ArrowRight size={16} />}
              </button>
              <button
                onClick={() => navigate('/projects')}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-colors border border-white/5"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center flex items-center justify-center gap-2 text-xs text-[#7d8590]">
          <Check size={14} className="text-green-400" /> Secure enterprise-grade collaboration
        </div>
      </div>
    </div>
  )
}
