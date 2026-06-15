'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResearchProgressProps {
  jobId: string
  companyName: string
  industry: string
  initialTier: 'free' | 'paid'
}

type Stage =
  | 'unpaid'
  | 'research_pending'
  | 'research_running'
  | 'strategy_generating'
  | 'brief_generating'
  | 'done'
  | 'error'

interface StatusResponse {
  stage: Stage
  streams: {
    business: string | null
    market: string | null
    audience: string | null
    competitors: string | null
  }
  redirectTo: string | null
  errorMessage: string | null
}

const STREAM_LABELS: Record<keyof StatusResponse['streams'], string> = {
  business: 'Анализ бизнеса',
  market: 'Анализ рынка',
  audience: 'Анализ целевой аудитории',
  competitors: 'Анализ конкурентов',
}

const STAGE_LABELS: Record<Stage, string> = {
  unpaid: 'Ожидаем подтверждения оплаты',
  research_pending: 'Готовимся к запуску',
  research_running: 'Исследуем рынок и конкурентов',
  strategy_generating: 'Готовим стратегические выводы',
  brief_generating: 'Дистиллируем краткий отчёт',
  done: 'Готово — открываем отчёт',
  error: 'Что-то пошло не так',
}

export function ResearchProgress({
  jobId,
  companyName,
  industry,
  initialTier,
}: ResearchProgressProps) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [pollCount, setPollCount] = useState(0)
  const triggeredRef = useRef(false)
  const startTimeRef = useRef(Date.now())

  // Один раз при маунте — триггерим auto-pipeline.
  // Идемпотентно: если research уже running/done, endpoint сразу возвращает.
  useEffect(() => {
    if (triggeredRef.current) return
    triggeredRef.current = true

    fetch('/api/auto-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
      // Long-running: pipeline может работать до 5 минут. Не отменяем по таймауту.
    }).catch((err) => {
      // POST может «зависнуть» с точки зрения клиента дольше, чем хочется ждать.
      // Это не критично — polling всё равно покажет результат.
      console.warn('[auto-pipeline trigger]', err?.message ?? err)
    })
  }, [jobId])

  // Polling статуса каждые 3 секунды
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const res = await fetch(`/api/pipeline-status/${jobId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`poll status ${res.status}`)
        const data = (await res.json()) as StatusResponse
        if (cancelled) return
        setStatus(data)
        setPollCount((n) => n + 1)

        if (data.stage === 'unpaid' && data.redirectTo) {
          router.push(data.redirectTo)
          return
        }
        if (data.stage === 'done' && data.redirectTo) {
          // Маленькая пауза чтобы юзер увидел «✓ Готово» прежде чем редирект
          setTimeout(() => router.push(data.redirectTo!), 1200)
          return
        }
        if (data.stage === 'error') {
          // Дальше не пуллим — показываем error UI
          return
        }
        timer = setTimeout(poll, 3000)
      } catch {
        if (cancelled) return
        // Сетевая ошибка — пробуем дальше с увеличенным интервалом
        timer = setTimeout(poll, 6000)
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [jobId, router])

  // Таймер «сколько прошло» — психологический индикатор
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const currentStage = status?.stage ?? 'research_pending'
  const isError = currentStage === 'error'
  const isDone = currentStage === 'done'

  // Высокоуровневые этапы для прогресс-бара (5 шагов)
  const macroSteps: { key: Stage[]; label: string; substreams?: Array<keyof StatusResponse['streams']> }[] = [
    { key: ['research_pending', 'research_running'], label: 'Исследование рынка', substreams: ['business', 'market', 'audience', 'competitors'] },
    { key: ['strategy_generating'], label: 'Синтез стратегии' },
    { key: ['brief_generating'], label: initialTier === 'free' ? 'Подготовка краткого отчёта' : 'Финальное оформление' },
    { key: ['done'], label: 'Готово' },
  ]

  const currentMacroIdx = macroSteps.findIndex((s) => s.key.includes(currentStage))
  const reachedMacroIdx = isDone ? macroSteps.length - 1 : currentMacroIdx

  return (
    <div className="max-w-3xl mx-auto px-6 pt-14 pb-24">
      {isError ? (
        <ErrorState message={status?.errorMessage} jobId={jobId} companyName={companyName} />
      ) : (
        <>
          <p className="lp-eyebrow mb-4">{initialTier === 'free' ? 'Бесплатный пробник' : 'Полный отчёт'}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
            {STAGE_LABELS[currentStage]}
          </h1>
          <p className="text-base text-[#525252] leading-[1.65] mb-2">
            Компания: <strong>{companyName}</strong>
            {industry ? ` · ${industry}` : ''}
          </p>
          <p className="text-sm text-[#6b7280] mb-10">
            Среднее время — 2–3 минуты. Сейчас прошло {formatTime(elapsed)}. Не закрывай вкладку — отчёт откроется автоматически.
          </p>

          {/* Макро-прогресс (4 крупных этапа) */}
          <div className="space-y-3 mb-10">
            {macroSteps.map((step, i) => {
              const done = i < reachedMacroIdx || isDone
              const active = i === reachedMacroIdx && !isDone
              return (
                <div
                  key={i}
                  className={`lp-card p-5 flex items-start gap-4 transition-all ${
                    active ? 'border-2 border-[#1e3a8a] bg-[#eff6ff]' : done ? 'bg-white' : 'bg-[#fafafa] opacity-60'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {done ? (
                      <span className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-sm font-bold">
                        ✓
                      </span>
                    ) : active ? (
                      <Spinner />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-[#e5e5e5] text-[#6b7280] flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-semibold ${active ? 'text-[#1e3a8a]' : done ? 'text-[#0a0a0a]' : 'text-[#6b7280]'}`}>
                      {step.label}
                    </p>
                    {active && step.substreams && status && (
                      <ul className="mt-3 space-y-1.5">
                        {step.substreams.map((s) => {
                          const streamStatus = status.streams[s]
                          const ok = streamStatus === 'done'
                          const inProgress = streamStatus === 'running'
                          return (
                            <li
                              key={s}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  ok ? 'bg-green-500' : inProgress ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                                }`}
                              />
                              <span className={ok ? 'text-[#0a0a0a]' : inProgress ? 'text-[#1e3a8a]' : 'text-[#6b7280]'}>
                                {STREAM_LABELS[s]}
                                {ok ? ' — готово' : inProgress ? '…' : ''}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="lp-card p-5 bg-[#fafafa]">
            <p className="text-sm text-[#525252] leading-[1.6]">
              <strong className="text-[#0a0a0a]">Что внутри:</strong> AI исследует ваш бизнес, ниша,
              целевую аудиторию и 4–6 конкурентов параллельно из публичных источников. Каждый факт —
              с маркировкой надёжности и ссылкой на источник.
            </p>
            <p className="text-xs text-[#6b7280] mt-3">
              Опросов сделано: {pollCount} · jobId: <code className="font-mono text-[10px]">{jobId.slice(0, 8)}</code>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}с`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}м ${s.toString().padStart(2, '0')}с`
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-[#1e3a8a]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function ErrorState({
  message,
  jobId,
  companyName,
}: {
  message: string | null | undefined
  jobId: string
  companyName: string
}) {
  return (
    <>
      <p className="lp-eyebrow lp-eyebrow-warm mb-4">Ошибка</p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
        Что-то пошло не так при подготовке отчёта
      </h1>
      <p className="text-base text-[#525252] leading-[1.65] mb-8">
        Мы получили нотификацию и свяжемся в течение часа. Компания: <strong>{companyName}</strong>.
      </p>
      <div className="lp-card p-6 bg-[#fafafa]">
        <p className="text-xs font-bold text-[#0a0a0a] uppercase tracking-[0.12em] mb-3">Технические детали</p>
        <p className="text-sm text-[#525252] leading-[1.6] mb-2">
          jobId: <code className="font-mono text-xs">{jobId}</code>
        </p>
        {message && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">
            {message}
          </p>
        )}
      </div>
    </>
  )
}
