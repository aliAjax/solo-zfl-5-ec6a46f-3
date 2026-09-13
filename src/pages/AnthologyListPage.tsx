import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen, Plus, FileText, Send, AlertTriangle, Ban, ChevronRight, Trash2, Route,
} from 'lucide-react'
import { useAnthologyStore } from '@/store/useAnthologyStore'
import { useSceneStore } from '@/store/useSceneStore'
import { formatTimestamp } from '@/utils/sceneHelpers'

export default function AnthologyListPage() {
  const navigate = useNavigate()
  const { anthologies, loadAll, createDraft, remove, healthOf } = useAnthologyStore()
  const loadScenes = useSceneStore((s) => s.loadAll)
  const scenes = useSceneStore((s) => s.scenes)

  useEffect(() => {
    loadScenes()
    loadAll()
  }, [loadScenes, loadAll])

  const sorted = useMemo(
    () =>
      [...anthologies].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [anthologies],
  )

  const handleNew = () => {
    const id = createDraft()
    navigate(`/anthologies/${id}/edit`)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-wide text-dusk-400">
              <BookOpen className="w-7 h-7" />
              窗景选编台
            </h1>
            <p className="text-sm text-mist-400">从已有记录里，编一条属于同一路线的文字线路</p>
          </div>
          <button
            onClick={handleNew}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-dusk-400 px-4 py-2.5 text-sm font-medium text-teal-950 transition active:scale-95 hover:bg-dusk-300"
          >
            <Plus className="w-4 h-4" />
            新建线路册
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">📒</div>
            <p className="mb-1 text-lg">还没有线路册</p>
            {scenes.length === 0 ? (
              <>
                <p className="mb-4 text-sm">本地还没有任何窗景记录，先去采集几段</p>
                <Link
                  to="/"
                  className="rounded-xl bg-dusk-400/15 px-4 py-2 text-sm text-dusk-300 transition hover:bg-dusk-400/25"
                >
                  去记录窗景
                </Link>
              </>
            ) : (
              <p className="text-sm">从一条线路上挑至少三段窗景，写下标题与主题</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((a) => {
              const health = a.status === 'published' ? healthOf(a) : []
              const missing = health.filter((h) => h.status === 'missing').length
              const changed = health.filter((h) => h.status === 'changed').length
              return (
                <Link
                  key={a.id}
                  to={a.status === 'draft' ? `/anthologies/${a.id}/edit` : `/anthologies/${a.id}/preview`}
                  className="group flex items-center gap-4 rounded-xl border border-teal-800 bg-teal-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                      a.status === 'published'
                        ? 'bg-dusk-400/15 text-dusk-400'
                        : 'bg-teal-800 text-mist-400'
                    }`}
                  >
                    {a.status === 'published' ? <Send className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-mist-100">
                        {a.title.trim() || '未命名线路册'}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                          a.status === 'published'
                            ? 'bg-dusk-400/15 text-dusk-300'
                            : 'bg-teal-800 text-mist-400'
                        }`}
                      >
                        {a.status === 'published'
                          ? `已发布 v${a.currentVersion}`
                          : '草稿'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-mist-400">
                      <Route className="mr-1 inline w-3 h-3" />
                      {a.routeName || '未选线路'}
                      <span className="mx-1.5 text-teal-700">·</span>
                      {a.entries.length} 段
                      {a.theme && (
                        <>
                          <span className="mx-1.5 text-teal-700">·</span>
                          {a.theme}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-mist-500">
                      {a.status === 'draft'
                        ? a.lastSavedAt
                          ? `草稿自动保存于 ${formatTimestamp(a.lastSavedAt)}`
                          : '尚未自动保存'
                        : `发布于 ${a.publishedAt ? formatTimestamp(a.publishedAt) : '-'}`}
                    </p>
                  </div>

                  {(missing > 0 || changed > 0) && (
                    <div className="flex shrink-0 flex-col gap-1">
                      {missing > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] text-red-300">
                          <Ban className="w-3 h-3" />{missing} 段失效
                        </span>
                      )}
                      {changed > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] text-amber-300">
                          <AlertTriangle className="w-3 h-3" />{changed} 段变更
                        </span>
                      )}
                    </div>
                  )}

                  <ChevronRight className="w-4 h-4 shrink-0 text-mist-600 transition group-hover:translate-x-0.5 group-hover:text-dusk-400" />

                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (confirm(`删除线路册「${a.title || '未命名'}」？此操作不可恢复。`)) {
                        remove(a.id)
                      }
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-mist-600 opacity-0 transition hover:bg-red-900/30 hover:text-red-300 group-hover:opacity-100"
                    title="删除线路册"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Link>
              )
            })}
          </div>
        )}

        {scenes.length === 0 && (
          <p className="mt-8 text-center text-xs text-mist-500">
            还没有任何窗景记录，先去「记录」页采集几段吧
          </p>
        )}
      </div>
    </div>
  )
}
