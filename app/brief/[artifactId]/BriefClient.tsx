'use client'

import type { BriefReportBlock } from '@/lib/strategy/brief'
import { BriefReport } from './BriefReport'
import { useGenerateBrief } from './useGenerateBrief'

export function BriefClient({
  artifactId,
  initialBrief,
}: {
  artifactId: string
  initialBrief: BriefReportBlock | null
}) {
  const { status, brief, error, generate } = useGenerateBrief(artifactId, initialBrief)

  if (status === 'success' && brief) {
    return (
      <div className="space-y-8">
        <BriefReport brief={brief} />
        <div className="no-print">
          <button
            type="button"
            onClick={generate}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ↻ Перегенерировать
          </button>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600">Готовим краткий отчёт…</p>
        <p className="text-xs text-gray-400 mt-1">Это занимает 20–40 секунд</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-gray-600 mb-1">Краткий отчёт ещё не сформирован.</p>
      <p className="text-xs text-gray-400 mb-6">
        Дистилляция полного отчёта в 6 блоков: позиция, узкие места, потенциал, AI-рычаги,
        действия, гипотезы.
      </p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={generate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
      >
        {error ? 'Попробовать ещё раз' : 'Сгенерировать краткий отчёт'}
      </button>
    </div>
  )
}
