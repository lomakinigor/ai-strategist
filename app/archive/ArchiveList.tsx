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
  done: 'text-[#1e3a8a] bg-[#1e3a8a]/10',
  partial: 'text-[#1e3a8a] bg-[#1e3a8a]/10',
  error: 'text-[#1e3a8a] bg-[#1e3a8a]/10',
  generating: 'text-[#1e3a8a] bg-[#1e3a8a]/10',
  pending: 'text-[#525252] bg-[#fafafa]',
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
    <div className="bg-white border border-black/10 rounded-lg px-5 py-4 flex items-start gap-4 hover:border-black/10 transition-colors">
      {/* Seq number */}
      <span className="text-xs font-sans tabular-nums text-[#525252] mt-0.5 w-10 shrink-0 text-right">
        #{String(report.seq).padStart(3, '0')}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#525252] truncate">
            {report.companyName}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[report.status] ?? STATUS_CLASS.pending}`}>
            {STATUS_LABEL[report.status] ?? report.status}
          </span>
        </div>
        <p className="text-xs text-[#525252] mt-0.5 truncate">{report.industry}</p>
        <p className="text-xs text-[#525252] mt-1 font-sans tabular-nums">
          {report.label} · {dateStr} {timeStr}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {report.status === 'done' && report.researchJobId && (
          <a
            href={`/research/${report.researchJobId}/report/interactive?artifactId=${report.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-black/10 text-[#525252] hover:border-black/10 hover:text-[#525252] transition-colors"
          >
            Открыть
          </a>
        )}
        {report.status === 'partial' && report.researchJobId && (
          <a
            href={`/research/${report.researchJobId}/report/interactive?artifactId=${report.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-black/10 text-[#525252] hover:border-black/10 hover:text-[#525252] transition-colors"
          >
            Открыть
          </a>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors select-none cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5 ${
            confirmed
              ? 'border-[#1e3a8a]/30 bg-[#1e3a8a]/10 text-[#1e3a8a] hover:bg-[#1e3a8a]/10'
              : 'border-black/10 text-[#525252] hover:border-[#1e3a8a]/30 hover:text-[#1e3a8a]'
          }`}
        >
          {deleting && <Spinner />}
          {deleting ? 'Удаляю…' : confirmed ? 'Подтвердить удаление' : 'Удалить'}
        </button>

        {confirmed && !deleting && (
          <button
            onClick={() => setConfirmed(false)}
            className="text-xs text-[#525252] hover:text-[#525252] cursor-pointer select-none"
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
      <div className="text-center py-16 text-[#525252]">
        <p className="text-sm">Архив пуст — запустите первое исследование</p>
        <a href="/intake" className="mt-4 inline-block text-sm text-[#1e3a8a] hover:underline">
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
