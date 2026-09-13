export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

// ================= 线路册（窗景选编台） =================

export type AnthologyStatus = 'draft' | 'published'

/** 发布时对素材定格的快照，用于日后比对失效与变更 */
export interface EntrySnapshot {
  routeName: string
  segment: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
  seatDirection: SeatDirection
  timestamp: string
}

export interface AnthologyEntry {
  sceneId: string
  /** 该段之后的转场说明（最后一段可留空） */
  transition: string
}

/** 一次发布定格的版本 */
export interface AnthologyVersion {
  version: number
  title: string
  theme: string
  routeName: string
  entries: AnthologyEntry[]
  snapshots: Record<string, EntrySnapshot>
  publishedAt: string
}

export interface Anthology {
  id: string
  title: string
  theme: string
  routeName: string
  status: AnthologyStatus
  entries: AnthologyEntry[]
  createdAt: string
  updatedAt: string
  /** 最近一次自动保存时间（草稿态） */
  lastSavedAt: string | null
  publishedAt: string | null
  /** 当前发布版本号，未发布为 0 */
  currentVersion: number
  /** 历史发布版本，最新在前；恢复上一版时回滚到 versions[0] */
  versions: AnthologyVersion[]
}

export type IssueCode =
  | 'TITLE_EMPTY'
  | 'THEME_EMPTY'
  | 'ROUTE_EMPTY'
  | 'TOO_FEW_ENTRIES'
  | 'DUPLICATE_SCENE'
  | 'INVALID_REFERENCE'
  | 'MIXED_ROUTE'
  | 'TRANSITION_EMPTY'

export interface AnthologyIssue {
  code: IssueCode
  message: string
  /** 关联条目下标，便于在编辑器中定位 */
  entryIndex?: number
}

export type EntryHealthStatus = 'ok' | 'changed' | 'missing'

export interface EntryFieldChange {
  label: string
  from: string
  to: string
}

export interface EntryHealth {
  sceneId: string
  status: EntryHealthStatus
  changes: EntryFieldChange[]
}
