'use client'

import { useEffect, useState } from 'react'

interface PayPollingProps {
  jobId: string
}

// Polling статуса оплаты раз в 5 секунд. Когда сервер вернёт paid=true,
// перебрасываем на /research/[jobId] (там стартует/идёт research).
export function PayPolling({ jobId }: PayPollingProps) {
  const [status, setStatus] = useState<'waiting' | 'paid' | 'error'>('waiting')
  const [polls, setPolls] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

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
        timer = setTimeout(poll, 5000)
      } catch {
        if (cancelled) return
        // Не критично — просто пробуем дальше
        setPolls((n) => n + 1)
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
