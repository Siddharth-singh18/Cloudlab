import React, { useEffect } from 'react'
import { Files, Search, GitBranch, Puzzle, Terminal, Settings } from 'lucide-react'
import { useStore } from '../../store'
import { useShallow } from 'zustand/react/shallow'
import { FileTree } from '../FileTree/FileTree'
import { SearchPanel } from './SearchPanel'
import { GitPanel } from './GitPanel'
import { ExtensionsPanel } from './ExtensionsPanel'

const ICONS = [
  { id: 'files',      icon: Files,     title: 'Explorer (⌘⇧E)' },
  { id: 'search',     icon: Search,    title: 'Search (⌘⇧F)' },
  { id: 'git',        icon: GitBranch, title: 'Source Control (⌘⇧G)' },
  { id: 'extensions', icon: Puzzle,    title: 'Extensions (⌘⇧X)' },
] as const

export function Sidebar() {
  const {
    activeSidebarPanel, setActiveSidebarPanel,
    bottomPanelOpen, setBottomPanelOpen, setBottomPanelTab,
  } = useStore(useShallow(state => ({
    activeSidebarPanel: state.activeSidebarPanel,
    setActiveSidebarPanel: state.setActiveSidebarPanel,
    bottomPanelOpen: state.bottomPanelOpen,
    setBottomPanelOpen: state.setBottomPanelOpen,
    setBottomPanelTab: state.setBottomPanelTab
  })))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return
      const key = e.key.toLowerCase()
      if (key === 'e') { e.preventDefault(); setActiveSidebarPanel(activeSidebarPanel === 'files'      ? null : 'files') }
      if (key === 'f') { e.preventDefault(); setActiveSidebarPanel(activeSidebarPanel === 'search'     ? null : 'search') }
      if (key === 'g') { e.preventDefault(); setActiveSidebarPanel(activeSidebarPanel === 'git'        ? null : 'git') }
      if (key === 'x') { e.preventDefault(); setActiveSidebarPanel(activeSidebarPanel === 'extensions' ? null : 'extensions') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeSidebarPanel, setActiveSidebarPanel])

  return (
    <>
      {/* Icon strip */}
      <div className="w-11 bg-editor-surface border-r border-editor-border flex flex-col items-center py-2 gap-1 shrink-0 z-10">
        {ICONS.map(({ id, icon: Icon, title }) => (
          <button
            key={id}
            title={title}
            onClick={() => setActiveSidebarPanel(activeSidebarPanel === id ? null : id)}
            className={`sidebar-icon ${activeSidebarPanel === id ? 'active' : ''}`}
          >
            <Icon size={18} />
          </button>
        ))}
        <div className="flex-1" />
        <button
          title="Toggle Terminal (⌘`)"
          onClick={() => { setBottomPanelOpen(!bottomPanelOpen); setBottomPanelTab('terminal') }}
          className={`sidebar-icon ${bottomPanelOpen ? 'text-editor-accent' : ''}`}
        >
          <Terminal size={18} />
        </button>
        <button title="Settings" className="sidebar-icon">
          <Settings size={18} />
        </button>
      </div>

      {/* Panels */}
      <FileTree />
      <SearchPanel />
      <GitPanel />
      <ExtensionsPanel />
    </>
  )
}
