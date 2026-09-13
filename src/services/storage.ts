import type { WindowScene } from '@/types'

const STORAGE_KEY = 'bus_window_scenes'

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WindowScene[]
  } catch {
    return []
  }
}

export function saveScene(scene: WindowScene): void {
  const scenes = getAllScenes()
  scenes.push(scene)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function deleteScene(id: string): void {
  const scenes = getAllScenes().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function getSceneById(id: string): WindowScene | null {
  return getAllScenes().find((s) => s.id === id) ?? null
}

export function updateScene(id: string, patch: Partial<WindowScene>): WindowScene | null {
  const scenes = getAllScenes()
  const idx = scenes.findIndex((s) => s.id === id)
  if (idx < 0) return null
  scenes[idx] = { ...scenes[idx], ...patch, id }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
  return scenes[idx]
}

export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeName === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAllRouteNames(): string[] {
  const scenes = getAllScenes()
  const routeSet = new Set(scenes.map((s) => s.routeName))
  return Array.from(routeSet).sort()
}

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}

/** 首次启动写入演示记录，方便直接体验选编台；已有数据时绝不覆盖 */
export function ensureSeedScenes(): WindowScene[] {
  if (localStorage.getItem(STORAGE_KEY)) return getAllScenes()
  const iso = (day: number, hour: number, minute = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - day)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  const seed: WindowScene[] = [
    {
      id: 'seed-312-1', routeName: '312路', segment: '中山门—明故宫', seatDirection: '左',
      timestamp: iso(6, 7, 32), weather: '多云', signText: '老南京汤包', treeDensity: '茂密',
      pedestrianStatus: '零星', note: '晨雾还没散，蒸屉的白汽和树影糊在一起，招牌只露出半个“汤”字。',
    },
    {
      id: 'seed-312-2', routeName: '312路', segment: '明故宫—解放路', seatDirection: '左',
      timestamp: iso(5, 18, 5), weather: '晴', signText: '修理雨伞', treeDensity: '适中',
      pedestrianStatus: '密集', note: '下班的人挤在站牌下，一块手写牌子挂在树干上，像一句过时的暗号。',
    },
    {
      id: 'seed-312-3', routeName: '312路', segment: '解放路—大行宫', seatDirection: '右',
      timestamp: iso(3, 12, 45), weather: '小雨', signText: '24小时书店', treeDensity: '稀疏',
      pedestrianStatus: '稀少', note: '雨刷刮开街面，书店橱窗里坐着一个打盹的店员，灯光比天色旧。',
    },
    {
      id: 'seed-312-4', routeName: '312路', segment: '大行宫—新街口', seatDirection: '右',
      timestamp: iso(1, 20, 15), weather: '阴', signText: '即将开业', treeDensity: '稀疏',
      pedestrianStatus: '零星', note: '夜里的“即将开业”挂了三个月，红漆被风掀起一角，像没说完的话。',
    },
    {
      id: 'seed-57-1', routeName: '57路', segment: '河西大街—奥体东门', seatDirection: '左',
      timestamp: iso(4, 9, 10), weather: '晴', signText: '城市公园', treeDensity: '茂密',
      pedestrianStatus: '稀少', note: '新修的绿化带亮得发假，慢跑的人只有一个，像还没启用的布景。',
    },
    {
      id: 'seed-57-2', routeName: '57路', segment: '奥体东门—江山大街', seatDirection: '右',
      timestamp: iso(2, 17, 40), weather: '雾', signText: '', treeDensity: '适中',
      pedestrianStatus: '零星', note: '大雾吞掉了体育馆的顶，只剩路灯一盏盏浮着，像靠岸的船。',
    },
  ]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
  return seed
}
