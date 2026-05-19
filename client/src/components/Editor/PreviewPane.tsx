import React, { useState } from 'react'
import { RefreshCw, ExternalLink, Smartphone, Monitor, Tablet, AlertCircle } from 'lucide-react'
import { useStore } from '../../store'

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

const VIEWPORTS: Record<ViewportSize, { width: string; label: string; icon: React.ReactNode }> = {
  desktop: { width: '100%', label: 'Desktop', icon: <Monitor size={13} /> },
  tablet: { width: '768px', label: 'Tablet', icon: <Tablet size={13} /> },
  mobile: { width: '390px', label: 'Mobile', icon: <Smartphone size={13} /> },
}

export function PreviewPane() {
  const { currentReview } = useStore()
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [isLoading, setIsLoading] = useState(false)
  const previewUrl = currentReview?.previewUrl || 'http://localhost:5173'

  const reload = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 800)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-editor-bg">
      {/* Preview toolbar */}
      <div className="h-9 bg-editor-surface border-b border-editor-border flex items-center px-3 gap-2 shrink-0">
        <button onClick={reload} className="sidebar-icon w-6 h-6" title="Reload">
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>

        {/* URL bar */}
        <div className="flex-1 bg-editor-bg border border-editor-border rounded px-3 py-1 text-[11px] text-editor-muted font-mono truncate">
          {previewUrl}
        </div>

        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="sidebar-icon w-6 h-6" title="Open in tab">
          <ExternalLink size={12} />
        </a>

        {/* Viewport toggles */}
        <div className="flex items-center bg-editor-bg border border-editor-border rounded overflow-hidden">
          {(Object.keys(VIEWPORTS) as ViewportSize[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              title={VIEWPORTS[v].label}
              className={`px-2 py-1 transition-colors ${
                viewport === v ? 'bg-editor-surface text-editor-text' : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              {VIEWPORTS[v].icon}
            </button>
          ))}
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex-1 overflow-auto flex items-start justify-center bg-[#1a1a2e] p-4">
        <div
          className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
          style={{ width: VIEWPORTS[viewport].width, height: '100%', minHeight: '400px' }}
        >
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw size={20} className="text-gray-400 animate-spin" />
                <span className="text-xs text-gray-500">Loading preview…</span>
              </div>
            </div>
          ) : (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Project preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>
      </div>

      {/* Preview status bar */}
      <div className="h-5 bg-editor-surface border-t border-editor-border flex items-center px-3 gap-3 text-[10px] text-editor-muted">
        <span className="flex items-center gap-1 text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse_dot" />
          Live
        </span>
        <span>Hot reload: active</span>
        <div className="flex-1" />
        <span>{VIEWPORTS[viewport].label} · {VIEWPORTS[viewport].width}</span>
      </div>
    </div>
  )
}
