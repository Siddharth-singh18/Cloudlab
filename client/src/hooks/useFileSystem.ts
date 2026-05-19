import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi } from '../lib/api'
import { useStore } from '../store'
import { getLanguageFromPath } from '../lib/utils'

export function useFileTree(projectId: string | undefined) {
  const { setFileTree } = useStore()

  return useQuery({
    queryKey: ['fileTree', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const tree = await filesApi.tree(projectId)
      setFileTree(tree)
      return tree
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function useFileContent(projectId: string | undefined, filePath: string | undefined) {
  const { openTab } = useStore()

  return useQuery({
    queryKey: ['fileContent', projectId, filePath],
    queryFn: async () => {
      if (!projectId || !filePath) return null
      const { content } = await filesApi.read(projectId, filePath)

      openTab({
        path: filePath,
        name: filePath.split('/').pop()!,
        content,
        language: getLanguageFromPath(filePath),
        modified: false,
      })

      return content
    },
    enabled: !!projectId && !!filePath,
  })
}

export function useSaveFile(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const { markTabModified } = useStore()

  return useMutation({
    mutationFn: ({ filePath, content }: { filePath: string; content: string }) => {
      if (!projectId) return Promise.reject(new Error('No project'))
      return filesApi.write(projectId, filePath, content)
    },
    onSuccess: (_data, { filePath }) => {
      markTabModified(filePath, false)
      queryClient.invalidateQueries({ queryKey: ['fileContent', projectId, filePath] })
    },
  })
}

export function useCreateFile(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ path, type }: { path: string; type: 'file' | 'folder' }) => {
      if (!projectId) return Promise.reject(new Error('No project'))
      return filesApi.create(projectId, path, type)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] })
    },
  })
}

export function useDeleteFile(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const { closeTab } = useStore()

  return useMutation({
    mutationFn: (path: string) => {
      if (!projectId) return Promise.reject(new Error('No project'))
      return filesApi.delete(projectId, path)
    },
    onSuccess: (_data, path) => {
      closeTab(path)
      queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] })
    },
  })
}

export function useKeyboardSave(
  projectId: string | undefined,
  filePath: string | undefined,
  content: string | undefined
) {
  const { mutate: save } = useSaveFile(projectId)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      if (filePath && content !== undefined) {
        save({ filePath, content })
      }
    }
  }, [filePath, content, save])

  return handleKeyDown
}
