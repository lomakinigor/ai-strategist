'use client'

import { useState } from 'react'
import { generateBriefReportAction } from './brief-actions'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function renderBriefContent(text: string) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (trimmed === '') return <div key={i} className="h-2" />

        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <h3 key={i} className="text-sm font-bold text-gray-900 mt-4 mb-1 first:mt-0">
              {trimmed.slice(2, -2)}
            </h3>
          )
        }

        if (trimmed.startsWith('ВЫВОД:')) {
          return (
            <p key={i} className="text-sm font-semibold text-indigo-900 bg-indigo-50 px-2 py-1 rounded leading-relaxed">
              {trimmed}
            </p>
          )
        }

        if (trimmed.startsWith('ДЕЙСТВИЕ:')) {
          return (
            <p key={i} className="text-sm font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded leading-relaxed mt-1">
              {trimmed}
            </p>
          )
        }

        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return (
            <p key={i} className="text-sm text-gray-700 pl-3 leading-relaxed">
              {'• '}{trimmed.replace(/^[•\-]\s*/, '')}
            </p>
          )
        }

        return (
          <p key={i} className="text-sm text-gray-800 leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
}

export function BriefReportPanel({ artifactId }: { artifactId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (brief) {
      setOpen((v) => !v)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await generateBriefReportAction(artifactId)
      setBrief(result)
      setOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-800 text-sm font-medium hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors select-none"
      >
        {loading && <Spinner />}
        {loading
          ? 'Формирую краткую версию…'
          : open
            ? 'Скрыть краткую версию'
            : 'Краткая информация'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {open && brief && (
        <div className="mt-4 border border-indigo-200 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
              Краткое резюме — методология Minto · McKinsey · Knaflic
            </p>
            <span className="text-xs text-gray-400">макс. 2 страницы · только подтверждённые факты</span>
          </div>
          {renderBriefContent(brief)}
        </div>
      )}
    </div>
  )
}
