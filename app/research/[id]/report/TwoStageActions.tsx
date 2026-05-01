'use client'

import { useState } from 'react'
import { synthesizeStrategyAction, regenerateSectionAction } from './synthesize-actions'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function SynthesizeButton({
  jobId,
  artifactId,
  disabled,
  disabledReason,
}: {
  jobId: string
  artifactId: string
  disabled?: boolean
  disabledReason?: string | null
}) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await synthesizeStrategyAction(formData)
    } catch {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="artifactId" value={artifactId} />
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={loading || disabled}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
      >
        {loading && <Spinner />}
        {loading ? 'Синтезирую общую стратегию…' : 'Запустить синтез общей стратегии →'}
      </button>
      {disabled && disabledReason && (
        <p className="mt-2 text-xs text-red-600">{disabledReason}</p>
      )}
    </form>
  )
}

export function RegenerateSectionButton({
  jobId,
  artifactId,
  sectionType,
}: {
  jobId: string
  artifactId: string
  sectionType: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await regenerateSectionAction(formData)
    } catch {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="artifactId" value={artifactId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="sectionType" value={sectionType} />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-rose-100 active:bg-rose-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
      >
        {loading && <Spinner />}
        {loading ? 'Перегенерирую…' : 'Перегенерировать секцию →'}
      </button>
    </form>
  )
}
