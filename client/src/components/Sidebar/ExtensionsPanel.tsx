import React, { useState } from 'react'
import { Search, Download, Check, Star } from 'lucide-react'
import { useStore } from '../../store'

const EXTENSIONS = [
  { id: 'prettier',    name: 'Prettier',         publisher: 'Prettier',     desc: 'Code formatter',                    installs: '48.2M', rating: 4.9, installed: true,  icon: '🎨' },
  { id: 'eslint',      name: 'ESLint',            publisher: 'Microsoft',    desc: 'Integrates ESLint into the IDE',    installs: '36.1M', rating: 4.7, installed: true,  icon: '🔍' },
  { id: 'gitlens',     name: 'GitLens',           publisher: 'GitKraken',    desc: 'Supercharge Git in the IDE',        installs: '22.8M', rating: 4.8, installed: false, icon: '🔮' },
  { id: 'tailwind',    name: 'Tailwind IntelliSense', publisher: 'Tailwind CSS', desc: 'Autocomplete for Tailwind classes', installs: '18.4M', rating: 4.9, installed: true,  icon: '💨' },
  { id: 'github-cop',  name: 'GitHub Copilot',    publisher: 'GitHub',       desc: 'AI pair programmer',                installs: '15.2M', rating: 4.6, installed: false, icon: '🤖' },
  { id: 'error-lens',  name: 'Error Lens',        publisher: 'Alexander',    desc: 'Highlight errors inline',           installs: '9.6M',  rating: 4.8, installed: false, icon: '🔴' },
  { id: 'todo-tree',   name: 'Todo Tree',         publisher: 'Gruntfuggly',  desc: 'Show TODO comments in a tree',     installs: '7.1M',  rating: 4.7, installed: false, icon: '📋' },
  { id: 'indent-rb',   name: 'Indent Rainbow',    publisher: 'oderwat',      desc: 'Colorise indentation levels',       installs: '6.8M',  rating: 4.8, installed: false, icon: '🌈' },
]

export function ExtensionsPanel() {
  const { activeSidebarPanel } = useStore()
  const [query, setQuery] = useState('')
  const [installed, setInstalled] = useState<Set<string>>(
    new Set(EXTENSIONS.filter(e => e.installed).map(e => e.id))
  )

  if (activeSidebarPanel !== 'extensions') return null

  const toggle = (id: string) => {
    setInstalled(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = EXTENSIONS.filter(e =>
    !query || e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.desc.toLowerCase().includes(query.toLowerCase())
  )

  const installedList = filtered.filter(e => installed.has(e.id))
  const notInstalled  = filtered.filter(e => !installed.has(e.id))

  return (
    <div className="w-64 bg-editor-surface border-r border-editor-border flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-editor-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-widest">
            Extensions
          </span>
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-editor-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search extensions…"
            className="input w-full pl-7 text-[11px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Installed */}
        {installedList.length > 0 && (
          <>
            <div className="panel-header border-b border-editor-border">
              Installed ({installedList.length})
            </div>
            {installedList.map(ext => (
              <ExtCard key={ext.id} ext={ext} isInstalled={true} onToggle={() => toggle(ext.id)} />
            ))}
          </>
        )}

        {/* Marketplace */}
        {notInstalled.length > 0 && (
          <>
            <div className="panel-header border-b border-editor-border mt-1">
              Marketplace
            </div>
            {notInstalled.map(ext => (
              <ExtCard key={ext.id} ext={ext} isInstalled={false} onToggle={() => toggle(ext.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function ExtCard({
  ext, isInstalled, onToggle
}: {
  ext: typeof EXTENSIONS[0]
  isInstalled: boolean
  onToggle: () => void
}) {
  return (
    <div className="px-3 py-2.5 border-b border-editor-border/40 hover:bg-white/5 group">
      <div className="flex items-start gap-2.5">
        <span className="text-xl shrink-0 leading-none mt-0.5">{ext.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-medium text-editor-text truncate">{ext.name}</span>
            <button
              onClick={onToggle}
              className={`shrink-0 p-1 rounded transition-colors ${
                isInstalled
                  ? 'text-editor-muted hover:text-red-400'
                  : 'text-editor-muted hover:text-editor-accent'
              }`}
              title={isInstalled ? 'Uninstall' : 'Install'}
            >
              {isInstalled
                ? <Check size={12} className="text-green-400" />
                : <Download size={12} />}
            </button>
          </div>
          <p className="text-[10px] text-editor-muted">{ext.publisher}</p>
          <p className="text-[11px] text-editor-muted mt-0.5 leading-relaxed">{ext.desc}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
              <Star size={9} className="fill-yellow-400" />
              {ext.rating}
            </span>
            <span className="text-[10px] text-editor-muted">{ext.installs}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
