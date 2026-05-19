import React, { useState, useMemo } from 'react'
import { Search, X, ChevronRight, FileCode, CaseSensitive, Regex } from 'lucide-react'
import { useStore } from '../../store'
import { MOCK_FILE_CONTENTS } from '../../lib/mockData'
import { getLanguageFromPath } from '../../lib/utils'

interface SearchMatch {
  file: string
  line: number
  lineContent: string
  matchStart: number
  matchEnd: number
}

function highlight(text: string, query: string, caseSensitive: boolean): React.ReactNode {
  if (!query) return text
  const flags = caseSensitive ? 'g' : 'gi'
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, flags)
  const parts = text.split(re)
  return parts.map((p, i) =>
    re.test(p)
      ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm">{p}</mark>
      : p
  )
}

export function SearchPanel() {
  const { activeSidebarPanel, openTab } = useStore()
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (activeSidebarPanel !== 'search') return null

  const results = useMemo<Record<string, SearchMatch[]>>(() => {
    if (!query.trim() || query.length < 2) return {}
    const out: Record<string, SearchMatch[]> = {}

    Object.entries(MOCK_FILE_CONTENTS).forEach(([filePath, content]) => {
      const lines = content.split('\n')
      const matches: SearchMatch[] = []

      lines.forEach((lineContent, i) => {
        try {
          const flags = caseSensitive ? 'g' : 'gi'
          const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const re = new RegExp(pattern, flags)
          let m: RegExpExecArray | null
          while ((m = re.exec(lineContent)) !== null) {
            matches.push({
              file: filePath,
              line: i + 1,
              lineContent: lineContent.trim(),
              matchStart: m.index,
              matchEnd: m.index + m[0].length,
            })
            if (!re.global) break
          }
        } catch { /* invalid regex */ }
      })

      if (matches.length > 0) out[filePath] = matches
    })

    return out
  }, [query, caseSensitive, useRegex])

  const totalMatches = Object.values(results).reduce((s, arr) => s + arr.length, 0)
  const fileCount = Object.keys(results).length

  const openMatch = (match: SearchMatch) => {
    const content = MOCK_FILE_CONTENTS[match.file] || ''
    openTab({
      path: match.file,
      name: match.file.split('/').pop()!,
      content,
      language: getLanguageFromPath(match.file),
      modified: false,
    })
  }

  const toggleFile = (file: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(file) ? next.delete(file) : next.add(file)
      return next
    })
  }

  return (
    <div className="w-64 bg-editor-surface border-r border-editor-border flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-editor-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-widest">
            Search
          </span>
          <button
            className="sidebar-icon w-5 h-5 text-[10px] font-mono"
            onClick={() => setShowReplace(!showReplace)}
            title="Toggle replace"
          >
            {showReplace ? '−' : '+'}
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-editor-muted" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className="input w-full pl-7 pr-14 text-[11px]"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`p-0.5 rounded transition-colors ${caseSensitive ? 'text-editor-accent bg-editor-accent/10' : 'text-editor-muted hover:text-editor-text'}`}
              title="Match case"
            >
              <CaseSensitive size={11} />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`p-0.5 rounded transition-colors ${useRegex ? 'text-editor-accent bg-editor-accent/10' : 'text-editor-muted hover:text-editor-text'}`}
              title="Use regex"
            >
              <Regex size={11} />
            </button>
            {query && (
              <button onClick={() => setQuery('')} className="text-editor-muted hover:text-editor-text p-0.5">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Replace input */}
        {showReplace && (
          <div className="flex gap-1.5 mt-1.5">
            <input
              value={replace}
              onChange={e => setReplace(e.target.value)}
              placeholder="Replace…"
              className="input flex-1 text-[11px]"
            />
            <button
              className="btn-ghost text-[10px] px-2 shrink-0"
              title="Replace all"
              disabled={!query || !replace}
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Results summary */}
      {query.length >= 2 && (
        <div className="px-3 py-1.5 border-b border-editor-border">
          {totalMatches > 0 ? (
            <span className="text-[10px] text-editor-muted">
              {totalMatches} result{totalMatches !== 1 ? 's' : ''} in {fileCount} file{fileCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[10px] text-editor-muted">No results</span>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(results).map(([file, matches]) => {
          const isCollapsed = collapsed.has(file)
          const fileName = file.split('/').pop()!
          const dir = file.replace('/' + fileName, '')

          return (
            <div key={file}>
              {/* File header */}
              <button
                className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/5 transition-colors"
                onClick={() => toggleFile(file)}
              >
                {isCollapsed
                  ? <ChevronRight size={11} className="text-editor-muted shrink-0" />
                  : <ChevronRight size={11} className="text-editor-muted shrink-0 rotate-90" />
                }
                <FileCode size={11} className="text-blue-400 shrink-0" />
                <span className="text-[11px] font-medium text-editor-text truncate">{fileName}</span>
                <span className="ml-auto text-[10px] text-editor-muted bg-editor-bg px-1.5 rounded shrink-0">
                  {matches.length}
                </span>
              </button>

              {/* File path */}
              {!isCollapsed && (
                <div className="px-7 pb-0.5">
                  <span className="text-[10px] text-editor-muted">{dir || '/'}</span>
                </div>
              )}

              {/* Match lines */}
              {!isCollapsed && matches.map((match, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-7 py-1 hover:bg-editor-accent/10 cursor-pointer group"
                  onClick={() => openMatch(match)}
                >
                  <span className="text-[10px] font-mono text-editor-muted w-6 shrink-0 text-right pt-0.5">
                    {match.line}
                  </span>
                  <p className="text-[11px] font-mono text-editor-muted leading-relaxed truncate group-hover:text-editor-text">
                    {highlight(match.lineContent.slice(0, 80), query, caseSensitive)}
                  </p>
                </div>
              ))}
            </div>
          )
        })}

        {query.length < 2 && (
          <div className="flex flex-col items-center justify-center py-12 text-editor-muted">
            <Search size={24} className="mb-2 opacity-20" />
            <p className="text-[11px]">Type to search across files</p>
          </div>
        )}
      </div>
    </div>
  )
}
