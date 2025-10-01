import { useCallback } from 'react'
import { useTree } from '@/stores/document-chat-store'
import { captureTreeState } from '@/lib/utils/tree-state-utils'

export function useTreeState() {
  const { state, currentFolderId } = useTree()

  const getCurrentTreeState = useCallback(() => {
    return captureTreeState(state.folders, state.documents, currentFolderId)
  }, [state.folders, state.documents, currentFolderId])

  const getTreeStateForFolder = useCallback(
    (folderId: string | null) => {
      return captureTreeState(state.folders, state.documents, folderId)
    },
    [state.folders, state.documents]
  )

  return {
    getCurrentTreeState,
    getTreeStateForFolder,
    currentState: captureTreeState(
      state.folders,
      state.documents,
      currentFolderId
    ),
  }
}
