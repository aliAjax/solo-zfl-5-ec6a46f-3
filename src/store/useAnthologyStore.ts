import { create } from 'zustand'
import type {
  Anthology,
  AnthologyEntry,
  AnthologyIssue,
  EntryHealth,
} from '@/types'
import { getAllScenes } from '@/services/storage'
import {
  getAllAnthologies,
  upsertAnthology as storageUpsert,
  deleteAnthology as storageDelete,
  createAnthology as makeAnthology,
  applyDraftPatch,
  publishAnthology as runPublish,
  unpublishAnthology,
  restorePreviousVersion,
  checkAnthologyHealth,
  type DraftPatch,
} from '@/services/anthology'

interface AnthologyState {
  anthologies: Anthology[]
  loadAll: () => void
  /** 新建空草稿，返回其 id */
  createDraft: (routeName?: string) => string
  /** 草稿自动保存 */
  saveDraft: (id: string, patch: DraftPatch) => void
  /** 发布，返回校验问题（空数组表示成功） */
  publish: (id: string) => AnthologyIssue[]
  /** 退回草稿 */
  revertToDraft: (id: string) => void
  /** 恢复上一版，失败返回原因 */
  restorePrevious: (id: string) => string | null
  remove: (id: string) => void
  /** 已发布册素材健康（按当前版本顺序） */
  healthOf: (anthology: Anthology) => EntryHealth[]
}

const nowIso = () => new Date().toISOString()

export const useAnthologyStore = create<AnthologyState>((set) => {
  const updateOne = (id: string, updater: (a: Anthology) => Anthology) => {
    const current = getAllAnthologies().find((a) => a.id === id)
    if (!current) return
    const next = updater(current)
    storageUpsert(next)
    set({ anthologies: getAllAnthologies() })
  }

  return {
    anthologies: getAllAnthologies(),

    loadAll: () => set({ anthologies: getAllAnthologies() }),

    createDraft: (routeName = '') => {
      const anthology = makeAnthology(nowIso(), routeName)
      storageUpsert(anthology)
      set({ anthologies: getAllAnthologies() })
      return anthology.id
    },

    saveDraft: (id, patch) => {
      updateOne(id, (a) => applyDraftPatch(a, patch, nowIso()))
    },

    publish: (id) => {
      const current = getAllAnthologies().find((a) => a.id === id)
      if (!current) return [{ code: 'INVALID_REFERENCE', message: '线路册不存在' }]
      const result = runPublish(current, getAllScenes(), nowIso())
      if (!result.ok) return result.issues
      storageUpsert(result.anthology)
      set({ anthologies: getAllAnthologies() })
      return []
    },

    revertToDraft: (id) => {
      updateOne(id, (a) => unpublishAnthology(a, nowIso()))
    },

    restorePrevious: (id) => {
      const current = getAllAnthologies().find((a) => a.id === id)
      if (!current) return '线路册不存在'
      const result = restorePreviousVersion(current, nowIso())
      if (!result.ok) return result.reason ?? '无法恢复'
      storageUpsert(result.anthology)
      set({ anthologies: getAllAnthologies() })
      return null
    },

    remove: (id) => {
      storageDelete(id)
      set({ anthologies: getAllAnthologies() })
    },

    healthOf: (anthology) => checkAnthologyHealth(anthology, getAllScenes()),
  }
})

export type { AnthologyEntry }
