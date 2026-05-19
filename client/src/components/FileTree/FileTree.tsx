import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight, ChevronDown, Plus, RefreshCw, FolderOpen, Folder,
  FileCode, FileJson, FileText, File, Trash2, Edit2, FilePlus, FolderPlus,
  CheckCircle2, AlertCircle, Clock3, Copy
} from 'lucide-react'
import { useStore } from '../../store'
import { MOCK_FILE_CONTENTS } from '../../lib/mockData'
import { getLanguageFromPath, joinPath } from '../../lib/utils'
import { filesApi } from '../../lib/api'
import type { FileNode } from '../../types'

function getFileIcon(name: string, isFolder: boolean) {
  if (isFolder) return null
  const ext = name.split('.').pop()?.toLowerCase()
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || ''))
    return <FileCode size={13} className="text-blue-400 shrink-0" />
  if (ext === 'json')
    return <FileJson size={13} className="text-yellow-400 shrink-0" />
  if (ext === 'md')
    return <FileText size={13} className="text-editor-muted shrink-0" />
  return <File size={13} className="text-editor-muted shrink-0" />
}

function getReviewStatusBadge(node: FileNode) {
  if (node.type !== 'file' || !node.reviewStatus) return null

  if (node.reviewStatus === 'APPROVED') {
    return <CheckCircle2 size={12} className="text-green-400 shrink-0" />
  }
  if (node.reviewStatus === 'CHANGES_REQUESTED') {
    return <AlertCircle size={12} className="text-yellow-400 shrink-0" />
  }
  if (node.reviewStatus === 'IN_REVIEW') {
    return <Clock3 size={12} className="text-blue-400 shrink-0" />
  }
  return null
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const { expandedFolders, toggleFolder, openTab, activeTabPath, currentProject, closeTab } = useStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const queryClient = useQueryClient()
  const isExpanded = expandedFolders.has(node.path)
  const isActive = activeTabPath === node.path
  const canWrite = currentProject?.permissions?.canWrite ?? true
  const readFile = useMutation({
    mutationFn: async (filePath: string) => {
      if (!currentProject?.id) {
        return { content: MOCK_FILE_CONTENTS[filePath] || `// ${node.name}\n` }
      }
      return filesApi.read(currentProject.id, filePath)
    },
    onSuccess: ({ content }, filePath) => {
      openTab({
        path: filePath,
        name: node.name,
        content,
        language: getLanguageFromPath(node.name),
        modified: node.modified || false,
      })
    },
  })
  const invalidateTree = () => queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] })
  const createEntry = useMutation({
    mutationFn: async ({ entryPath, type }: { entryPath: string; type: 'file' | 'folder' }) => {
      if (!currentProject?.id) throw new Error('No project selected')
      return filesApi.create(currentProject.id, entryPath, type)
    },
    onSuccess: async (_data, { entryPath, type }) => {
      await invalidateTree()
      if (type === 'file') {
        openTab({
          path: entryPath,
          name: entryPath.split('/').pop() || 'new file',
          content: '',
          language: getLanguageFromPath(entryPath),
          modified: false,
        })
      }
    },
  })
  const renameEntry = useMutation({
    mutationFn: async ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
      if (!currentProject?.id) throw new Error('No project selected')
      return filesApi.rename(currentProject.id, oldPath, newPath)
    },
    onSuccess: () => invalidateTree(),
  })
  const deleteEntry = useMutation({
    mutationFn: async (targetPath: string) => {
      if (!currentProject?.id) throw new Error('No project selected')
      return filesApi.delete(currentProject.id, targetPath)
    },
    onSuccess: async () => {
      await invalidateTree()
      if (activeTabPath === node.path) {
        closeTab(node.path)
      }
    },
  })
  const duplicateEntry = useMutation({
    mutationFn: async ({ sourcePath, targetPath }: { sourcePath: string; targetPath?: string }) => {
      if (!currentProject?.id) throw new Error('No project selected')
      return filesApi.duplicate(currentProject.id, sourcePath, targetPath)
    },
    onSuccess: () => invalidateTree(),
  })

  const requestNameAndCreate = (type: 'file' | 'folder') => {
    if (!canWrite) return
    const label = type === 'file' ? 'file' : 'folder'
    const name = window.prompt(`Enter ${label} name`, type === 'file' ? 'new-file.ts' : 'new-folder')
    if (!name?.trim()) return
    const basePath = node.type === 'folder' ? node.path : node.path.split('/').slice(0, -1).join('/')
    createEntry.mutate({ entryPath: joinPath(basePath, name.trim()), type })
    setContextMenu(null)
  }

  const requestRename = () => {
    if (!canWrite) return
    const nextName = window.prompt('Rename to', node.name)
    if (!nextName?.trim() || nextName.trim() === node.name) return
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    renameEntry.mutate({ oldPath: node.path, newPath: joinPath(parentPath, nextName.trim()) })
    setContextMenu(null)
  }

  const requestDelete = () => {
    if (!canWrite) return
    const confirmed = window.confirm(`Delete ${node.name}?`)
    if (!confirmed) return
    deleteEntry.mutate(node.path)
    setContextMenu(null)
  }

  const requestDuplicate = () => {
    if (!canWrite) return
    const defaultName = (() => {
      const dotIndex = node.name.lastIndexOf('.')
      if (node.type === 'folder' || dotIndex <= 0) return `${node.name}-copy`
      return `${node.name.slice(0, dotIndex)}-copy${node.name.slice(dotIndex)}`
    })()
    const nextName = window.prompt('Duplicate as', defaultName)
    if (!nextName?.trim()) return
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    duplicateEntry.mutate({
      sourcePath: node.path,
      targetPath: joinPath(parentPath, nextName.trim()),
    })
    setContextMenu(null)
  }

  const handleClick = () => {
    if (node.type === 'folder') {
      toggleFolder(node.path)
    } else {
      readFile.mutate(node.path)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <div>
      <div
        className={`tree-item ${isActive ? 'active' : ''} group`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        data-tree-node="true"
      >
        {node.type === 'folder' ? (
          <>
            <span className="text-editor-muted shrink-0">
              {isExpanded
                ? <ChevronDown size={12} />
                : <ChevronRight size={12} />}
            </span>
            {isExpanded
              ? <FolderOpen size={13} className="text-yellow-400 shrink-0" />
              : <Folder size={13} className="text-yellow-400 shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {getFileIcon(node.name, false)}
          </>
        )}

        <span className="truncate flex-1 text-[12px]">{node.name}</span>

        {node.modified && (
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" title="Modified" />
        )}

        {getReviewStatusBadge(node)}

        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
          <button
            className="p-0.5 rounded hover:bg-white/10 text-editor-muted hover:text-editor-text"
            onClick={(e) => { e.stopPropagation(); requestRename() }}
            title="Rename"
            disabled={!canWrite}
          >
            <Edit2 size={10} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-white/10 text-editor-muted hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); requestDelete() }}
            title="Delete"
            disabled={!canWrite}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {node.type === 'folder' && isExpanded && node.children?.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={node}
          canWrite={canWrite}
          onCreateFile={() => requestNameAndCreate('file')}
          onCreateFolder={() => requestNameAndCreate('folder')}
          onDuplicate={requestDuplicate}
          onRename={requestRename}
          onDelete={requestDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

function ContextMenu({
  x, y, node, canWrite, onCreateFile, onCreateFolder, onDuplicate, onRename, onDelete, onClose
}: {
  x: number
  y: number
  node: FileNode
  canWrite: boolean
  onCreateFile: () => void
  onCreateFolder: () => void
  onDuplicate: () => void
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}) {
  React.useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div
      className="fixed z-50 bg-editor-surface border border-editor-border rounded-lg shadow-2xl py-1 min-w-[160px] text-xs"
      style={{ left: x, top: y }}
    >
      {node.type === 'folder' && (
        <>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-editor-text disabled:opacity-50"
            onClick={onCreateFile}
            disabled={!canWrite}
          >
            <FilePlus size={12} /> New File
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-editor-text disabled:opacity-50"
            onClick={onCreateFolder}
            disabled={!canWrite}
          >
            <FolderPlus size={12} /> New Folder
          </button>
          <div className="h-px bg-editor-border my-1" />
        </>
      )}
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-editor-text disabled:opacity-50"
        onClick={onDuplicate}
        disabled={!canWrite || !node.path}
      >
        <Copy size={12} /> Duplicate
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-editor-text disabled:opacity-50"
        onClick={onRename}
        disabled={!canWrite}
      >
        <Edit2 size={12} /> Rename
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-red-400 disabled:opacity-50"
        onClick={onDelete}
        disabled={!canWrite}
      >
        <Trash2 size={12} /> Delete
      </button>
    </div>
  )
}

export function FileTree() {
  const { fileTree, activeSidebarPanel, currentProject } = useStore()
  const [sidebarWidth, setSidebarWidth] = useState(208)
  const [panelContextMenu, setPanelContextMenu] = useState<{ x: number; y: number } | null>(null)
  const queryClient = useQueryClient()
  const canWrite = currentProject?.permissions?.canWrite ?? true
  const createEntry = useMutation({
    mutationFn: async ({ entryPath, type }: { entryPath: string; type: 'file' | 'folder' }) => {
      if (!currentProject?.id) throw new Error('No project selected')
      return filesApi.create(currentProject.id, entryPath, type)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] }),
  })

  if (activeSidebarPanel !== 'files') return null

  const createAtRoot = (type: 'file' | 'folder') => {
    if (!canWrite) return
    const name = window.prompt(
      `Enter ${type} name`,
      type === 'file' ? 'new-file.ts' : 'new-folder'
    )
    if (!name?.trim()) return
    createEntry.mutate({ entryPath: name.trim(), type })
  }

  const rootNode: FileNode = {
    id: `${currentProject?.id || 'root'}-root`,
    name: currentProject?.name || 'root',
    path: '',
    type: 'folder',
    projectId: currentProject?.id || 'root',
  }

  return (
    <div 
      className="bg-editor-surface border-r border-editor-border flex flex-col shrink-0 overflow-hidden relative"
      style={{ width: sidebarWidth }}
      onContextMenu={(e) => {
        if (!canWrite) return
        if ((e.target as HTMLElement).closest('[data-tree-node="true"]')) return
        e.preventDefault()
        setPanelContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
        <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-widest">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            className="sidebar-icon w-5 h-5 disabled:opacity-50"
            title="New File"
            onClick={() => createAtRoot('file')}
            disabled={!canWrite}
          >
            <Plus size={12} />
          </button>
          <button
            className="sidebar-icon w-5 h-5 disabled:opacity-50"
            title="New Folder"
            onClick={() => createAtRoot('folder')}
            disabled={!canWrite}
          >
            <FolderPlus size={12} />
          </button>
          <button
            className="sidebar-icon w-5 h-5"
            title="Refresh"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['fileTree', currentProject?.id] })}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Project name */}
      <div className="px-3 py-1.5 border-b border-editor-border">
        <span className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider">
          {currentProject?.name || 'CloudLab project'}
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>

      {panelContextMenu && (
        <ContextMenu
          x={panelContextMenu.x}
          y={panelContextMenu.y}
          node={rootNode}
          canWrite={canWrite}
          onCreateFile={() => {
            createAtRoot('file')
            setPanelContextMenu(null)
          }}
          onCreateFolder={() => {
            createAtRoot('folder')
            setPanelContextMenu(null)
          }}
          onDuplicate={() => setPanelContextMenu(null)}
          onRename={() => setPanelContextMenu(null)}
          onDelete={() => setPanelContextMenu(null)}
          onClose={() => setPanelContextMenu(null)}
        />
      )}

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-editor-accent/30 transition-colors z-20"
        onMouseDown={(e) => {
          const startX = e.clientX
          const startW = sidebarWidth
          const onMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX
            setSidebarWidth(Math.min(600, Math.max(150, startW + delta)))
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />
    </div>
  )
}
