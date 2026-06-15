'use client'

// Self-generating компонент: показывается на /free-report когда briefJson ещё не
// готов (редкий случай — обычно к этому моменту pipeline уже всё сделал, но юзер
// мог попасть сюда напрямую после молчаливого падения brief-стадии в auto-pipeline).
//
// Логика проста: POST /api/brief/[artifactId] → endpoint синхронно генерирует
// и сохраняет briefJson → возвращает 200. После успеха window.location.reload()
// и SSR подхватит новый briefJson.
//
// Никаких кнопок — полный autopilot. При ошибке — короткое сообщение, без ретрая
// (BriefParseError зацикливал бы запросы).

import { useEffect, useRef, useState } from 'react'

interface Props {
  artifactId: string
}

export function BriefAutoGenerate({ artifactId }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const startedAt = Date.now()
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000))
    }, 1000)

    const run = async () => {
      try {
        const res = await fetch(`/api/brief/${artifactId}`, { method: 'POST' })
        if (res.ok) {
          window.location.reload()
          return
        }
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? `HTTP ${res.status}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Сетевая ошибка')
      } finally {
        clearInterval(timer)
      }
    }

    void run()
    return () => clearInterval(timer)
  }, [artifactId])

  if (error) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Карточка позиции в обработке</p>
        <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">
          Верхний блок ещё формируется
        </h2>
        <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6] mb-2">
          Не страшно — ниже вы уже видите главное: что мы нашли и закрыли,
          и за&nbsp;что открывается полный отчёт.
        </p>
        <p className="text-xs text-[#737373]">Детали: {error}</p>
      </section>
    )
  }

  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-center">
      <p className="lp-eyebrow mb-4">Карточка позиции готовится</p>
      <div className="flex items-center justify-center mb-6">
        <span
          aria-hidden
          className="inline-block w-8 h-8 rounded-full border-2 border-[#e5e5e5] border-t-[#0a0a0a] animate-spin"
        />
      </div>
      <h2 className="text-2xl font-bold mb-3 tracking-[-0.02em]">
        Дистиллируем краткий отчёт…
      </h2>
      <p className="text-base text-[#525252] max-w-md mx-auto leading-[1.6]">
        Это занимает 20–40 секунд. Страница обновится автоматически.
      </p>
      <p className="text-xs text-[#737373] mt-4">Прошло {elapsed} сек</p>
    </section>
  )
}
