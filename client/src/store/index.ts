import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  User, Project, FileNode, OpenTab, ReviewSession,
  Comment, Suggestion, Presence, ActivityEvent, ChatMessage,
  BuildResult, BuildStatus
} from '../types'

interface EditorState {
  // Auth
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Project
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void

  // File tree
  fileTree: FileNode[]
  setFileTree: (tree: FileNode[]) => void
  expandedFolders: Set<string>
  toggleFolder: (path: string) => void

  // Tabs & editor
  openTabs: OpenTab[]
  activeTabPath: string | null
  openTab: (tab: OpenTab) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  updateTabContent: (path: string, content: string) => void
  markTabModified: (path: string, modified: boolean) => void

  // Review
  currentReview: ReviewSession | null
  setCurrentReview: (review: ReviewSession | null) => void
  comments: Comment[]
  setComments: (comments: Comment[]) => void
  addComment: (comment: Comment) => void
  resolveComment: (commentId: string) => void
  suggestions: Suggestion[]
  setSuggestions: (suggestions: Suggestion[]) => void
  addSuggestion: (suggestion: Suggestion) => void
  updateSuggestion: (suggestion: Suggestion) => void

  // Collaboration
  presences: Presence[]
  setPresences: (presences: Presence[]) => void

  // Activity
  activity: ActivityEvent[]
  setActivity: (events: ActivityEvent[]) => void
  addActivityEvent: (event: ActivityEvent) => void

  // Chat
  chatMessages: ChatMessage[]
  setChatMessages: (messages: ChatMessage[]) => void
  addChatMessage: (msg: ChatMessage) => void

  // Build
  buildStatus: BuildStatus
  buildResult: BuildResult | null
  setBuildResult: (result: BuildResult) => void
  pendingTerminalRun: { projectId: string; command: string; nonce: number } | null
  queueTerminalRun: (payload: { projectId: string; command: string; nonce: number }) => void
  clearPendingTerminalRun: () => void

  // UI state
  activeSidebarPanel: 'files' | 'search' | 'git' | 'extensions' | null
  setActiveSidebarPanel: (panel: 'files' | 'search' | 'git' | 'extensions' | null) => void
  activeRightPanel: 'review' | 'timeline' | 'prs' | 'chat'
  setActiveRightPanel: (panel: 'review' | 'timeline' | 'prs' | 'chat') => void
  bottomPanelTab: 'terminal' | 'output' | 'build' | 'problems'
  setBottomPanelTab: (tab: 'terminal' | 'output' | 'build' | 'problems') => void
  bottomPanelOpen: boolean
  setBottomPanelOpen: (open: boolean) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
  activeView: 'editor' | 'preview' | 'diff'
  setActiveView: (view: 'editor' | 'preview' | 'diff') => void
  highlightedLine: number | null
  setHighlightedLine: (line: number | null) => void
  resetWorkspaceState: () => void
}

export const useStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    // Auth
    currentUser: null,
    setCurrentUser: (user) => set({ currentUser: user }),

    // Project
    currentProject: null,
    setCurrentProject: (project) => set({ currentProject: project }),

    // File tree
    fileTree: [],
    setFileTree: (fileTree) => set({ fileTree }),
    expandedFolders: new Set(['src', 'src/components']),
    toggleFolder: (path) =>
      set((state) => {
        const next = new Set(state.expandedFolders)
        next.has(path) ? next.delete(path) : next.add(path)
        return { expandedFolders: next }
      }),

    // Tabs
    openTabs: [],
    activeTabPath: null,
    openTab: (tab) =>
      set((state) => {
        const exists = state.openTabs.find((t) => t.path === tab.path)
        if (exists) return { activeTabPath: tab.path }
        return { openTabs: [...state.openTabs, tab], activeTabPath: tab.path }
      }),
    closeTab: (path) =>
      set((state) => {
        const tabs = state.openTabs.filter((t) => t.path !== path)
        let activeTabPath = state.activeTabPath
        if (activeTabPath === path) {
          activeTabPath = tabs.length > 0 ? tabs[tabs.length - 1].path : null
        }
        return { openTabs: tabs, activeTabPath }
      }),
    setActiveTab: (path) => set({ activeTabPath: path }),
    updateTabContent: (path, content) =>
      set((state) => ({
        openTabs: state.openTabs.map((t) =>
          t.path === path ? { ...t, content, modified: true } : t
        ),
      })),
    markTabModified: (path, modified) =>
      set((state) => ({
        openTabs: state.openTabs.map((t) =>
          t.path === path ? { ...t, modified } : t
        ),
      })),

    // Review
    currentReview: null,
    setCurrentReview: (review) => set({ currentReview: review }),
    comments: [],
    setComments: (comments) => set({ comments }),
    addComment: (comment) =>
      set((state) => ({ comments: [...state.comments, comment] })),
    resolveComment: (commentId) =>
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, resolved: true } : c
        ),
      })),
    suggestions: [],
    setSuggestions: (suggestions) => set({ suggestions }),
    addSuggestion: (suggestion) =>
      set((state) => ({ suggestions: [...state.suggestions, suggestion] })),
    updateSuggestion: (suggestion) =>
      set((state) => ({
        suggestions: state.suggestions.map((s) =>
          s.id === suggestion.id ? suggestion : s
        ),
      })),

    // Collaboration
    presences: [],
    setPresences: (presences) => set({ presences }),

    // Activity
    activity: [],
    setActivity: (activity) => set({ activity }),
    addActivityEvent: (event) =>
      set((state) => ({ activity: [event, ...state.activity].slice(0, 100) })),

    // Chat
    chatMessages: [],
    setChatMessages: (chatMessages) => set({ chatMessages }),
    addChatMessage: (msg) =>
      set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

    // Build
    buildStatus: 'idle',
    buildResult: null,
    setBuildResult: (result) =>
      set({ buildResult: result, buildStatus: result.status }),
    pendingTerminalRun: null,
    queueTerminalRun: (payload) => set({ pendingTerminalRun: payload }),
    clearPendingTerminalRun: () => set({ pendingTerminalRun: null }),

    // UI
    activeSidebarPanel: 'files',
    setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),
    activeRightPanel: 'review',
    setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
    bottomPanelTab: 'terminal',
    setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
    bottomPanelOpen: true,
    setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
    rightPanelOpen: true,
    setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
    activeView: 'editor',
    setActiveView: (view) => set({ activeView: view }),
    highlightedLine: null,
    setHighlightedLine: (line) => set({ highlightedLine: line }),
    resetWorkspaceState: () => set({
      fileTree: [],
      openTabs: [],
      activeTabPath: null,
      currentReview: null,
      comments: [],
      suggestions: [],
      activity: [],
      chatMessages: [],
      presences: [],
      buildStatus: 'idle',
      buildResult: null,
      pendingTerminalRun: null,
      highlightedLine: null,
    }),
  }))
)
