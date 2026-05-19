import React, { useState } from 'react'
import { CheckCircle, XCircle, GitMerge, FileCode } from 'lucide-react'
import { useStore } from '../../store'
import { MOCK_FILE_CONTENTS } from '../../lib/mockData'

const REVIEW_FILES = [
  { path: 'src/AuthProvider.tsx', status: 'modified' as const, additions: 8, deletions: 3 },
  { path: 'src/useAuth.ts', status: 'modified' as const, additions: 4, deletions: 1 },
  { path: 'src/components/LoginForm.tsx', status: 'modified' as const, additions: 2, deletions: 0 },
]

export function DiffView() {
  const [selectedFile, setSelectedFile] = useState(REVIEW_FILES[0].path)
  const [fileApprovals, setFileApprovals] = useState<Record<string, boolean>>({})

  const content = MOCK_FILE_CONTENTS[selectedFile] || ''
  const lines = content.split('\n')

  const toggleApproval = (path: string) => {
    setFileApprovals((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* File list */}
      <div className="w-56 border-r border-editor-border bg-editor-surface flex flex-col overflow-hidden">
        <div className="panel-header border-b border-editor-border">Changed Files</div>
        <div className="flex-1 overflow-y-auto">
          {REVIEW_FILES.map((f) => (
            <div
              key={f.path}
              onClick={() => setSelectedFile(f.path)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-editor-border/50 transition-colors ${
                selectedFile === f.path ? 'bg-editor-accent/10' : 'hover:bg-white/5'
              }`}
            >
              <FileCode size={12} className="text-editor-muted shrink-0" />
              <span className="text-[11px] text-editor-text truncate flex-1">
                {f.path.split('/').pop()}
              </span>
              <div className="flex items-center gap-1 text-[10px] shrink-0">
                <span className="text-green-400">+{f.additions}</span>
                <span className="text-red-400">-{f.deletions}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Approval summary */}
        <div className="p-3 border-t border-editor-border space-y-1.5">
          <p className="text-[10px] text-editor-muted uppercase font-semibold tracking-wider">File Approvals</p>
          {REVIEW_FILES.map((f) => (
            <div key={f.path} className="flex items-center gap-2">
              <button onClick={() => toggleApproval(f.path)}>
                {fileApprovals[f.path]
                  ? <CheckCircle size={14} className="text-green-400" />
                  : <XCircle size={14} className="text-editor-muted" />}
              </button>
              <span className="text-[11px] text-editor-muted truncate">
                {f.path.split('/').pop()}
              </span>
            </div>
          ))}
          <button className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition-colors">
            <GitMerge size={12} />
            Merge approved
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-xs bg-editor-bg">
        <div className="sticky top-0 bg-editor-surface border-b border-editor-border px-4 py-2 flex items-center gap-2">
          <FileCode size={13} className="text-blue-400" />
          <span className="text-editor-text">{selectedFile}</span>
          <span className="ml-auto text-green-400 text-[11px]">+8</span>
          <span className="text-red-400 text-[11px]">-3</span>
        </div>

        <div className="divide-y divide-editor-border/20">
          {lines.map((line, i) => {
            // Simulate diff: mark some lines as added/removed
            const lineNum = i + 1
            const isAdded = [7, 8, 9, 31, 32, 33, 34].includes(lineNum)
            const isRemoved = [7, 8].includes(lineNum) && false // for demo

            return (
              <div
                key={i}
                className={`flex group ${
                  isAdded ? 'bg-green-500/8' : isRemoved ? 'bg-red-500/8' : ''
                }`}
              >
                <div className={`w-8 text-right px-2 py-0.5 text-[11px] select-none border-r border-editor-border/30 shrink-0 ${
                  isAdded ? 'text-green-500 border-r-green-500/30' : isRemoved ? 'text-red-500' : 'text-editor-muted'
                }`}>
                  {lineNum}
                </div>
                <div className={`w-4 flex items-center justify-center text-[11px] shrink-0 ${
                  isAdded ? 'text-green-400' : isRemoved ? 'text-red-400' : 'text-transparent'
                }`}>
                  {isAdded ? '+' : isRemoved ? '-' : ' '}
                </div>
                <div className={`flex-1 px-2 py-0.5 whitespace-pre leading-5 ${
                  isAdded ? 'text-green-100' : isRemoved ? 'text-red-200' : 'text-editor-text'
                }`}>
                  {line || ' '}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
