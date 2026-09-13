import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Route as RouteIcon, Plus, Check, X, ChevronUp, ChevronDown,
  Trash2, Eye, Send, CircleAlert, CircleCheck, Save, ListOrdered,
} from 'lucide-react'
import { useAnthologyStore } from '@/store/useAnthologyStore'
import { useSceneStore } from '@/store/useSceneStore'
import { validateAnthology } from '@/services/anthology'
import { formatTimestamp } from '@/utils/sceneHelpers'
import type { AnthologyEntry, AnthologyIssue, WindowScene } from '@/types'
import SceneBlock from '@/components/SceneBlock'

const AUTOSAVE_MS = 700

export default function AnthologyEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { anthologies, loadAll, saveDraft, publish, revertToDraft } = useAnthologyStore()
  const { scenes, routeNames, loadAll: loadScenes } = useSceneStore()

  const anthology = anthologies.find((a) => a.id === id)

  const [title, setTitle] = useState(() => anthology?.title ?? '')
  const [theme, setTheme] = useState(() => anthology?.theme ?? '')
  const [routeName, setRouteName] = useState(() => anthology?.routeName ?? '')
  const [entries, setEntries] = useState<AnthologyEntry[]>(() =>
    anthology ? anthology.entries.map((e) => ({ ...e })) : [],
  )
  const [justSavedAt, setJustSavedAt] = useState<string | null>(() => anthology?.lastSavedAt ?? null)
  const [publishIssues, setPublishIssues] = useState<AnthologyIssue[] | null>(null)

  // 初次载入已有草稿时不触发自动保存
  const skipSave = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadScenes()
    loadAll()
  }, [loadScenes, loadAll])

  // 同一组件实例内切换册子时重新载入
  useEffect(() => {
    if (!anthology) return
    // 直接打开已发布册的编辑地址：进入修订即退回草稿（与“修订”按钮语义一致）
    if (anthology.status === 'published') revertToDraft(anthology.id)
    skipSave.current = true
    setTitle(anthology.title)
    setTheme(anthology.theme)
    setRouteName(anthology.routeName)
    setEntries(anthology.entries.map((e) => ({ ...e })))
    setJustSavedAt(anthology.lastSavedAt)
    setPublishIssues(null)
    // 仅在 id 变化时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 草稿自动保存（防抖）。依赖只放内容与 id，避免保存后 store 刷新引用变化造成循环
  const anthologyId = anthology?.id
  useEffect(() => {
    if (!anthologyId) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveDraft(anthologyId, { title, theme, routeName, entries })
      setJustSavedAt(new Date().toISOString())
      setPublishIssues(null)
    }, AUTOSAVE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, theme, routeName, entries, anthologyId, saveDraft])

  const sceneMap = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes])

  const pool = useMemo(() => {
    if (!routeName) return []
    return scenes
      .filter((s) => s.routeName === routeName)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [scenes, routeName])

  const liveIssues = useMemo(
    () => validateAnthology({ title, theme, routeName, entries }, scenes),
    [title, theme, routeName, entries, scenes],
  )

  if (!anthology) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-teal-950 text-mist-300">
        <p className="mb-4">线路册不存在或已被删除</p>
        <Link to="/anthologies" className="text-dusk-400 underline underline-offset-4">
          返回选编台
        </Link>
      </div>
    )
  }

  const selectedIds = new Set(entries.map((e) => e.sceneId))

  const addScene = (scene: WindowScene) => {
    if (selectedIds.has(scene.id)) return
    setEntries((prev) => [...prev, { sceneId: scene.id, transition: '' }])
  }
  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx))
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    setEntries((prev) => {
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  const setTransition = (idx: number, transition: string) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, transition } : e)))

  const issueIndices = (code: AnthologyIssue['code']) =>
    new Set(
      liveIssues.filter((iss) => iss.code === code).map((iss) => iss.entryIndex),
    )
  const dupIdx = issueIndices('DUPLICATE_SCENE')
  const invalidIdx = issueIndices('INVALID_REFERENCE')
  const mixedIdx = issueIndices('MIXED_ROUTE')

  const handlePublish = () => {
    // 先把防抖中的草稿落盘，再发布
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveDraft(anthology.id, { title, theme, routeName, entries })
    const issues = publish(anthology.id)
    if (issues.length === 0) {
      navigate(`/anthologies/${anthology.id}/preview`)
    } else {
      setPublishIssues(issues)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePreview = () => {
    // 预览前立即落盘，保证看到的是最新编辑
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveDraft(anthology.id, { title, theme, routeName, entries })
    navigate(`/anthologies/${anthology.id}/preview`)
  }

  const missingTransitions = entries.filter((e, i) => i < entries.length - 1 && !e.transition.trim()).length

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-32">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/anthologies"
            className="flex items-center gap-1.5 text-sm text-mist-400 transition hover:text-dusk-400"
          >
            <ArrowLeft className="w-4 h-4" />返回选编台
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-mist-500">
            <Save className="w-3.5 h-3.5" />
            {justSavedAt
              ? `草稿已自动保存 · ${formatTimestamp(justSavedAt).split(' ')[1]}`
              : '编辑后自动保存'}
          </div>
        </div>

        {publishIssues && publishIssues.length > 0 && (
          <div className="mb-5 rounded-xl border border-red-800/60 bg-red-950/30 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
              <CircleAlert className="w-4 h-4" />
              发布被拦下，请先处理以下 {publishIssues.length} 个问题
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs text-red-200/90">
              {publishIssues.map((iss, i) => (
                <li key={`${iss.code}-${i}`}>{iss.message}</li>
              ))}
            </ul>
          </div>
        )}

        <h1 className="mb-5 flex items-center gap-2 text-2xl font-bold text-dusk-400">
          <BookOpen className="w-6 h-6" />
          {anthology.status === 'published' ? '修订已发布册' : '新建线路册'}
        </h1>

        <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
          {/* 左：基本信息 + 素材池 */}
          <div className="space-y-5">
            <section className="space-y-3 rounded-xl border border-teal-800 bg-teal-900/40 p-4">
              <div>
                <label className="mb-1 block text-xs text-mist-300">标题 *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给这条文字线路起个名字"
                  className="w-full rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-dusk-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-mist-300">主题 *</label>
                <input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="例如：清晨的烟火气 / 雨后的招牌"
                  className="w-full rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-dusk-400"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                  <RouteIcon className="w-3 h-3" />线路 *
                </label>
                <select
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-sm text-mist-100 outline-none focus:border-dusk-400"
                >
                  <option value="">选择一条线路…</option>
                  {routeNames.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {routeNames.length === 0 && (
                  <p className="mt-1 text-[11px] text-mist-500">暂无线路，请先在「记录」页添加窗景</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-teal-800 bg-teal-900/40 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-mist-200">
                <Plus className="w-4 h-4 text-dusk-400" />
                素材池
                <span className="text-xs font-normal text-mist-500">
                  {routeName ? `${routeName} · ${pool.length} 条可选` : '选定线路后出现'}
                </span>
              </h2>
              {!routeName ? (
                <p className="py-6 text-center text-xs text-mist-500">先在上方选择线路</p>
              ) : pool.length === 0 ? (
                <p className="py-6 text-center text-xs text-mist-500">该线路下还没有记录</p>
              ) : (
                <div className="space-y-2">
                  {pool.map((scene) => {
                    const picked = selectedIds.has(scene.id)
                    return (
                      <button
                        key={scene.id}
                        type="button"
                        disabled={picked}
                        onClick={() => addScene(scene)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition ${
                          picked
                            ? 'cursor-default border-teal-800 bg-teal-950/60 text-mist-600'
                            : 'border-teal-800 bg-teal-950 hover:border-dusk-400/50 hover:bg-teal-900'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            picked ? 'border-dusk-400 bg-dusk-400 text-teal-950' : 'border-mist-600'
                          }`}
                        >
                          {picked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-mist-100">{scene.segment}</span>
                          <span className="block truncate text-[10px] text-mist-500">
                            {formatTimestamp(scene.timestamp)} · {scene.note || '无笔记'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* 右：编排区 */}
          <section className="rounded-xl border border-teal-800 bg-teal-900/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
                <ListOrdered className="w-4 h-4 text-dusk-400" />
                编排线路册
              </h2>
              <span
                className={`flex items-center gap-1 text-xs ${
                  entries.length >= 3 ? 'text-emerald-400' : 'text-mist-500'
                }`}
              >
                {entries.length >= 3 ? (
                  <CircleCheck className="w-3.5 h-3.5" />
                ) : (
                  <CircleAlert className="w-3.5 h-3.5" />
                )}
                {entries.length}/3 条起步
              </span>
            </div>

            {entries.length === 0 ? (
              <p className="py-10 text-center text-xs text-mist-500">
                从左侧素材池挑入至少 3 条记录，开始编排
              </p>
            ) : (
              <div className="space-y-4">
                {entries.map((entry, idx) => {
                  const scene = sceneMap.get(entry.sceneId)
                  const invalid = invalidIdx.has(idx)
                  const mixed = mixedIdx.has(idx)
                  const duplicate = dupIdx.has(idx)
                  return (
                    <div
                      key={`${entry.sceneId}-${idx}`}
                      className={`rounded-xl border p-3 ${
                        invalid
                          ? 'border-red-700/60 bg-red-950/20'
                          : mixed
                            ? 'border-amber-700/50 bg-amber-900/10'
                            : 'border-teal-800 bg-teal-950/50'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dusk-400/20 text-xs font-semibold text-dusk-300">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => move(idx, -1)}
                            disabled={idx === 0}
                            className="rounded p-1 text-mist-400 enabled:hover:bg-white/5 enabled:hover:text-dusk-400 disabled:opacity-30"
                            title="上移"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(idx, 1)}
                            disabled={idx === entries.length - 1}
                            className="rounded p-1 text-mist-400 enabled:hover:bg-white/5 enabled:hover:text-dusk-400 disabled:opacity-30"
                            title="下移"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEntry(idx)}
                            className="rounded p-1 text-mist-400 hover:bg-red-900/40 hover:text-red-300"
                            title="移出本册"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="ml-auto flex flex-wrap justify-end gap-1">
                          {invalid && (
                            <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-300">无效引用</span>
                          )}
                          {duplicate && (
                            <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-300">重复记录</span>
                          )}
                          {mixed && (
                            <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-[10px] text-amber-300">混线路</span>
                          )}
                        </div>
                      </div>

                      {scene ? (
                        <SceneBlock
                          data={scene}
                          footer={
                            <div className="mt-3 border-t border-teal-800 pt-3">
                              <label className="mb-1 block text-[11px] text-mist-400">
                                转场说明{idx === entries.length - 1 ? '（末段，可留空）' : ' *'}
                              </label>
                              <textarea
                                value={entry.transition}
                                onChange={(e) => setTransition(idx, e.target.value)}
                                placeholder={
                                  idx === entries.length - 1
                                    ? '为整册写一句收束…'
                                    : `写下从「${scene.segment}」走向下一段的过渡…`
                                }
                                className="h-16 w-full resize-none rounded-lg border border-teal-800 bg-teal-900/60 px-2.5 py-2 text-xs text-mist-100 outline-none focus:border-dusk-400"
                              />
                            </div>
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-red-900/20 px-3 py-3 text-xs text-red-300">
                          <X className="w-4 h-4" />
                          该记录已被删除，引用失效，请移出本册
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {missingTransitions > 0 && (
              <p className="mt-3 text-[11px] text-amber-300/80">
                还有 {missingTransitions} 段之间的转场说明未填写
              </p>
            )}
          </section>
        </div>
      </div>

      {/* 底部操作条 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-teal-800 bg-teal-950/95 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <p className="hidden text-[11px] text-mist-500 sm:block">
            {liveIssues.length === 0
              ? '校验通过，可以发布'
              : `发布前还有 ${liveIssues.length} 项待处理`}
          </p>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            <button
              type="button"
              onClick={handlePreview}
              className="flex items-center gap-1.5 rounded-xl border border-teal-700 px-4 py-2.5 text-sm text-mist-200 transition hover:bg-white/5"
            >
              <Eye className="w-4 h-4" />预览
            </button>
            <button
              onClick={handlePublish}
              className="flex items-center gap-1.5 rounded-xl bg-dusk-400 px-5 py-2.5 text-sm font-medium text-teal-950 transition hover:bg-dusk-300 active:scale-95"
            >
              <Send className="w-4 h-4" />发布
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
