'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PayPollingProps {
  jobId: string
}

// Через сколько секунд без paid=true показывать timeout-warning.
// 30 минут — обещанный SLA подтверждения админом. После этого юзеру нужно
// понять что что-то пошло не так и предложить exit-pathways.
const TIMEOUT_MS = 30 * 60 * 1000

// Polling статуса оплаты раз в 5 секунд. Когда сервер вернёт paid=true,
// перебрасываем на /research/[jobId] (там стартует/идёт research).
export function PayPolling({ jobId }: PayPollingProps) {
  const [status, setStatus] = useState<'waiting' | 'paid' | 'error'>('waiting')
  const [polls, setPolls] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const startedAt = Date.now()

    async function poll() {
      try {
        const res = await fetch(`/api/payment-status/${jobId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('poll_failed')
        const data = (await res.json()) as { paid: boolean }
        if (cancelled) return
        if (data.paid) {
          setStatus('paid')
          // Небольшая пауза, чтобы пользователь увидел «Оплата подтверждена» перед редиректом
          setTimeout(() => {
            window.location.href = `/research/${jobId}`
          }, 1500)
          return
        }
        setPolls((n) => n + 1)
        if (Date.now() - startedAt > TIMEOUT_MS) {
          setTimedOut(true)
        }
        timer = setTimeout(poll, 5000)
      } catch {
        if (cancelled) return
        // Не критично — просто пробуем дальше
        setPolls((n) => n + 1)
        if (Date.now() - startedAt > TIMEOUT_MS) {
          setTimedOut(true)
        }
        timer = setTimeout(poll, 8000)
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [jobId])

  if (status === 'paid') {
    return (
      <div className="lp-card p-6 mb-8 border-2 border-green-500 bg-green-50">
        <p className="text-sm font-semibold text-green-800 mb-1">✓ Оплата подтверждена</p>
        <p className="text-sm text-green-700">Запускаю исследование… секунду…</p>
      </div>
    )
  }

  if (timedOut) {
    // Через 30 минут без paid=true — показываем явный exit-flow. Юзер либо
    // ещё не оплатил, либо мы потеряли его платёж. UX-аудит 2.9.
    return (
      <div className="lp-card p-6 mb-8 border-2 border-amber-400 bg-amber-50">
        <p className="text-sm font-semibold text-amber-900 mb-2">
          ⏱ Оплата не получена за 30 минут
        </p>
        <p className="text-sm text-amber-900 leading-[1.55] mb-3">
          Если вы уже оплатили — напишите нам, мы вручную найдём платёж и запустим
          анализ. Если ещё нет — попробуйте ещё раз по QR-коду или реквизитам выше,
          или вернитесь к анкете и начните с чистого листа.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/intake"
            className="text-[#1e3a8a] font-medium underline hover:text-[#172554]"
          >
            ← Вернуться к анкете
          </Link>
          <span className="text-amber-700">·</span>
          <span className="text-amber-900">
            Кнопка «💬 Написать админу» справа внизу — самый быстрый путь
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="lp-card p-6 mb-8 border-2 border-[#1e3a8a] bg-[#eff6ff]">
      <div className="flex items-center gap-3">
        <Spinner />
        <div>
          <p className="text-sm font-semibold text-[#1e3a8a] mb-0.5">Ожидаем подтверждения оплаты</p>
          <p className="text-xs text-[#1e3a8a]/80">
            Проверяем каждые 5 секунд. После approve администратором страница автоматически
            перейдёт к&nbsp;запуску исследования. (опросов: {polls})
          </p>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 shrink-0 text-[#1e3a8a]"
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
