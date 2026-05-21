import React, { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Maximize2, Minimize2, Plus, RotateCcw, Eraser, Square, Copy } from 'lucide-react'
import { useStore } from '../../store'
import { getSocket } from '../../lib/socket'
import 'xterm/css/xterm.css'

function useXterm(
  containerRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
  projectId: string | undefined,
  terminalId: string
) {
  const termRef = useRef<import('xterm').Terminal | null>(null)
  const fitRef  = useRef<import('xterm-addon-fit').FitAddon | null>(null)
  const [sessionProjectId, setSessionProjectId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!active || !containerRef.current) return

    let mounted = true
    let resizeObserver: ResizeObserver | null = null
    let socketCleanup: (() => void) | null = null

    ;(async () => {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit'),
        import('xterm-addon-web-links'),
      ])

      if (!mounted || !containerRef.current) return
      setSessionProjectId(null)
      setIsReady(false)

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 12,
        lineHeight: 1.5,
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          cursorAccent: '#0d1117',
          selectionBackground: '#264f78',
          black: '#0d1117',
          red: '#f85149',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#76e3ea',
          white: '#e6edf3',
          brightBlack: '#6e7681',
          brightRed: '#ff7b72',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#87deea',
          brightWhite: '#ffffff',
        },
        allowTransparency: true,
        scrollback: 1000,
      })

      const fit = new FitAddon()
      const links = new WebLinksAddon()
      term.loadAddon(fit)
      term.loadAddon(links)
      term.open(containerRef.current)
      requestAnimationFrame(() => fit.fit())
      term.focus()
      termRef.current = term
      fitRef.current = fit

      const socket = getSocket()
      const onData = ({ terminalId: tid, data }: { terminalId: string, data: string }) => {
        if (mounted && tid === terminalId) term.write(data)
      }
      const onReady = ({ projectId: readyProjectId, terminalId: tid }: { projectId: string, terminalId: string }) => {
        if (mounted && tid === terminalId) {
          setSessionProjectId(readyProjectId)
          setIsReady(true)
          requestAnimationFrame(() => fit.fit())
        }
      }
      const ensureTerminal = (force = false) => {
        if (!projectId) {
          term.write('\r\n\x1b[33mOpen a project to start a terminal session.\x1b[0m\r\n')
          return
        }
        setSessionProjectId(null)
        setIsReady(false)
        socket.emit('terminal:create', { projectId, terminalId, force })
        socket.emit('terminal:resize', { terminalId, cols: term.cols, rows: term.rows })
      }

      socket.on('terminal:data', onData)
      socket.on('terminal:ready', onReady)
      socket.on('connect', ensureTerminal)

      if (socket.connected) {
        ensureTerminal()
      } else {
        term.write('\r\n\x1b[33mConnecting terminal…\x1b[0m\r\n')
      }

      term.onData((data) => {
        socket.emit('terminal:input', { terminalId, data })
      })

      term.element?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          const selection = term.getSelection()
          if (selection) {
            navigator.clipboard.writeText(selection)
            e.preventDefault()
            e.stopPropagation()
          }
        }
      })

      resizeObserver = new ResizeObserver(() => {
        fit.fit()
        socket.emit('terminal:resize', { terminalId, cols: term.cols, rows: term.rows })
      })
      resizeObserver.observe(containerRef.current!)

      socketCleanup = () => {
        socket.off('terminal:data', onData)
        socket.off('terminal:ready', onReady)
        socket.off('connect', ensureTerminal)
      }
    })()

    return () => {
      mounted = false
      setSessionProjectId(null)
      setIsReady(false)
      resizeObserver?.disconnect()
      socketCleanup?.()
      termRef.current?.dispose()
      termRef.current = null
    }
  }, [active, containerRef, projectId, terminalId])

  return { termRef, fitRef, sessionProjectId, isReady }
}

function TerminalInstance({ 
  terminalId, 
  projectId, 
  active,
  onReadyStateChange
}: { 
  terminalId: string; 
  projectId: string | undefined; 
  active: boolean;
  onReadyStateChange: (isReady: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { termRef, fitRef, isReady } = useXterm(containerRef, active, projectId, terminalId)

  useEffect(() => {
    onReadyStateChange(isReady)
  }, [isReady, onReadyStateChange])

  useEffect(() => {
    if (active) {
      const timer = window.setTimeout(() => {
        fitRef.current?.fit()
        if (termRef.current) {
          getSocket().emit('terminal:resize', {
            terminalId,
            cols: termRef.current.cols,
            rows: termRef.current.rows,
          })
        }
      }, 80)
      return () => window.clearTimeout(timer)
    }
  }, [active, fitRef, termRef, terminalId])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ display: active ? 'block' : 'none' }}
    />
  )
}

export function TerminalPanel() {
  const { bottomPanelTab, setBottomPanelTab, bottomPanelOpen, setBottomPanelOpen,
          buildResult, buildStatus, currentProject,
          pendingTerminalRun, clearPendingTerminalRun } = useStore()
  const queryClient = useQueryClient()
  const [terminalHeight, setTerminalHeight] = useState(200)
  const [maximised, setMaximised] = useState(false)
  const [terminals, setTerminals] = useState<{ id: string }[]>([{ id: 'term-1' }])
  const [terminalReadyStates, setTerminalReadyStates] = useState<Record<string, boolean>>({})

  // Initialize bottomPanelTab to term-1 if it was 'terminal'
  useEffect(() => {
    if (bottomPanelTab === 'terminal') {
      setBottomPanelTab('term-1')
    }
  }, [bottomPanelTab, setBottomPanelTab])

  useEffect(() => {
    if (!currentProject?.id) return
    const socket = getSocket()
    let refreshTimer: number | null = null

    const scheduleRefresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject.id] })
      }, 1200)
    }

    socket.on('terminal:data', scheduleRefresh)
    return () => {
      socket.off('terminal:data', scheduleRefresh)
      if (refreshTimer) window.clearTimeout(refreshTimer)
    }
  }, [currentProject?.id, queryClient])

  useEffect(() => {
    if (!pendingTerminalRun || !currentProject?.id) return
    if (!bottomPanelOpen) return
    if (pendingTerminalRun.projectId !== currentProject.id) return

    const activeTerminalId = terminals.find(t => t.id === bottomPanelTab)?.id || terminals[0].id
    const socket = getSocket()
    
    if (!terminalReadyStates[activeTerminalId]) {
      const onReady = () => {
        socket.emit('terminal:run', {
          projectId: pendingTerminalRun.projectId,
          terminalId: activeTerminalId,
          command: pendingTerminalRun.command,
        })
        clearPendingTerminalRun()
      }
      
      socket.emit('terminal:create', { projectId: currentProject.id, terminalId: activeTerminalId, force: true })
      
      const onReadyWrapper = ({ projectId, terminalId }: { projectId: string, terminalId: string }) => {
        if (projectId === currentProject.id && terminalId === activeTerminalId) {
          socket.off('terminal:ready', onReadyWrapper)
          onReady()
        }
      }
      
      socket.on('terminal:ready', onReadyWrapper)
      
      const timeoutId = window.setTimeout(() => {
        socket.off('terminal:ready', onReadyWrapper)
        socket.emit('terminal:run', {
          projectId: pendingTerminalRun.projectId,
          terminalId: activeTerminalId,
          command: pendingTerminalRun.command,
        })
        clearPendingTerminalRun()
      }, 2000)
      
      return () => {
        socket.off('terminal:ready', onReadyWrapper)
        window.clearTimeout(timeoutId)
      }
    }

    const timer = window.setTimeout(() => {
      socket.emit('terminal:run', {
        projectId: pendingTerminalRun.projectId,
        terminalId: activeTerminalId,
        command: pendingTerminalRun.command,
      })
      clearPendingTerminalRun()
    }, 50)

    return () => window.clearTimeout(timer)
  }, [
    pendingTerminalRun,
    currentProject?.id,
    terminalReadyStates,
    bottomPanelOpen,
    bottomPanelTab,
    terminals,
    clearPendingTerminalRun,
  ])

  const activeTerminalId = terminals.find(t => t.id === bottomPanelTab)?.id

  const reconnectTerminal = () => {
    if (!currentProject?.id || !activeTerminalId) return
    setBottomPanelOpen(true)
    getSocket().emit('terminal:create', { projectId: currentProject.id, terminalId: activeTerminalId, force: true })
  }

  const interruptTerminal = () => {
    if (activeTerminalId) {
      getSocket().emit('terminal:input', { terminalId: activeTerminalId, data: '\u0003' })
    }
  }

  const addTerminal = () => {
    const newId = `term-${Date.now()}`
    setTerminals([...terminals, { id: newId }])
    setBottomPanelTab(newId)
    setBottomPanelOpen(true)
    if (currentProject?.id) {
      getSocket().emit('terminal:create', { projectId: currentProject.id, terminalId: newId, force: true })
    }
  }

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newTerminals = terminals.filter(t => t.id !== id)
    if (newTerminals.length === 0) {
      const defaultId = 'term-1'
      setTerminals([{ id: defaultId }])
      setBottomPanelTab(defaultId)
    } else {
      setTerminals(newTerminals)
      if (bottomPanelTab === id) {
        setBottomPanelTab(newTerminals[0].id)
      }
    }
    // Note: server clears it up if we don't reconnect or socket disconnects, 
    // but ideally we'd send a close event to free resources.
  }

  const height = maximised ? 480 : terminalHeight

  const TABS = [
    ...terminals.map((t, i) => ({ id: t.id, label: `Terminal ${i + 1}`, isTerminal: true })),
    { id: 'output',   label: 'Output', isTerminal: false },
    { id: 'build',    label: 'Build', isTerminal: false },
    { id: 'problems', label: `Problems${buildResult?.warnings.length ? ` (${buildResult.warnings.length})` : ''}`, isTerminal: false },
  ]

  const isCurrentTabReady = activeTerminalId ? terminalReadyStates[activeTerminalId] : false

  return (
    <div
      className="flex flex-col bg-editor-bg border-t border-editor-border shrink-0 overflow-hidden relative"
      style={{ height }}
    >
      <div
        className="absolute top-0 left-0 w-full h-1 cursor-ns-resize bg-transparent hover:bg-editor-accent/30 transition-colors shrink-0 z-20"
        onMouseDown={(e) => {
          const startY = e.clientY
          const startH = terminalHeight
          const onMove = (ev: MouseEvent) => {
            const delta = startY - ev.clientY
            setTerminalHeight(Math.min(600, Math.max(100, startH + delta)))
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />

      <div className="flex items-center bg-editor-surface border-b border-editor-border shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, isTerminal }) => (
          <div
            key={id}
            onClick={() => setBottomPanelTab(id)}
            className={`flex items-center px-3 py-1.5 text-[11px] border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              bottomPanelTab === id
                ? 'border-editor-text text-editor-text'
                : 'border-transparent text-editor-muted hover:text-editor-text'
            }`}
          >
            {label}
            {isTerminal && (
              <div 
                className="ml-2 hover:bg-white/10 rounded-full p-0.5" 
                onClick={(e) => closeTerminal(id, e)}
              >
                <X size={10} />
              </div>
            )}
          </div>
        ))}

        <div className="flex-1 min-w-[20px]" />

        <div className={`flex items-center gap-1 mr-2 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
          buildStatus === 'success' ? 'bg-green-400/10 text-green-400'
          : buildStatus === 'failed' ? 'bg-red-400/10 text-red-400'
          : buildStatus === 'running' ? 'bg-yellow-400/10 text-yellow-400'
          : 'bg-editor-border/30 text-editor-muted'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            buildStatus === 'success' ? 'bg-green-400'
            : buildStatus === 'failed' ? 'bg-red-400'
            : buildStatus === 'running' ? 'bg-yellow-400 animate-pulse_dot'
            : 'bg-editor-muted'
          }`} />
          {buildStatus === 'success' ? 'Build passed'
           : buildStatus === 'failed' ? 'Build failed'
           : buildStatus === 'running' ? 'Building…'
           : 'Idle'}
        </div>

        {activeTerminalId && (
          <div className="hidden md:flex items-center gap-1 mr-2 text-[10px] text-editor-muted whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${isCurrentTabReady ? 'bg-green-400' : 'bg-yellow-400 animate-pulse_dot'}`} />
            {currentProject?.name ? (
              <span>{isCurrentTabReady ? `Attached · ${currentProject.name}` : `Connecting · ${currentProject.name}`}</span>
            ) : (
              <span>No project</span>
            )}
          </div>
        )}

        <button
          onClick={interruptTerminal}
          className="sidebar-icon w-6 h-6 mr-1 shrink-0"
          title="Send Ctrl+C"
          disabled={!currentProject?.id || !activeTerminalId}
        >
          <Square size={11} />
        </button>
        <button
          onClick={reconnectTerminal}
          className="sidebar-icon w-6 h-6 mr-1 shrink-0"
          title="Reconnect terminal"
          disabled={!currentProject?.id || !activeTerminalId}
        >
          <RotateCcw size={12} />
        </button>
        <button
          onClick={addTerminal}
          className="sidebar-icon w-6 h-6 mr-1 shrink-0"
          title="New terminal session"
        >
          <Plus size={12} />
        </button>
        <button
          onClick={() => setMaximised(!maximised)}
          className="sidebar-icon w-6 h-6 mr-1 shrink-0"
          title={maximised ? 'Restore' : 'Maximise'}
        >
          {maximised ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={() => setBottomPanelOpen(false)}
          className="sidebar-icon w-6 h-6 mr-1 shrink-0"
          title="Close panel"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden pt-1 relative">
        {/* Terminals */}
        {terminals.map(term => (
          <TerminalInstance
            key={term.id}
            terminalId={term.id}
            projectId={currentProject?.id}
            active={bottomPanelTab === term.id}
            onReadyStateChange={(ready) => setTerminalReadyStates(prev => ({ ...prev, [term.id]: ready }))}
          />
        ))}

        {/* Output */}
        {bottomPanelTab === 'output' && (
          <div className="p-3 font-mono text-[11px] overflow-y-auto h-full space-y-0.5">
            <p className="text-green-400">▶  VITE v5.4.2 ready in 312ms</p>
            <p className="text-editor-muted">  Local:   http://localhost:5173/</p>
            <p className="text-editor-muted">  Network: http://192.168.1.12:5173/</p>
            <p className="text-yellow-400 mt-1">⚠ TypeScript: 2 warnings in AuthProvider.tsx</p>
          </div>
        )}

        {/* Build */}
        {bottomPanelTab === 'build' && (
          <div className="p-3 font-mono text-[11px] overflow-y-auto h-full space-y-0.5">
            <p className="text-green-400">✓ 284 modules transformed</p>
            <p className="text-editor-muted">dist/index.html          0.46 kB</p>
            <p className="text-editor-muted">dist/assets/index.js   142.8 kB │ gzip: 46.2 kB</p>
            <p className="text-green-400 mt-1">✓ built in {buildResult?.duration ?? 3420}ms</p>
            {buildResult && (
              <div className="mt-2 border-t border-editor-border pt-2">
                <p className="text-[10px] text-editor-muted">
                  Duration: {buildResult.duration}ms · {new Date(buildResult.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Problems */}
        {bottomPanelTab === 'problems' && (
          <div className="p-3 overflow-y-auto h-full">
            {buildResult?.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-1.5 border-b border-editor-border/30 text-[11px] group hover:bg-white/5 rounded px-1"
              >
                <span className="text-yellow-400 shrink-0 mt-0.5">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-editor-text">{w.message}</p>
                  <p className="text-[10px] font-mono text-editor-muted mt-0.5">
                    {w.file}:{w.line}
                  </p>
                </div>
              </div>
            ))}
            {(!buildResult || buildResult.warnings.length === 0) && (
              <p className="text-[11px] text-editor-muted text-center py-6">
                No problems detected ✓
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
