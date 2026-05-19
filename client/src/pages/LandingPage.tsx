import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, GitBranch, Users, Terminal, Eye, MessageSquare,
  Sparkles, ArrowRight, Check
} from 'lucide-react'

const FEATURES = [
  { icon: <Terminal size={18} />, title: 'Monaco IDE', desc: 'Full VS Code-grade editor in the browser. Syntax highlighting, IntelliSense, multi-tab.' },
  { icon: <Users size={18} />, title: 'Live Collaboration', desc: 'CRDT-powered real-time editing. See teammate cursors, selections, and edits instantly.' },
  { icon: <MessageSquare size={18} />, title: 'Inline Review', desc: 'Comment on specific lines, suggest code changes, resolve threads — async or live.' },
  { icon: <Eye size={18} />, title: 'Instant Preview', desc: 'Every project and review session gets an isolated live preview URL.' },
  { icon: <GitBranch size={18} />, title: 'Git + GitHub', desc: 'Import repos, manage branches, commit, push, and create PRs without leaving the IDE.' },
  { icon: <Sparkles size={18} />, title: 'Suggestion Mode', desc: 'Google Docs-style code suggestions. Accept or reject with one click.' },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-editor-bg text-editor-text overflow-auto">
      {/* Nav */}
      <nav className="border-b border-editor-border px-8 py-4 flex items-center gap-3">
        <div className="w-7 h-7 bg-editor-accent rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-editor-bg" />
        </div>
        <span className="font-semibold text-editor-text">DevForge</span>
        <div className="flex-1" />
        <button
          onClick={() => navigate('/login')}
          className="btn-ghost"
        >
          Sign in
        </button>
        <button
          onClick={() => navigate('/register')}
          className="btn-primary flex items-center gap-1.5"
        >
          Start free <ArrowRight size={13} />
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-editor-accent/10 border border-editor-accent/20 text-editor-accent text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-editor-accent animate-pulse_dot" />
          Now in beta — invite-only
        </div>

        <h1 className="text-5xl font-bold leading-tight mb-5">
          Code, Review &amp; Ship{' '}
          <span className="text-editor-accent">Together</span>
        </h1>
        <p className="text-lg text-editor-muted mb-10 max-w-2xl mx-auto leading-relaxed">
          A production-grade collaborative cloud IDE that combines the best of GitHub PRs,
          VS Code, Replit, and Figma into one seamless developer experience.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/register')}
            className="flex items-center gap-2 px-6 py-3 bg-editor-accent text-editor-bg rounded-lg font-medium hover:bg-blue-400 transition-colors"
          >
            Create workspace <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-6 py-3 bg-editor-surface border border-editor-border rounded-lg font-medium hover:bg-white/5 transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-2xl font-semibold text-center mb-3">Everything in one place</h2>
        <p className="text-editor-muted text-center mb-12">
          No more context-switching between GitHub, VS Code, Slack, and Figma.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-5 bg-editor-surface border border-editor-border rounded-xl hover:border-editor-accent/40 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-editor-accent/10 text-editor-accent flex items-center justify-center mb-3 group-hover:bg-editor-accent/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-medium mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-editor-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack badges */}
      <div className="border-t border-editor-border py-10 px-8">
        <p className="text-center text-[11px] text-editor-muted uppercase tracking-widest mb-6">
          Built with
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {['React', 'TypeScript', 'Monaco Editor', 'Yjs / CRDT', 'Socket.IO', 'Node.js',
            'PostgreSQL', 'Redis', 'Docker', 'Tailwind CSS'].map((t) => (
            <span
              key={t}
              className="px-3 py-1 bg-editor-surface border border-editor-border rounded-full text-xs text-editor-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
