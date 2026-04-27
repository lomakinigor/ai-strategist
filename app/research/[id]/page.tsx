import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { researchJobs, companies, facts, sources } from '@/db/schema'
import type { ResearchStatus, ResearchType } from '@/lib/types'
import { AI_CONFIG } from '@/lib/ai/config'
import { triggerResearch } from './actions'

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

const RESEARCH_TYPES: ResearchType[] = ['business', 'market', 'audience', 'channels']

export default async function ResearchStatusPage({ params }: { params: { id: string } }) {
  const db = getDb()
  const researchMode = AI_CONFIG.research.mode

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

  let factsByStream: Partial<Record<ResearchType, string>> = {}
  let jobSources: Array<{ sourceUrl: string | null; sourceName: string }> = []

  if (job.status === 'done') {
    const jobFacts = await db
      .select({ content: facts.content, researchType: facts.researchType, sourceId: facts.sourceId })
      .from(facts)
      .where(eq(facts.researchJobId, job.id))

    for (const type of RESEARCH_TYPES) {
      const first = jobFacts.find((f) => f.researchType === type)
      if (first) factsByStream[type] = first.content
    }

    // Show source links only when facts have real source records (real mode)
    const seen = new Set<string>()
    const sourceIds = jobFacts
      .map((f) => f.sourceId)
      .filter((id): id is string => id != null && !seen.has(id) && seen.add(id) !== undefined)
    if (sourceIds.length > 0) {
      // Fetch up to 8 unique sources
      const sourceRows = await db
        .select({ sourceUrl: sources.sourceUrl, sourceName: sources.sourceName })
        .from(sources)
        .where(eq(sources.companyId, job.companyId))
        .limit(8)
      jobSources = sourceRows.filter((s) => s.sourceUrl != null)
    }
  }

  const streams: Array<{ key: ResearchType; label: string; status: ResearchStatus }> = [
    { key: 'business', label: STREAM_LABELS.business, status: (job.businessStatus ?? 'pending') as ResearchStatus },
    { key: 'market', label: STREAM_LABELS.market, status: (job.marketStatus ?? 'pending') as ResearchStatus },
    { key: 'audience', label: STREAM_LABELS.audience, status: (job.audienceStatus ?? 'pending') as ResearchStatus },
    { key: 'channels', label: STREAM_LABELS.channels, status: (job.channelsStatus ?? 'pending') as ResearchStatus },
  ]

  const overallStatus = job.status as ResearchStatus
  const modeLabel = researchMode === 'real' ? 'Perplexity (real)' : 'mock'
  const modeBadgeClass = researchMode === 'real' ? 'text-purple-700 bg-purple-50' : 'text-gray-500 bg-gray-100'

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-6">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company?.name ?? 'Компания'}</h1>
              {company?.industry && (
                <p className="text-sm text-gray-500 mt-1">{company.industry}</p>
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${modeBadgeClass}`}>
              Режим: {modeLabel}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-700">Общий статус</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[overallStatus]}`}>
              {STATUS_LABELS[overallStatus]}
              {overallStatus === 'done' && ` (${modeLabel})`}
            </span>
          </div>

          <div className="space-y-4">
            {streams.map(({ key, label, status }) => (
              <div key={key}>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                    {status === 'done' && ` (${modeLabel})`}
                  </span>
                </div>
                {status === 'done' && factsByStream[key] && (
                  <p className="text-xs text-gray-500 mt-1 pl-1 italic">
                    {factsByStream[key]}
                  </p>
                )}
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

        {overallStatus === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 mb-3">
              {researchMode === 'real'
                ? 'Запустить реальное исследование через Perplexity Sonar по всем 4 потокам.'
                : 'Запустить имитацию исследования (mock-режим, без реальных запросов в Perplexity).'}
            </p>
            <form action={triggerResearch}>
              <input type="hidden" name="jobId" value={job.id} />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {researchMode === 'real'
                  ? 'Запустить исследование Perplexity'
                  : 'Запустить имитацию исследования (mock)'}
              </button>
            </form>
          </div>
        )}

        {overallStatus === 'running' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              {researchMode === 'real'
                ? 'Идёт исследование через Perplexity Sonar… Обновите страницу для проверки статуса.'
                : 'Идёт mock-исследование по всем 4 потокам… Обновите страницу для проверки статуса.'}
            </p>
          </div>
        )}

        {overallStatus === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800 mb-3">
              {researchMode === 'real'
                ? 'Исследование Perplexity завершено. Данные с источниками готовы для валидации.'
                : 'Mock-исследование завершено. Данные готовы для валидации фактов.'}
            </p>
            <a
              href={`/research/${params.id}/validation`}
              className="inline-block w-full text-center bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
            >
              Перейти к валидации фактов →
            </a>
          </div>
        )}

        {jobSources.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Источники исследования</p>
            <ul className="space-y-1">
              {jobSources.map((s, i) => (
                <li key={i} className="text-xs">
                  <a
                    href={s.sourceUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {s.sourceName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {overallStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-red-700 mb-1">Ошибка</p>
            <p className="text-sm text-red-800">
              {job.errorMessage ?? 'Произошла ошибка при выполнении исследования.'}
            </p>
            {researchMode === 'real' && job.errorMessage?.includes('PERPLEXITY_API_KEY') && (
              <p className="text-xs text-red-600 mt-2">
                Перейдите в режим mock (RESEARCH_MODE=mock) или задайте PERPLEXITY_API_KEY.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 text-center">
          <a href="/intake" className="text-sm text-blue-600 hover:underline">
            Создать ещё одно исследование
          </a>
        </div>
      </div>
    </main>
  )
}
