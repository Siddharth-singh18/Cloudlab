import React, { useRef, useEffect, useCallback, useState } from 'react'
import MonacoEditor, { OnMount } from '@monaco-editor/react'
import { X, Circle, Cloud, CloudOff, Play } from 'lucide-react'
import { useStore } from '../../store'
import { useShallow } from 'zustand/react/shallow'
import { getLanguageFromPath, getRunCommand } from '../../lib/utils'
import { useCollaboration } from '../../hooks/useCollaboration'
import { filesApi, versionsApi } from '../../lib/api'
import { MonacoBinding } from 'y-monaco'
import * as Monaco from 'monaco-editor'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

import { loader } from '@monaco-editor/react'
loader.config({ monaco: Monaco })

const MONACO_THEME: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6e7681', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: 'f2cc60' },
    { token: 'type', foreground: '79c0ff' },
    { token: 'function', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'ffa657' },
    { token: 'operator', foreground: 'ff7b72' },
    { token: 'delimiter', foreground: 'c9d1d9' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#e6edf3',
    'editor.lineHighlightBackground': '#161b22',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#1f3a57',
    'editorCursor.foreground': '#58a6ff',
    'editorLineNumber.foreground': '#6e7681',
    'editorLineNumber.activeForeground': '#e6edf3',
    'editor.findMatchBackground': '#f2cc6080',
    'editorBracketMatch.background': '#3fb95040',
    'editorBracketMatch.border': '#3fb950',
    'editorGutter.background': '#0d1117',
    'scrollbarSlider.background': '#30363d80',
    'scrollbarSlider.hoverBackground': '#30363dcc',
    'editorWidget.background': '#161b22',
    'editorWidget.border': '#30363d',
    'input.background': '#0d1117',
    'input.border': '#30363d',
    'input.foreground': '#e6edf3',
  },
}

function EditorTabs() {
  const {
    openTabs,
    activeTabPath,
    setActiveTab,
    closeTab,
    currentProject,
    fileTree,
    setBottomPanelOpen,
    setBottomPanelTab,
    queueTerminalRun,
  } = useStore(useShallow(state => ({
    openTabs: state.openTabs,
    activeTabPath: state.activeTabPath,
    setActiveTab: state.setActiveTab,
    closeTab: state.closeTab,
    currentProject: state.currentProject,
    fileTree: state.fileTree,
    setBottomPanelOpen: state.setBottomPanelOpen,
    setBottomPanelTab: state.setBottomPanelTab,
    queueTerminalRun: state.queueTerminalRun,
  })))

  if (openTabs.length === 0) return null

  const canWrite = currentProject?.permissions?.canWrite ?? true

  const handleRun = () => {
    if (!currentProject?.id || !canWrite) return

    const command = getRunCommand(fileTree, activeTabPath)
    setBottomPanelOpen(true)
    setBottomPanelTab('terminal')
    queueTerminalRun({ projectId: currentProject.id, command, nonce: Date.now() })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] bg-editor-surface border-b border-editor-border shrink-0 min-w-0">
      <div className="flex overflow-x-auto min-w-0">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`tab ${activeTabPath === tab.path ? 'active' : ''} group shrink-0`}
          >
            <span className="text-[11px]">{tab.name}</span>
            {tab.modified && (
              <Circle size={6} className="fill-yellow-400 text-yellow-400 shrink-0" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.path) }}
              className="ml-1 opacity-0 group-hover:opacity-100 hover:text-editor-text transition-opacity rounded"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center px-2 border-l border-editor-border bg-editor-surface sticky right-0">
        <button
          onClick={handleRun}
          className="flex items-center gap-1.5 px-3 py-1 bg-editor-green hover:bg-editor-green/80 text-black rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          disabled={!canWrite || !currentProject?.id}
          title={canWrite ? 'Run current project in terminal' : 'Only editors can run commands'}
        >
          <Play size={12} fill="currentColor" />
          Run
        </button>
      </div>
    </div>
  )
}

function WelcomeScreen() {
  const setActiveSidebarPanel = useStore(state => state.setActiveSidebarPanel)
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-editor-muted select-none">
      <div className="w-16 h-16 rounded-2xl bg-editor-surface border border-editor-border flex items-center justify-center">
        <span className="text-3xl">⚡</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-editor-text mb-1">CloudLab</p>
        <p className="text-xs text-editor-muted">Collaborative Cloud IDE</p>
      </div>
      <div className="flex flex-col items-center gap-1.5 text-xs">
        <button
          onClick={() => setActiveSidebarPanel('files')}
          className="text-editor-accent hover:underline"
        >
          Open a file from the explorer →
        </button>
        <span className="text-editor-muted">or press Ctrl+P to search files</span>
      </div>
    </div>
  )
}

export function Editor() {
  const {
    openTabs, activeTabPath, updateTabContent, markTabModified,
    comments, suggestions, highlightedLine, setHighlightedLine, currentProject
  } = useStore(useShallow(state => ({
    openTabs: state.openTabs,
    activeTabPath: state.activeTabPath,
    updateTabContent: state.updateTabContent,
    markTabModified: state.markTabModified,
    comments: state.comments,
    suggestions: state.suggestions,
    highlightedLine: state.highlightedLine,
    setHighlightedLine: state.setHighlightedLine,
    currentProject: state.currentProject
  })))
  const queryClient = useQueryClient()

  const { updatePresence, ytext } = useCollaboration({
    projectId: currentProject?.id || 'proj-1',
    filePath: activeTabPath || 'unknown',
  })

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeTab = openTabs.find((t) => t.path === activeTabPath)
  const canWrite = currentProject?.permissions?.canWrite ?? true
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const saveFileMutation = useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      if (!currentProject?.id) throw new Error('No project')
      return filesApi.write(currentProject.id, path, content)
    },
    onSuccess: () => {
      setSaveStatus('saved')
      setLastSaved(new Date())
    },
    onError: () => {
      setSaveStatus('unsaved')
    },
  })

  const activeTabRef = useRef(activeTab)
  const activeTabPathRef = useRef(activeTabPath)
  const canWriteRef = useRef(canWrite)
  const updateTabContentRef = useRef(updateTabContent)
  const markTabModifiedRef = useRef(markTabModified)
  const saveFileMutationRef = useRef(saveFileMutation)

  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  useEffect(() => { activeTabPathRef.current = activeTabPath }, [activeTabPath])
  useEffect(() => { canWriteRef.current = canWrite }, [canWrite])
  useEffect(() => { updateTabContentRef.current = updateTabContent }, [updateTabContent])
  useEffect(() => { markTabModifiedRef.current = markTabModified }, [markTabModified])
  useEffect(() => { saveFileMutationRef.current = saveFileMutation }, [saveFileMutation])

  const handleContentChange = useCallback((value: string | undefined) => {
    const path = activeTabPathRef.current
    const canWrite = canWriteRef.current
    if (!path || !canWrite || value === undefined) return
    
    updateTabContentRef.current(path, value)
    setSaveStatus('unsaved')

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving')
      saveFileMutationRef.current.mutate({ path, content: value })
    }, 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab) {
      setSaveStatus(activeTab.modified ? 'unsaved' : 'saved')
    }
  }, [activeTabPath])

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Register custom theme
    monaco.editor.defineTheme('cloudlab-dark', MONACO_THEME)
    monaco.editor.setTheme('cloudlab-dark')

    // Bind Yjs to Monaco
    if (ytext) {
      // If Yjs text is empty but we have local content, initialize it
      if (ytext.length === 0 && activeTab?.content) {
        ytext.insert(0, activeTab.content)
      }
      bindingRef.current = new MonacoBinding(ytext, editor.getModel()!, new Set([editor]))
    }

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const path = activeTabPathRef.current
      const tab = activeTabRef.current
      if (path && tab) {
        setSaveStatus('saving')
        saveFileMutationRef.current.mutate({ path, content: tab.content })
      }
    })

    editor.onDidChangeModelContent(() => {
      const value = editor.getValue()
      handleContentChange(value)
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      // TODO: file quick-open
    })

    // Track cursor for presence
    editor.onDidChangeCursorPosition((e) => {
      updatePresence(e.position.lineNumber, e.position.column)
    })
  }, [ytext, updatePresence, handleContentChange])

  // Update decorations when comments/suggestions change
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTabPath) return

    const activeComments = comments.filter(
      (c) => c.filePath === activeTabPath && !c.resolved
    )
    const activeSuggestions = suggestions.filter(
      (s) => s.filePath === activeTabPath && s.status === 'pending'
    )

    const decorations: Monaco.editor.IModelDecoration[] = []

    activeComments.forEach((c) => {
      decorations.push({
        id: `comment-${c.id}`,
        ownerId: 0,
        range: new monaco.Range(c.lineStart, 1, c.lineEnd, 1),
        options: {
          isWholeLine: true,
          className: 'bg-blue-500/5 border-l-2 border-l-blue-500',
          glyphMarginClassName: 'comment-glyph',
          hoverMessage: { value: `💬 ${c.author.name}: ${c.body}` },
          overviewRuler: { color: '#58a6ff', position: monaco.editor.OverviewRulerLane.Left },
        },
      } as Monaco.editor.IModelDecoration)
    })

    activeSuggestions.forEach((s) => {
      decorations.push({
        id: `suggestion-${s.id}`,
        ownerId: 0,
        range: new monaco.Range(s.lineStart, 1, s.lineEnd, 1),
        options: {
          isWholeLine: true,
          className: 'bg-yellow-500/5 border-l-2 border-l-yellow-500',
          hoverMessage: { value: `✨ ${s.author.name} suggested a change` },
          overviewRuler: { color: '#d29922', position: monaco.editor.OverviewRulerLane.Right },
        },
      } as Monaco.editor.IModelDecoration)
    })

    if (highlightedLine) {
      decorations.push({
        id: 'highlight',
        ownerId: 0,
        range: new monaco.Range(highlightedLine, 1, highlightedLine, 1),
        options: {
          isWholeLine: true,
          className: 'bg-yellow-500/10',
        },
      } as Monaco.editor.IModelDecoration)
    }

    if (!decorationsRef.current) {
      decorationsRef.current = editor.createDecorationsCollection(decorations)
    } else {
      decorationsRef.current.set(decorations)
    }
  }, [comments, suggestions, activeTabPath, highlightedLine])

  // Scroll to highlighted line
  useEffect(() => {
    if (highlightedLine && editorRef.current) {
      editorRef.current.revealLineInCenter(highlightedLine)
      setTimeout(() => setHighlightedLine(null), 2000)
    }
  }, [highlightedLine, setHighlightedLine])

  useEffect(() => {
    return () => {
      // We don't call bindingRef.current.destroy() manually!
      // y-monaco automatically calls it when the monacoModel is disposed.
      // Calling it here causes a double-free crash during React unmount.
      bindingRef.current = null
      editorRef.current = null
      if (decorationsRef.current) {
        decorationsRef.current.clear()
        decorationsRef.current = null
      }
    }
  }, [activeTabPath])

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <WelcomeScreen />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <EditorTabs />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <MonacoEditor
          key={activeTab.path}
          language={getLanguageFromPath(activeTab.name)}
          defaultValue={activeTab.content}
          theme="cloudlab-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: !canWrite,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: false,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            suggestOnTriggerCharacters: true,
            snippetSuggestions: 'top',
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 12, bottom: 12 },
            glyphMargin: true,
            folding: true,
            foldingHighlight: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            renderWhitespace: 'selection',
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

      {/* Status bar */}
      <div className="h-5 bg-editor-surface border-t border-editor-border flex items-center px-3 gap-3 text-[10px] text-editor-muted">
        <span>{activeTab.language || 'TypeScript'}</span>
        <span>UTF-8</span>
        <span>LF</span>
        <div className="flex-1" />
        {!canWrite && (
          <span className="text-blue-300">Review mode</span>
        )}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-yellow-400">
            <Cloud size={10} className="animate-pulse" /> Saving...
          </span>
        )}
        {saveStatus === 'unsaved' && canWrite && (
          <span className="flex items-center gap-1 text-yellow-400">
            <CloudOff size={10} /> Unsaved
          </span>
        )}
        {saveStatus === 'saved' && canWrite && (
          <span className="flex items-center gap-1 text-editor-green">
            <Cloud size={10} /> Saved
          </span>
        )}
        <span>Spaces: 2</span>
      </div>
    </div>
  )
}
