import type {
  Anthology,
  AnthologyEntry,
  AnthologyIssue,
  EntryFieldChange,
  EntryHealth,
  EntrySnapshot,
  WindowScene,
} from '@/types'

const ANTHOLOGY_KEY = 'bus_window_anthologies'

// ---------------- 存储 ----------------

export function getAllAnthologies(): Anthology[] {
  try {
    const raw = localStorage.getItem(ANTHOLOGY_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as Anthology[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeAll(list: Anthology[]): void {
  localStorage.setItem(ANTHOLOGY_KEY, JSON.stringify(list))
}

export function upsertAnthology(anthology: Anthology): void {
  const list = getAllAnthologies()
  const idx = list.findIndex((a) => a.id === anthology.id)
  if (idx >= 0) list[idx] = anthology
  else list.push(anthology)
  writeAll(list)
}

export function deleteAnthology(id: string): void {
  writeAll(getAllAnthologies().filter((a) => a.id !== id))
}

// ---------------- 快照与比对 ----------------

const SNAPSHOT_FIELDS: Array<{ key: keyof EntrySnapshot; label: string }> = [
  { key: 'segment', label: '区间' },
  { key: 'seatDirection', label: '座位方向' },
  { key: 'weather', label: '天气' },
  { key: 'signText', label: '招牌文字' },
  { key: 'treeDensity', label: '树木密度' },
  { key: 'pedestrianStatus', label: '行人状态' },
  { key: 'note', label: '观察笔记' },
  { key: 'timestamp', label: '记录时间' },
]

export function snapshotFromScene(scene: WindowScene): EntrySnapshot {
  return {
    segment: scene.segment,
    seatDirection: scene.seatDirection,
    weather: scene.weather,
    signText: scene.signText,
    treeDensity: scene.treeDensity,
    pedestrianStatus: scene.pedestrianStatus,
    note: scene.note,
    timestamp: scene.timestamp,
  }
}

export function diffSnapshot(snapshot: EntrySnapshot, scene: WindowScene): EntryFieldChange[] {
  const changes: EntryFieldChange[] = []
  for (const { key, label } of SNAPSHOT_FIELDS) {
    const from = String(snapshot[key] ?? '')
    const to = String(scene[key] ?? '')
    if (from !== to) changes.push({ label, from, to })
  }
  return changes
}

/** 最新一次发布的定格版本（versions 以最新在前保存） */
export function getLatestVersion(anthology: Anthology) {
  return anthology.versions[0] ?? null
}

// ---------------- 发布前校验 ----------------

export interface ValidateTarget {
  title: string
  theme: string
  routeName: string
  entries: AnthologyEntry[]
}

/**
 * 发布闸：标题/主题必填、同一条线路、至少三条记录、
 * 不得重复引用、不得引用不存在的记录。返回全部问题（空数组即通过）。
 */
export function validateAnthology(
  target: ValidateTarget,
  scenes: WindowScene[],
): AnthologyIssue[] {
  const issues: AnthologyIssue[] = []
  const sceneMap = new Map(scenes.map((s) => [s.id, s]))

  if (!target.title.trim()) {
    issues.push({ code: 'TITLE_EMPTY', message: '请填写线路册标题' })
  }
  if (!target.theme.trim()) {
    issues.push({ code: 'THEME_EMPTY', message: '请填写选编主题' })
  }
  if (!target.routeName.trim()) {
    issues.push({ code: 'ROUTE_EMPTY', message: '请选择一条线路' })
  }
  if (target.entries.length < 3) {
    issues.push({
      code: 'TOO_FEW_ENTRIES',
      message: `至少挑选 3 条同线路记录（当前 ${target.entries.length} 条）`,
    })
  }

  const seen = new Set<string>()
  target.entries.forEach((entry, i) => {
    const scene = sceneMap.get(entry.sceneId)
    if (!scene) {
      issues.push({
        code: 'INVALID_REFERENCE',
        entryIndex: i,
        message: `第 ${i + 1} 段引用的记录已不存在`,
      })
      return
    }
    if (seen.has(entry.sceneId)) {
      issues.push({
        code: 'DUPLICATE_SCENE',
        entryIndex: i,
        message: `第 ${i + 1} 段与前面重复引用了同一条记录（${scene.segment}）`,
      })
    }
    seen.add(entry.sceneId)
    if (target.routeName && scene.routeName !== target.routeName) {
      issues.push({
        code: 'MIXED_ROUTE',
        entryIndex: i,
        message: `第 ${i + 1} 段属于线路「${scene.routeName}」，与本册线路「${target.routeName}」不一致`,
      })
    }
  })

  return issues
}

// ---------------- 已发布册素材健康检查 ----------------

/**
 * 以最近发布版本的快照为准，逐条比对当前素材：
 * missing 素材已删除；changed 素材字段被改动；ok 一致。
 */
export function checkAnthologyHealth(
  anthology: Anthology,
  scenes: WindowScene[],
): EntryHealth[] {
  const version = getLatestVersion(anthology)
  if (!version) return []
  const sceneMap = new Map(scenes.map((s) => [s.id, s]))

  return version.entries.map((entry) => {
    const scene = sceneMap.get(entry.sceneId)
    if (!scene) {
      return { sceneId: entry.sceneId, status: 'missing' as const, changes: [] }
    }
    const snapshot = version.snapshots[entry.sceneId]
    if (!snapshot) {
      return { sceneId: entry.sceneId, status: 'ok' as const, changes: [] }
    }
    const changes = diffSnapshot(snapshot, scene)
    return {
      sceneId: entry.sceneId,
      status: changes.length > 0 ? ('changed' as const) : ('ok' as const),
      changes,
    }
  })
}

export function summarizeHealth(health: EntryHealth[]) {
  const missing = health.filter((h) => h.status === 'missing').length
  const changed = health.filter((h) => h.status === 'changed').length
  return { missing, changed, healthy: missing === 0 && changed === 0 }
}

// ---------------- 线路册生命周期（纯函数，便于测试） ----------------

export interface DraftPatch {
  title?: string
  theme?: string
  routeName?: string
  entries?: AnthologyEntry[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createAnthology(nowIso: string, routeName = ''): Anthology {
  return {
    id: crypto.randomUUID(),
    title: '',
    theme: '',
    routeName,
    status: 'draft',
    entries: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    lastSavedAt: null,
    publishedAt: null,
    currentVersion: 0,
    versions: [],
  }
}

/** 草稿自动保存：写入编辑中的内容并盖保存时间 */
export function applyDraftPatch(
  anthology: Anthology,
  patch: DraftPatch,
  nowIso: string,
): Anthology {
  return {
    ...anthology,
    title: patch.title ?? anthology.title,
    theme: patch.theme ?? anthology.theme,
    routeName: patch.routeName ?? anthology.routeName,
    entries: patch.entries ? clone(patch.entries) : anthology.entries,
    updatedAt: nowIso,
    lastSavedAt: nowIso,
  }
}

export interface PublishResult {
  ok: boolean
  issues: AnthologyIssue[]
  anthology: Anthology
}

/** 发布：先过闸校验，通过则定格快照形成新版本 */
export function publishAnthology(
  anthology: Anthology,
  scenes: WindowScene[],
  nowIso: string,
): PublishResult {
  const issues = validateAnthology(anthology, scenes)
  if (issues.length > 0) return { ok: false, issues, anthology }

  const snapshots: Record<string, EntrySnapshot> = {}
  for (const entry of anthology.entries) {
    const scene = scenes.find((s) => s.id === entry.sceneId)
    if (scene) snapshots[entry.sceneId] = snapshotFromScene(scene)
  }

  const version: Anthology['versions'][number] = {
    version: anthology.currentVersion + 1,
    title: anthology.title.trim(),
    theme: anthology.theme.trim(),
    routeName: anthology.routeName,
    entries: clone(anthology.entries),
    snapshots,
    publishedAt: nowIso,
  }

  const next: Anthology = {
    ...anthology,
    title: version.title,
    theme: version.theme,
    status: 'published',
    publishedAt: nowIso,
    updatedAt: nowIso,
    currentVersion: version.version,
    // 新版本置于最前
    versions: [version, ...anthology.versions],
  }
  return { ok: true, issues: [], anthology: next }
}

/** 退回草稿：内容不动，转为可继续编辑 */
export function unpublishAnthology(anthology: Anthology, nowIso: string): Anthology {
  if (anthology.status !== 'published') return anthology
  return {
    ...anthology,
    status: 'draft',
    updatedAt: nowIso,
    lastSavedAt: nowIso,
  }
}

export interface RestoreResult {
  ok: boolean
  reason?: string
  anthology: Anthology
}

/**
 * 恢复上一版：
 * - 草稿态：把编辑内容回滚到最近一次发布定格（versions[0]），仍是草稿；
 * - 发布态：回滚到上一个发布版（versions[1]），并将其定格为新的当前版本。
 */
export function restorePreviousVersion(
  anthology: Anthology,
  nowIso: string,
): RestoreResult {
  if (anthology.versions.length === 0) {
    return { ok: false, reason: '还没有可恢复的历史版本', anthology }
  }

  if (anthology.status === 'draft') {
    const latest = anthology.versions[0]
    return {
      ok: true,
      anthology: applyDraftPatch(
        {
          ...anthology,
          title: latest.title,
          theme: latest.theme,
          routeName: latest.routeName,
          entries: clone(latest.entries),
        },
        {},
        nowIso,
      ),
    }
  }

  const target = anthology.versions[1] ?? anthology.versions[0]
  const version = {
    ...clone(target),
    version: anthology.currentVersion + 1,
    publishedAt: nowIso,
  }
  return {
    ok: true,
    anthology: {
      ...anthology,
      title: version.title,
      theme: version.theme,
      routeName: version.routeName,
      entries: clone(version.entries),
      status: 'published',
      publishedAt: nowIso,
      updatedAt: nowIso,
      currentVersion: version.version,
      versions: [version, ...anthology.versions],
    },
  }
}
