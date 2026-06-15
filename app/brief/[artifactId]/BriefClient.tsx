'use client'

import { useEffect, useRef } from 'react'
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

  // Autopilot: если бриф не пришёл с сервера — генерируем его сразу при маунте,
  // без ручной кнопки. Срабатывает один раз; повторный авто-ретрай не делаем,
  // иначе ошибка зацикливает запросы. При ошибке показываем сообщение
  // (без кнопки — пользователь видит «свяжемся в течение часа»).
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current) return
    if (initialBrief) return
    if (status !== 'idle') return
    autoStarted.current = true
    void generate()
  }, [initialBrief, status, generate])

  if (status === 'success' && brief) {
    return <BriefReport brief={brief} lighthouse={lighthouse} />
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-[#ff6b6b] mb-2">Не удалось сформировать краткий отчёт</p>
        <p className="text-xs text-[#8888a0] max-w-md leading-relaxed">
          {error ?? 'Внутренняя ошибка'}. Мы получили нотификацию — свяжемся в течение часа.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-9 h-9 border-2 border-white/10 border-t-[#00d4aa] rounded-full animate-spin mb-5" />
      <p className="text-sm text-[#e8e8f0]">Готовим краткий отчёт…</p>
      <p className="text-xs text-[#8888a0] mt-1">Это занимает 20–40 секунд</p>
    </div>
  )
}
