import React from 'react'
import { Cloud, CloudOff } from 'lucide-react'
import { useStore } from '../../store'
import { useShallow } from 'zustand/react/shallow'

export function StatusBar() {
  const {
    openTabs, activeTabPath, currentProject, saveStatus
  } = useStore(useShallow(state => ({
    openTabs: state.openTabs,
    activeTabPath: state.activeTabPath,
    currentProject: state.currentProject,
    saveStatus: state.saveStatus
  })))

  const activeTab = openTabs.find((t) => t.path === activeTabPath)
  const canWrite = currentProject?.permissions?.canWrite ?? true

  return (
    <div className="h-6 shrink-0 bg-[#007acc] text-white flex items-center px-3 gap-4 text-[11px] select-none z-50">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {currentProject ? (
          <span className="font-medium hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">
            {currentProject.name}
          </span>
        ) : (
          <span className="font-medium hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">
            CloudLab
          </span>
        )}
        
        {!canWrite && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Review Mode</span>
        )}
        
        {activeTab && (
          <div className="flex items-center gap-1 hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">
            {saveStatus === 'saving' && <><Cloud size={12} className="animate-pulse" /> Saving...</>}
            {saveStatus === 'unsaved' && canWrite && <><CloudOff size={12} /> Unsaved</>}
            {saveStatus === 'saved' && canWrite && <><Cloud size={12} /> Saved</>}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Right side */}
      {activeTab && (
        <div className="flex items-center gap-3">
          <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">UTF-8</span>
          <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">LF</span>
          <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">{activeTab.language || 'TypeScript'}</span>
          <span className="hover:bg-white/10 px-1 py-0.5 rounded cursor-pointer">Spaces: 2</span>
        </div>
      )}
    </div>
  )
}
