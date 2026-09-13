import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Send, PenLine, History, Ban, AlertTriangle, BookOpen, Route as RouteIcon,
  Clock, ArrowRight,
} from 'lucide-react'
import { useAnthologyStore } from '@/store/useAnthologyStore'
import { useSceneStore } from '@/store/useSceneStore'
import { getLatestVersion } from '@/services/anthology'
import { formatTimestamp } from '@/utils/sceneHelpers'
import type { WindowScene } from '@/types'
import SceneBlock from '@/components/SceneBlock'

interface FieldChange {
  label: string
  from: string
  to: string
}

const COMPARE_FIELDS: Array<{ key: keyof WindowScene; label: string }> = [
  { key: 'segment', label: '区间' },
  { key: 'seatDirection', label: '座位方向' },
  { key: 'weather', label: '天气' },
  { key: 'signText', label: '招牌文字' },
  { key: 'treeDensity', label: '树木密度' },
  { key: 'pedestrianStatus', label: '行人状态' },
  { key: 'note', label: '观察笔记' },
]

export default function AnthologyPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { anthologies, loadAll, revertToDraft, restorePrevious } = useAnthologyStore()
  const { scenes, loadAll: loadScenes } = useSceneStore()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    loadScenes()
    loadAll()
  }, [loadScenes, loadAll])

  const anthology = anthologies.find((a) => a.id === id)
  const version = anthology ? getLatestVersion(anthology) : null

  const view = useMemo(() => {
    if (!anthology) return null
    const published = anthology.status === 'published' && !!version
    const sourceEntries = published ? version!.entries : anthology.entries
    const map = new Map(scenes.map((s) => [s.id, s]))

    const items = sourceEntries.map((entry) => {
      const scene: WindowScene | undefined = map.get(entry.sceneId)
      const snap = version?.snapshots[entry.sceneId]
      const changes: FieldChange[] = []
      if (published && scene && snap) {
        for (const f of COMPARE_FIELDS) {
          const from = String(snap[f.key as keyof typeof snap] ?? '')
          const to = String(scene[f.key] ?? '')
          if (from !== to) changes.push({ label: f.label, from, to })
        }
      }
      return {
        entry,
        scene,
        snap,
        changes,
        missing: published && !scene && !!snap,
        changed: changes.length > 0,
      }
    })

    return {
      published,
      title: published ? version!.title : anthology.title,
      theme: published ? version!.theme : anthology.theme,
      routeName: published ? version!.routeName : anthology.routeName,
      publishedAt: published ? version!.publishedAt : null,
      items,
    }
  }, [anthology, scenes, version])

  if (anthologies.length > 0 && !anthology) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-teal-950 text-mist-300">
        <p className="mb-4">线路册不存在或已被删除</p>
        <Link to="/anthologies" className="text-dusk-400 underline underline-offset-4">
          返回选编台
        </Link>
      </div>
    )
  }
  if (!anthology || !view) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-teal-950 text-mist-300">
        <p className="mb-4">线路册不存在或已被删除</p>
        <Link to="/anthologies" className="text-dusk-400 underline underline-offset-4">
          返回选编台
        </Link>
      </div>
    )
  }

  const isDraft = !view.published
  const missingCount = view.items.filter((h) => h.missing).length
  const changedCount = view.items.filter((h) => h.changed).length

  const handleRevert = () => {
    revertToDraft(anthology.id)
    navigate(`/anthologies/${anthology.id}/edit`)
  }

  const handleRestore = () => {
    const err = restorePrevious(anthology.id)
    setNotice(
      err ??
        (isDraft
          ? '已恢复到最近一次发布的内容（仍为草稿）'
          : '已回滚到上一发布版，并形成新版本'),
    )
  }

  return (
    <div className="min-h-screen bg-teal-950 pb-28 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/anthologies"
          className="mb-5 flex items-center gap-1.5 text-sm text-mist-400 transition hover:text-dusk-400"
        >
          <ArrowLeft className="w-4 h-4" />返回选编台
        </Link>

        {notice && (
          <div className="mb-4 rounded-lg border border-dusk-400/40 bg-dusk-400/10 px-4 py-2.5 text-xs text-dusk-300">
            {notice}
          </div>
        )}

        {(missingCount > 0 || changedCount > 0) && (
          <div className="mb-6 space-y-2 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              素材状态提醒
            </p>
            {missingCount > 0 && (
              <p className="flex items-center gap-2 text-xs text-red-300">
                <Ban className="w-3.5 h-3.5" />
                {missingCount} 段素材记录已失效（被删除），下方显示的是发布时定格内容
              </p>
            )}
            {changedCount > 0 && (
              <p className="flex items-center gap-2 text-xs text-amber-300/90">
                <AlertTriangle className="w-3.5 h-3.5" />
                {changedCount} 段素材自发布后发生修改，差异已在对应段落标出
              </p>
            )}
          </div>
        )}

        <header className="mb-8 border-b border-teal-800 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 ${
                isDraft ? 'bg-teal-800 text-mist-400' : 'bg-dusk-400/15 text-dusk-300'
              }`}
            >
              {isDraft ? '草稿预览' : `已发布 v${anthology.currentVersion}`}
            </span>
            <span className="flex items-center gap-1 text-mist-400">
              <RouteIcon className="w-3 h-3" />{view.routeName || '未选线路'}
            </span>
            {!isDraft && view.publishedAt && (
              <span className="flex items-center gap-1 text-mist-500">
                <Clock className="w-3 h-3" />
                {formatTimestamp(view.publishedAt)} 定格
              </span>
            )}
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-wide text-dusk-400">
            <BookOpen className="mr-2 inline w-7 h-7" />
            {view.title.trim() || '未命名线路册'}
          </h1>
          <p className="text-sm text-mist-400">主题 · {view.theme.trim() || '（未填写）'}</p>
        </header>

        {view.items.length === 0 && (
          <p className="py-12 text-center text-sm text-mist-500">还没有选入任何记录</p>
        )}

        <div className="space-y-2">
          {view.items.map((h, idx) => (
            <div key={`${h.entry.sceneId}-${idx}`}>
              <article>
                <div className="mb-2 flex items-center gap-2 text-xs text-mist-500">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dusk-400/20 text-[10px] font-semibold text-dusk-300">
                    {idx + 1}
                  </span>
                  {h.missing && (
                    <span className="flex items-center gap-1 text-red-300">
                      <Ban className="w-3 h-3" />素材已失效
                    </span>
                  )}
                  {h.changed && (
                    <span className="flex items-center gap-1 text-amber-300">
                      <AlertTriangle className="w-3 h-3" />素材已变更
                    </span>
                  )}
                </div>
                {h.missing && h.snap ? (
                  <SceneBlock
                    data={{
                      routeName: view.routeName,
                      segment: h.snap.segment,
                      weather: h.snap.weather,
                      signText: h.snap.signText,
                      treeDensity: h.snap.treeDensity,
                      pedestrianStatus: h.snap.pedestrianStatus,
                      note: h.snap.note,
                      seatDirection: h.snap.seatDirection,
                      timestamp: h.snap.timestamp,
                    }}
                    health="missing"
                  />
                ) : h.scene ? (
                  <SceneBlock
                    data={{ ...h.scene, routeName: h.scene.routeName ?? view.routeName }}
                    health={h.changed ? 'changed' : undefined}
                    changes={h.changes}
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-red-800/60 bg-red-950/20 px-4 py-3 text-xs text-red-300">
                    <Ban className="w-4 h-4 shrink-0" />
                    草稿引用了一条已被删除的记录，请回编辑器移除
                  </div>
                )}
              </article>
              {h.entry.transition && (
                <div className="my-4 flex items-start gap-2 px-6">
                  <ArrowRight className="mt-1 w-3.5 h-3.5 shrink-0 text-dusk-400/70" />
                  <p className="font-serif text-sm italic leading-relaxed text-dusk-300/90">
                    {h.entry.transition}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 操作条 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-teal-800 bg-teal-950/95 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2 px-4 py-3">
          {anthology.versions.length > 0 && (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 rounded-xl border border-teal-700 px-4 py-2.5 text-sm text-mist-200 transition hover:bg-white/5"
              title={isDraft ? '恢复到最近一次发布内容' : '回滚到上一发布版'}
            >
              <History className="w-4 h-4" />
              {isDraft ? '恢复上一版' : '恢复上一发布版'}
            </button>
          )}
          {isDraft ? (
            <button
              onClick={() => navigate(`/anthologies/${anthology.id}/edit`)}
              className="flex items-center gap-1.5 rounded-xl bg-dusk-400 px-5 py-2.5 text-sm font-medium text-teal-950 transition hover:bg-dusk-300"
            >
              <PenLine className="w-4 h-4" />继续编辑
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  revertToDraft(anthology.id)
                  navigate(`/anthologies/${anthology.id}/edit`)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-teal-700 px-4 py-2.5 text-sm text-mist-200 transition hover:bg-white/5"
              >
                <PenLine className="w-4 h-4" />修订
              </button>
              <button
                onClick={handleRevert}
                className="flex items-center gap-1.5 rounded-xl bg-dusk-400 px-5 py-2.5 text-sm font-medium text-teal-950 transition hover:bg-dusk-300"
              >
                <Send className="w-4 h-4 rotate-180" />退回草稿
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
