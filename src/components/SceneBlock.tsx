import { AlertTriangle, Ban } from 'lucide-react'
import {
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
  formatTimestamp,
  getTimeOfDay,
} from '@/utils/sceneHelpers'
import type { EntryFieldChange, EntryHealthStatus } from '@/types'

interface SceneLike {
  segment: string
  routeName?: string
  weather: string
  signText: string
  treeDensity: '稀疏' | '适中' | '茂密'
  pedestrianStatus: '稀少' | '零星' | '密集'
  note: string
  seatDirection: '左' | '右'
  timestamp: string
}

interface SceneBlockProps {
  data: SceneLike
  health?: EntryHealthStatus
  changes?: EntryFieldChange[]
  footer?: React.ReactNode
}

const WEATHERS = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾'] as const

export default function SceneBlock({ data, health, changes, footer }: SceneBlockProps) {
  const missing = health === 'missing'
  const changed = health === 'changed'

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        missing
          ? 'border-red-800/60 bg-red-950/20'
          : changed
            ? 'border-amber-700/50 bg-amber-900/10'
            : 'border-teal-800 bg-teal-900/50'
      }`}
    >
      {missing && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-300">
          <Ban className="w-4 h-4 shrink-0" />
          该素材记录已被删除，以下为发布时定格内容
        </div>
      )}
      {changed && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-900/25 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          素材自发布后已被修改（{changes?.map((c) => c.label).join('、')}）
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        {WEATHERS.includes(data.weather as (typeof WEATHERS)[number]) &&
          getWeatherIcon(data.weather as (typeof WEATHERS)[number])}
        <span className="text-sm font-semibold text-mist-100">{data.segment || '未命名区间'}</span>
        <span className="text-xs text-mist-500">
          {data.routeName ? `${data.routeName} · ` : ''}{data.seatDirection}侧
        </span>
      </div>

      {data.timestamp && (
        <p className="mb-1.5 text-[11px] text-mist-500">
          {formatTimestamp(data.timestamp)} · {getTimeOfDay(data.timestamp)}
        </p>
      )}

      {data.note && (
        <p className="mb-2 font-serif text-sm leading-relaxed text-mist-200">{data.note}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {getTreeIcon(data.treeDensity)}
        {getPedestrianIcon(data.pedestrianStatus)}
        {data.signText && (
          <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
            {data.signText}
          </span>
        )}
      </div>

      {changed && changes && changes.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-amber-800/30 pt-2 text-[11px] text-amber-200/80">
          {changes.map((c) => (
            <li key={c.label} className="flex gap-2">
              <span className="shrink-0 text-amber-400/70">{c.label}：</span>
              <span className="line-through opacity-60">{c.from || '（空）'}</span>
              <span className="text-amber-400/70">→</span>
              <span>{c.to || '（空）'}</span>
            </li>
          ))}
        </ul>
      )}

      {footer}
    </div>
  )
}
