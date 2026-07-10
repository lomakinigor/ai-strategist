'use client'

import { useState } from 'react'
import { deleteReportArtifactAction } from './actions'

interface ReportRow {
  id: string
  seq: number
  companyName: string
  industry: string
  status: string
  createdAt: Date
  researchJobId: string | null
  label: string
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Готово',
  partial: 'Этап 1',
  error: 'Ошибка',
  generating: 'Генерируется',
  pending: 'Ожидание',
}

const STATUS_CLASS: Record<string, string> = {
  done: 'text-green-700 bg-green-100',
  partial: 'text-indigo-700 bg-indigo-100',
  error: 'text-red-700 bg-red-100',
  generating: 'text-yellow-700 bg-yellow-100',
  pending: 'text-gray-600 bg-gray-100',
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function ReportCard({ report }: { report: ReportRow }) {
  const [deleting, setDeleting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setDeleting(true)
    try {
      await deleteReportArtifactAction(report.id)
    } catch {
      setDeleting(false)
      setConfirmed(false)
    }
  }

  const dateStr = report.createdAt.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const timeStr = report.createdAt.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-4 hover:border-gray-300 transition-colors">
      {/* Seq number */}
      <span className="text-xs font-mono text-gray-400 mt-0.5 w-10 shrink-0 text-right">
        #{String(report.seq).padStart(3, '0')}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {report.companyName}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[report.status] ?? STATUS_CLASS.pending}`}>
            {STATUS_LABEL[report.status] ?? report.status}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{report.industry}</p>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          {report.label} · {dateStr} {timeStr}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {report.status === 'done' && report.researchJobId && (
          <a
            href={`/research/${report.researchJobId}/report/interactive?artifactId=${report.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Открыть
          </a>
        )}
        {report.status === 'partial' && report.researchJobId && (
          <a
            href={`/research/${report.researchJobId}/report/interactive?artifactId=${report.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
          >
            Открыть
          </a>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors select-none cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5 ${
            confirmed
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600'
          }`}
        >
          {deleting && <Spinner />}
          {deleting ? 'Удаляю…' : confirmed ? 'Подтвердить удаление' : 'Удалить'}
        </button>

        {confirmed && !deleting && (
          <button
            onClick={() => setConfirmed(false)}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer select-none"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  )
}

export function ArchiveList({ reports }: { reports: ReportRow[] }) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Архив пуст — запустите первое исследование</p>
        <a href="/intake" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Создать исследование →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} />
      ))}
    </div>
  )
}
