'use client'

// Self-polling компонент: показывается на /free-report когда briefJson ещё не
// готов (редкий случай — обычно к этому моменту pipeline уже всё сделал, но юзер
// мог попасть сюда напрямую по сохранённому URL до завершения brief-стадии).
//
// Логика: дёргаем /api/auto-pipeline для jobId (идемпотентно — пропустит уже
// сделанные этапы, добьёт brief если завис), параллельно поллим pipeline-status.
// Когда stage='done' → window.location.reload() → SSR подхватит briefJson.
//
// Никаких кнопок — полный autopilot.

import { useEffect, useState } from 'react'

interface Props {
  researchJobId: string
}

export function BriefAutoGenerate({ researchJobId }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [stage, setStage] = useState<string>('brief_generating')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/auto-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: researchJobId }),
    }).catch(() => {})

    const startedAt = Date.now()
    const timer = setInterval(() => {
      if (!cancelled) setElapsed(Math.round((Date.now() - startedAt) / 1000))
    }, 1000)

    const poll = async () => {
      try {
        const res = await fetch(`/api/pipeline-status/${researchJobId}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { stage: string; errorMessage?: string | null }
        if (cancelled) return
        if (data.stage === 'done') {
          window.location.reload()
          return
        }
        if (data.stage === 'error') {
          setError(data.errorMessage || 'Не удалось завершить генерацию')
          return
        }
        setStage(data.stage)
      } catch {
        // ignore
      }
    }

    poll()
    const pollTimer = setInterval(poll, 3000)

    return () => {
      cancelled = true
      clearInterval(timer)
      clearInterval(pollTimer)
    }
  }, [researchJobId])

  const stageLabel: Record<string, string> = {
    research_pending: 'Сбор данных запускается…',
    research_running: 'Идёт исследование рынка и конкурентов…',
    strategy_generating: 'Формируем стратегию…',
    brief_generating: 'Готовим краткий пробник…',
  }
  const label = stageLabel[stage] ?? 'Завершаем…'

  if (error) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow mb-4" style={{ color: '#b45309' }}>
          Ошибка
        </p>
        <h2 className="text-2xl font-bold mb-4 tracking-[-0.02em]">Не удалось завершить генерацию</h2>
        <p className="text-base text-[#525252] mb-2 max-w-md mx-auto leading-[1.6]">
          {error}
        </p>
        <p className="text-sm text-[#737373]">
          Мы получили нотификацию и свяжемся в течение часа.
        </p>
      </section>
    )
  }

  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-center">
      <p className="lp-eyebrow mb-4">Пробник готовится</p>
      <div className="flex items-center justify-center mb-6">
        <span
          aria-hidden
          className="inline-block w-8 h-8 rounded-full border-2 border-[#e5e5e5] border-t-[#0a0a0a] animate-spin"
        />
      </div>
      <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">{label}</h2>
      <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6]">
        Страница обновится автоматически, как только пробник будет готов.
      </p>
      <p className="text-xs text-[#737373] mt-4">Прошло {elapsed} сек</p>
    </section>
  )
}
