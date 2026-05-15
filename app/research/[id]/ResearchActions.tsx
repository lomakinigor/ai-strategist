'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { triggerResearch } from './actions'
import { generateStrategyAction } from './generate/actions'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function TriggerResearchButton({ jobId, label }: { jobId: string; label: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      await triggerResearch(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при запуске исследования')
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="jobId" value={jobId} />
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
        >
          {loading && <Spinner />}
          {loading ? 'Запускаю…' : label}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 break-words">
          Ошибка: {error}
        </p>
      )}
    </div>
  )
}

export function NavButton({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleClick() {
    setLoading(true)
    router.push(href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${className} inline-flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer select-none`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function GenerateStrategyButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await generateStrategyAction(formData)
    } catch {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
      >
        {loading && <Spinner />}
        {loading ? 'Генерирую стратегию…' : 'Сгенерировать стратегический анализ →'}
      </button>
    </form>
  )
}
