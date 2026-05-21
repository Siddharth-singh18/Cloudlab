import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import {
  Zap, GitBranch, Users, Terminal, Eye, MessageSquare,
  Sparkles, ArrowRight, Github, Code2, MessageCircle, Triangle, LayoutDashboard
} from 'lucide-react'

const FEATURES = [
  { icon: <Terminal size={18} className="text-purple-400" />, title: 'Monaco IDE', desc: 'Full VS Code-grade editor in the browser. Syntax highlighting, IntelliSense, multi-tab.' },
  { icon: <Users size={18} className="text-green-400" />, title: 'Live Collaboration', desc: 'CRDT-powered real-time editing. See teammate cursors, selections, and edits instantly.' },
  { icon: <MessageSquare size={18} className="text-blue-400" />, title: 'Inline Review', desc: 'Comment on specific lines, suggest code changes, resolve threads — async or live.' },
  { icon: <Eye size={18} className="text-orange-400" />, title: 'Instant Preview', desc: 'See your changes live with instant preview and interactive components.' },
  { icon: <GitBranch size={18} className="text-purple-400" />, title: 'Git + GitHub', desc: 'Powerful Git integration. Branches, commits, PRs — all built in.' },
  { icon: <Sparkles size={18} className="text-teal-400" />, title: 'Suggestion Mode', desc: 'AI-powered suggestions, auto-complete, and smart refactors to boost productivity.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { currentUser } = useStore(useShallow(state => ({ currentUser: state.currentUser })))

  return (
    <div className="min-h-screen bg-[#070b14] text-[#e6edf3] font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* Background glowing orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-transparent blur-[120px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-white/5 px-8 py-4 flex items-center gap-8 relative z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">CloudLab</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#7d8590]">
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
          <a href="#" className="hover:text-white transition-colors">Blog</a>
          <a href="#" className="hover:text-white transition-colors">Changelog</a>
        </div>

        <div className="flex-1" />
        
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <button
                onClick={() => navigate('/projects')}
                className="px-4 py-2 text-[13px] font-medium border border-white/10 rounded hover:bg-white/5 transition-colors"
              >
                Dashboard
              </button>
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-[13px] font-medium border border-white/10 rounded hover:bg-white/5 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-[13px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
              >
                Start free <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[1400px] mx-auto px-8 pt-24 pb-32 flex flex-col lg:flex-row items-center gap-16 relative z-10">
        
        {/* Left Column - Copy */}
        <div className="flex-1 lg:max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d1629] border border-[#1e2d4a] text-blue-400 text-xs font-medium mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse_dot" />
            Now in beta — invite-only
          </div>

          <h1 className="text-[3.5rem] leading-[1.1] font-extrabold tracking-tight mb-6 text-white">
            Code, Review &<br />
            Ship <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Together</span>
          </h1>
          
          <p className="text-lg text-[#7d8590] mb-10 leading-relaxed font-medium">
            A production-grade collaborative cloud IDE that combines the
            best of GitHub PRs, VS Code, Replit, and Figma into one
            seamless developer experience.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors shadow-xl shadow-blue-600/20"
            >
              Create workspace <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-6 py-3.5 bg-transparent border border-white/10 text-white rounded-lg font-semibold hover:bg-white/5 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>

        {/* Right Column - IDE Mockup */}
        <div className="flex-1 relative w-full aspect-[4/3] lg:aspect-auto lg:h-[550px] select-none">
          {/* Main glowing border wrapping the IDE */}
          <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 p-[1px] shadow-[0_0_80px_rgba(59,130,246,0.15)]">
            <div className="absolute inset-0 bg-[#0d1117] rounded-xl" />
            
            {/* IDE Interface */}
            <div className="relative h-full flex flex-col rounded-xl overflow-hidden bg-[#0d1117] shadow-2xl">
              {/* IDE Header Tabs */}
              <div className="flex items-center bg-[#161b22] border-b border-white/5 text-[11px] font-mono text-[#7d8590]">
                <div className="px-4 py-2 border-r border-white/5 font-semibold text-[#e6edf3]">EXPLORER</div>
                <div className="px-4 py-2 border-r border-white/5 flex items-center gap-1.5"><Code2 size={12}/> api.ts</div>
                <div className="px-4 py-2 bg-[#0d1117] border-t border-t-blue-500 text-blue-400 flex items-center gap-1.5"><LayoutDashboard size={12}/> Button.tsx</div>
                <div className="px-4 py-2 border-r border-white/5 flex items-center gap-1.5"><Terminal size={12}/> Dashboard.tsx</div>
              </div>
              
              <div className="flex flex-1 overflow-hidden">
                {/* IDE Sidebar */}
                <div className="w-48 bg-[#161b22] border-r border-white/5 p-3 text-[12px] font-mono text-[#7d8590] flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-white"><ArrowRight size={10} className="rotate-90"/> my-project</div>
                  <div className="flex items-center gap-1.5 ml-3"><ArrowRight size={10} className="rotate-90"/> src</div>
                  <div className="flex items-center gap-1.5 ml-6"><ArrowRight size={10} className="rotate-90"/> components</div>
                  <div className="text-blue-400 ml-9">Button.tsx</div>
                  <div className="ml-9">Card.tsx</div>
                  <div className="ml-9">Input.tsx</div>
                  <div className="flex items-center gap-1.5 ml-3"><ArrowRight size={10}/> pages</div>
                  <div className="flex items-center gap-1.5 ml-3"><ArrowRight size={10}/> hooks</div>
                  <div className="flex items-center gap-1.5 ml-3"><ArrowRight size={10}/> utils</div>
                  <div className="flex items-center gap-1.5 ml-3"><ArrowRight size={10}/> styles</div>
                  <div className="ml-3">App.tsx</div>
                  <div className="ml-3">index.tsx</div>
                  <div className="ml-3">package.json</div>
                  <div className="ml-3">README.md</div>
                </div>

                {/* IDE Editor Area */}
                <div className="flex-1 p-4 font-mono text-[13px] leading-[1.6] bg-[#0d1117]">
                  <div className="text-[#7d8590] select-none flex">
                    <div className="w-6 text-right mr-4 opacity-50 flex flex-col">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                      <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                      <span>11</span><span>12</span><span>13</span><span>14</span><span>15</span>
                    </div>
                    <div className="text-[#e6edf3]">
                      <span className="text-[#ff7b72]">import</span> {'{'} Button {'}'} <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'@/components/ui/button'</span><br/>
                      <br/>
                      <span className="text-[#ff7b72]">export default function</span> <span className="text-[#d2a8ff]">Dashboard</span>() {'{'}<br/>
                      &nbsp;&nbsp;<span className="text-[#ff7b72]">return</span> (<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#7ee787]">div</span> <span className="text-[#79c0ff]">className</span>=<span className="text-[#a5d6ff]">"p-6"</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#7ee787]">h1</span> <span className="text-[#79c0ff]">className</span>=<span className="text-[#a5d6ff]">"text-2xl font-bold"</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Welcome to CloudLab<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-[#7ee787]">h1</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#7ee787]">p</span> <span className="text-[#79c0ff]">className</span>=<span className="text-[#a5d6ff]">"text-muted-foreground"</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Collaborate. Review. Ship.<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-[#7ee787]">p</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#7ee787]">Button</span> <span className="text-[#79c0ff]">size</span>=<span className="text-[#a5d6ff]">"lg"</span>&gt;Get Started&lt;/<span className="text-[#7ee787]">Button</span>&gt;<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-[#7ee787]">div</span>&gt;<br/>
                      &nbsp;&nbsp;)<br/>
                      {'}'}
                    </div>
                  </div>
                </div>
              </div>

              {/* IDE Bottom Panel (Review style) */}
              <div className="h-28 bg-[#161b22] border-t border-white/5 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-4 text-[10px] font-bold text-[#7d8590] tracking-wider">
                  <span className="text-[#e6edf3]">COMMENTS</span>
                  <span>ACTIVITY</span>
                </div>
                <div className="flex gap-2 items-start mt-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 shrink-0" />
                  <div className="text-[12px] text-[#e6edf3]">
                    <span className="font-semibold text-white">sarah.dev</span> <span className="text-[#7d8590] ml-1">2h ago</span>
                    <p className="mt-0.5">Looks great! Just a small suggestion on line 8.</p>
                  </div>
                </div>
                <div className="ml-7 flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-full bg-[#21262d] flex items-center justify-center shrink-0 border border-white/10"><MessageCircle size={8}/></div>
                  <div className="w-full h-6 rounded-md bg-[#0d1117] border border-white/5 px-2 flex items-center text-[#7d8590] text-[11px]">
                    Reply...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements (Avatars & Badges) */}
          <div className="absolute top-8 -right-6 w-8 h-8 bg-[#24292e] rounded-full border border-white/10 flex items-center justify-center shadow-lg animate-bounce" style={{animationDuration: '3s'}}>
            <Github size={16} className="text-white" />
          </div>
          
          <div className="absolute top-24 -left-8 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 border-2 border-[#070b14] flex items-center justify-center shadow-lg z-20">
            <span className="text-white font-bold text-xs">RS</span>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#070b14]" />
          </div>

          <div className="absolute bottom-16 -left-4 w-9 h-9 bg-black rounded-lg border border-white/10 flex items-center justify-center shadow-lg animate-pulse" style={{animationDuration: '4s'}}>
            <div className="w-4 h-4 flex flex-wrap">
              <div className="w-2 h-2 bg-[#f24e1e] rounded-tl-full rounded-bl-full" />
              <div className="w-2 h-2 bg-[#ff7262] rounded-tr-full rounded-br-full" />
              <div className="w-2 h-2 bg-[#a259ff] rounded-tl-full rounded-bl-full" />
              <div className="w-2 h-2 bg-[#1abcfe] rounded-full" />
            </div>
          </div>

          <div className="absolute bottom-32 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-[#070b14] flex items-center justify-center shadow-lg z-20">
            <span className="text-white font-bold text-sm">JS</span>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#070b14]" />
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-[1200px] mx-auto px-8 pb-32">
        <h2 className="text-3xl font-bold text-center mb-3 text-white">Everything in one place</h2>
        <p className="text-[#7d8590] text-center mb-16 font-medium">
          No more context-switching between GitHub, VS Code, Slack, and Figma.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 bg-[#0d1117]/80 backdrop-blur-sm border border-white/5 rounded-2xl hover:bg-[#161b22] hover:border-white/10 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-white/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2 text-white text-[15px]">{f.title}</h3>
              <p className="text-[14px] text-[#7d8590] leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Integrations */}
      <div className="max-w-[1200px] mx-auto px-8 pb-12">
        <div className="border-t border-white/5 pt-12 flex flex-col items-center">
          <p className="text-[13px] font-medium text-[#7d8590] mb-8">
            Built for modern teams. Trusted by developers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0">
            <div className="flex items-center gap-2 text-white font-semibold"><Github size={18} /> GitHub</div>
            <div className="flex items-center gap-2 text-[#007acc] font-semibold"><Code2 size={18} /> VS Code</div>
            <div className="flex items-center gap-2 text-[#4a154b] font-semibold"><MessageCircle size={18} /> Slack</div>
            <div className="flex items-center gap-2 text-white font-semibold">
               <div className="w-4 h-4 flex flex-wrap shrink-0">
                <div className="w-2 h-2 bg-[#f24e1e] rounded-tl-full rounded-bl-full" />
                <div className="w-2 h-2 bg-[#ff7262] rounded-tr-full rounded-br-full" />
                <div className="w-2 h-2 bg-[#a259ff] rounded-tl-full rounded-bl-full" />
                <div className="w-2 h-2 bg-[#1abcfe] rounded-full" />
              </div>
              Figma
            </div>
            <div className="flex items-center gap-2 text-[#f26207] font-semibold"><LayoutDashboard size={18} /> Replit</div>
            <div className="flex items-center gap-2 text-white font-semibold"><Triangle size={16} fill="currentColor" /> Vercel</div>
          </div>
        </div>
      </div>
    </div>
  )
}
