import { create } from 'zustand'
import type { WindowScene, SceneFormData } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  updateScene as storageUpdateScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
} from '@/services/storage'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  updateScene: (id: string, patch: Partial<WindowScene>) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
}

export const useSceneStore = create<SceneState>((set, get) => {
  const reload = (selectedRoute: string) => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const currentRouteScenes = selectedRoute
      ? getScenesByRoute(selectedRoute)
      : []
    return { scenes, routeNames, currentRouteScenes }
  }

  return {
    // 创建时即从 localStorage 同步读取，首屏与刷新后无需等待
    scenes: getAllScenes(),
    routeNames: getAllRouteNames(),
    currentRouteScenes: [],
    selectedRoute: '',
    randomScene: null,

    loadAll: () => {
      set(reload(get().selectedRoute))
    },

    saveScene: (data: SceneFormData) => {
      const scene: WindowScene = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      storageSaveScene(scene)
      set(reload(get().selectedRoute))
    },

    deleteScene: (id) => {
      storageDeleteScene(id)
      set(reload(get().selectedRoute))
    },

    updateScene: (id, patch) => {
      storageUpdateScene(id, patch)
      set(reload(get().selectedRoute))
    },

    selectRoute: (routeName: string) => {
      const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
      set({ selectedRoute: routeName, currentRouteScenes })
    },

    refreshRandom: () => {
      const randomScene = getRandomScene()
      set({ randomScene })
    },
  }
})
