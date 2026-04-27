import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { researchJobs, companies } from '@/db/schema'
import type { ResearchStatus } from '@/lib/types'

const STATUS_LABELS: Record<ResearchStatus, string> = {
  pending: 'Ожидает запуска',
  running: 'Выполняется',
  done: 'Завершено',
  error: 'Ошибка',
}

const STATUS_COLORS: Record<ResearchStatus, string> = {
  pending: 'text-yellow-600 bg-yellow-50',
  running: 'text-blue-600 bg-blue-50',
  done: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
}

const STREAM_LABELS: Record<string, string> = {
  business: 'Анализ бизнеса',
  market: 'Анализ рынка',
  audience: 'Анализ аудитории',
  channels: 'Анализ каналов',
}

export default async function ResearchStatusPage({ params }: { params: { id: string } }) {
  const db = getDb()

  const jobs = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, params.id))
    .limit(1)

  const job = jobs[0]
  if (!job) notFound()

  const comps = await db
    .select()
    .from(companies)
    .where(eq(companies.id, job.companyId))
    .limit(1)

  const company = comps[0]

  const streams: Array<{ key: string; label: string; status: ResearchStatus }> = [
    { key: 'business', label: STREAM_LABELS.business, status: (job.businessStatus ?? 'pending') as ResearchStatus },
    { key: 'market', label: STREAM_LABELS.market, status: (job.marketStatus ?? 'pending') as ResearchStatus },
    { key: 'audience', label: STREAM_LABELS.audience, status: (job.audienceStatus ?? 'pending') as ResearchStatus },
    { key: 'channels', label: STREAM_LABELS.channels, status: (job.channelsStatus ?? 'pending') as ResearchStatus },
  ]

  const overallStatus = job.status as ResearchStatus

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{company?.name ?? 'Компания'}</h1>
          {company?.industry && (
            <p className="text-sm text-gray-500 mt-1">{company.industry}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-700">Общий статус</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[overallStatus]}`}>
              {STATUS_LABELS[overallStatus]}
            </span>
          </div>

          <div className="space-y-3">
            {streams.map(({ key, label, status }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {company?.goals && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Цель исследования</p>
            <p className="text-sm text-gray-700">{company.goals}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Автоматическое исследование по всем 4 направлениям будет реализовано в следующих
          обновлениях. Статус обновляется по мере выполнения каждого потока.
        </p>

        <div className="mt-4 text-center">
          <a href="/intake" className="text-sm text-blue-600 hover:underline">
            Создать ещё одно исследование
          </a>
        </div>
      </div>
    </main>
  )
}
