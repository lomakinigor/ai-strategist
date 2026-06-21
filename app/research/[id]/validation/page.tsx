import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

// Strategy generation server action runs on this route segment; needs >10s.
// 300 = Vercel Hobby max with Fluid Compute (Pro allows up to 800).
export const maxDuration = 300

import { getDb } from '@/db'
import { researchJobs, companies } from '@/db/schema'
import { AI_CONFIG } from '@/lib/ai/config'
import { getFactsForJob } from '@/lib/reporting/validation'
import type { ResearchType, FactType, ConfidenceLevel } from '@/lib/types'
import Link from 'next/link'
import { FactToggleButton } from './FactToggleButton'

// ─── Label maps ──────────────────────────────────────────────────────────────

const STREAM_LABELS: Record<ResearchType, string> = {
  business: 'Бизнес',
  market: 'Рынок',
  audience: 'Аудитория',
  channels: 'Каналы',
  competitors: 'Конкуренты',
}

const STREAM_COLORS: Record<ResearchType, string> = {
  business: 'bg-blue-100 text-blue-700',
  market: 'bg-purple-100 text-purple-700',
  audience: 'bg-green-100 text-green-700',
  channels: 'bg-orange-100 text-orange-700',
  competitors: 'bg-rose-100 text-rose-700',
}

const FACT_TYPE_LABELS: Record<FactType, string> = {
  FACT: 'Факт',
  HYPOTHESIS: 'Гипотеза',
  INSUFFICIENT_DATA: 'Нехватка данных',
}

const FACT_TYPE_COLORS: Record<FactType, string> = {
  FACT: 'bg-green-100 text-green-700',
  HYPOTHESIS: 'bg-amber-100 text-amber-700',
  INSUFFICIENT_DATA: 'bg-gray-100 text-gray-600',
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  HIGH: 'Высокая',
  MEDIUM: 'Средняя',
  LOW: 'Низкая',
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-red-100 text-red-700',
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  registry: 'Реестр',
  official_site: 'Сайт',
  social: 'Соцсети',
  ad: 'Реклама',
  aggregator: 'Агрегатор',
}

const ALL_STREAMS: ResearchType[] = ['business', 'market', 'audience', 'channels', 'competitors']
const ALL_FACT_TYPES: FactType[] = ['FACT', 'HYPOTHESIS', 'INSUFFICIENT_DATA']
const ALL_CONFIDENCES: ConfidenceLevel[] = ['HIGH', 'MEDIUM', 'LOW']

// ─── URL helpers ─────────────────────────────────────────────────────────────

function parseList(value: string | string[] | undefined): string[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value[0] : value
  return raw ? raw.split(',').filter(Boolean) : []
}

function buildUrl(
  jobId: string,
  streams: ResearchType[],
  factTypes: FactType[],
  confidences: ConfidenceLevel[],
  onlyActive: boolean,
): string {
  const p = new URLSearchParams()
  if (streams.length) p.set('streams', streams.join(','))
  if (factTypes.length) p.set('factTypes', factTypes.join(','))
  if (confidences.length) p.set('confidences', confidences.join(','))
  if (onlyActive) p.set('onlyActive', '1')
  const qs = p.toString()
  return `/research/${jobId}/validation${qs ? `?${qs}` : ''}`
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ValidationPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
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

  // Parse active filters from URL
  const activeStreams = parseList(searchParams.streams) as ResearchType[]
  const activeFactTypes = parseList(searchParams.factTypes) as FactType[]
  const activeConfidences = parseList(searchParams.confidences) as ConfidenceLevel[]
  const onlyActive = searchParams.onlyActive === '1'

  const hasFilters =
    activeStreams.length > 0 ||
    activeFactTypes.length > 0 ||
    activeConfidences.length > 0 ||
    onlyActive

  // Fetch facts with current filters
  const filteredFacts = await getFactsForJob(params.id, {
    streams: activeStreams.length ? activeStreams : undefined,
    factTypes: activeFactTypes.length ? activeFactTypes : undefined,
    confidences: activeConfidences.length ? activeConfidences : undefined,
    onlyActive,
  })

  // Always fetch total count (no filters) for stats
  const allFacts = await getFactsForJob(params.id)
  const totalActive = allFacts.filter((f) => f.isActive).length

  const modeBadgeClass =
    researchMode === 'real' ? 'text-purple-700 bg-purple-50' : 'text-gray-500 bg-gray-100'
  const modeLabel = researchMode === 'real' ? 'Perplexity (real)' : 'mock'

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <a href={`/research/${params.id}`} className="text-xs text-blue-600 hover:underline mb-1 block">
                ← Назад к статусу исследования
              </a>
              <h1 className="text-2xl font-bold text-gray-900">{company?.name ?? 'Компания'}</h1>
              {company?.industry && (
                <p className="text-sm text-gray-500 mt-0.5">{company.industry}</p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Выберите факты, которые войдут в итоговый отчёт и стратегию.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeBadgeClass}`}>
                Режим: {modeLabel}
              </span>
              <span className="text-xs text-gray-400">
                Активных: {totalActive} из {allFacts.length}
              </span>
            </div>
          </div>
        </div>

        {/* ── No facts at all ── */}
        {allFacts.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">
              Исследование ещё не содержит фактов. Сначала запустите research pipeline.
            </p>
            <a
              href={`/research/${params.id}`}
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Перейти к запуску исследования
            </a>
          </div>
        )}

        {allFacts.length > 0 && (
          <>
            {/* ── Filter panel ── */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              {/* Stream filter */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Поток</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_STREAMS.map((stream) => {
                    const selected = activeStreams.includes(stream)
                    const href = buildUrl(
                      params.id,
                      toggle(activeStreams, stream),
                      activeFactTypes,
                      activeConfidences,
                      onlyActive,
                    )
                    return (
                      <a
                        key={stream}
                        href={href}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {STREAM_LABELS[stream]}
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Fact type filter */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Тип факта</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_FACT_TYPES.map((ft) => {
                    const selected = activeFactTypes.includes(ft)
                    const href = buildUrl(
                      params.id,
                      activeStreams,
                      toggle(activeFactTypes, ft),
                      activeConfidences,
                      onlyActive,
                    )
                    return (
                      <a
                        key={ft}
                        href={href}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {FACT_TYPE_LABELS[ft]}
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Confidence filter */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Достоверность</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CONFIDENCES.map((conf) => {
                    const selected = activeConfidences.includes(conf)
                    const href = buildUrl(
                      params.id,
                      activeStreams,
                      activeFactTypes,
                      toggle(activeConfidences, conf),
                      onlyActive,
                    )
                    return (
                      <a
                        key={conf}
                        href={href}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {CONFIDENCE_LABELS[conf]}
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Only-active toggle + reset */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <a
                  href={buildUrl(
                    params.id,
                    activeStreams,
                    activeFactTypes,
                    activeConfidences,
                    !onlyActive,
                  )}
                  className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                    onlyActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  Только активные
                </a>
                {hasFilters && (
                  <a
                    href={`/research/${params.id}/validation`}
                    className="text-xs text-gray-500 hover:text-red-600 hover:underline"
                  >
                    Сбросить фильтры
                  </a>
                )}
              </div>
            </div>

            {/* ── Fact count ── */}
            <p className="text-xs text-gray-500 mb-3">
              {hasFilters
                ? `Показано ${filteredFacts.length} из ${allFacts.length} фактов`
                : `Всего фактов: ${allFacts.length}`}
            </p>

            {/* ── Filter empty state ── */}
            {filteredFacts.length === 0 && hasFilters && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500">
                  По текущим фильтрам фактов не найдено. Попробуйте ослабить фильтры.
                </p>
                <a
                  href={`/research/${params.id}/validation`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Сбросить все фильтры
                </a>
              </div>
            )}

            {/* ── Fact list ── */}
            {filteredFacts.length > 0 && (
              <div className="space-y-3">
                {filteredFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className={`bg-white border rounded-lg p-4 transition-opacity ${
                      fact.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <FactToggleButton jobId={params.id} factId={fact.id} isActive={fact.isActive} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STREAM_COLORS[fact.researchType]}`}
                          >
                            {STREAM_LABELS[fact.researchType]}
                          </span>
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${FACT_TYPE_COLORS[fact.factType]}`}
                          >
                            {FACT_TYPE_LABELS[fact.factType]}
                          </span>
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[fact.confidence]}`}
                          >
                            {CONFIDENCE_LABELS[fact.confidence]}
                          </span>
                          <span className="inline-block text-xs font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            RS:{fact.rs}
                          </span>
                        </div>

                        {/* Text */}
                        <p className="text-sm text-gray-800 leading-relaxed">{fact.content}</p>

                        {/* Source */}
                        {fact.source && (
                          <div className="mt-2 flex items-center gap-2">
                            {fact.source.url ? (
                              <a
                                href={fact.source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate max-w-xs"
                                title={fact.source.url}
                              >
                                {new URL(fact.source.url).hostname}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">{fact.source.label}</span>
                            )}
                            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                              {SOURCE_TYPE_LABELS[fact.source.type] ?? fact.source.type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Footer CTA ── */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Активных фактов для отчёта: <span className="font-medium text-gray-700">{totalActive}</span>
              </p>
              {totalActive === 0 ? (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Сформировать стратегию →
                </button>
              ) : (
                <Link
                  href={`/research/${params.id}/report`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Открыть полный отчёт →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
