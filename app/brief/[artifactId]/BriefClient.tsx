'use client'

import type { BriefReportBlock } from '@/lib/strategy/brief'
import type { LighthouseScores } from '@/lib/strategy/brief-derive'
import { BriefReport } from './BriefReport'
import { useGenerateBrief } from './useGenerateBrief'

export function BriefClient({
  artifactId,
  initialBrief,
  lighthouse,
}: {
  artifactId: string
  initialBrief: BriefReportBlock | null
  lighthouse?: LighthouseScores | null
}) {
  const { status, brief, error, generate } = useGenerateBrief(artifactId, initialBrief)

  if (status === 'success' && brief) {
    return (
      <div className="space-y-8">
        <BriefReport brief={brief} lighthouse={lighthouse} />
        <div className="no-print text-center pt-2">
          <button
            type="button"
            onClick={generate}
            className="text-xs text-[#44445a] hover:text-[#00d4aa] transition-colors"
          >
            ↻ Перегенерировать
          </button>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-9 h-9 border-2 border-white/10 border-t-[#00d4aa] rounded-full animate-spin mb-5" />
        <p className="text-sm text-[#e8e8f0]">Готовим краткий отчёт…</p>
        <p className="text-xs text-[#8888a0] mt-1">Это занимает 20–40 секунд</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-[#e8e8f0] mb-1.5">Краткий отчёт ещё не сформирован.</p>
      <p className="text-xs text-[#8888a0] max-w-md mb-7 leading-relaxed">
        Дистилляция полного отчёта в 6 блоков: позиция, узкие места, потенциал, AI-рычаги,
        действия, гипотезы.
      </p>
      {error && (
        <p className="text-sm text-[#ff6b6b] bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 rounded-lg px-4 py-2 mb-4">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={generate}
        className="nr-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold"
      >
        {error ? 'Попробовать ещё раз' : 'Сгенерировать краткий отчёт'}
      </button>
    </div>
  )
}
