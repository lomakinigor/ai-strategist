import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies } from '@/db/schema'
import { parseSections } from '@/lib/strategy/generator'

const SECTION_LABELS: Record<string, string> = {
  business: 'Анализ бизнеса',
  market: 'Анализ рынка',
  audience: 'Анализ целевой аудитории',
  channels: 'Анализ каналов',
  strategy: 'Стратегия и рекомендации',
}

const SECTION_COLORS: Record<string, string> = {
  business: 'border-blue-200 bg-blue-50',
  market: 'border-purple-200 bg-purple-50',
  audience: 'border-orange-200 bg-orange-50',
  channels: 'border-teal-200 bg-teal-50',
  strategy: 'border-green-200 bg-green-50',
}

const SECTION_HEADER_COLORS: Record<string, string> = {
  business: 'text-blue-800',
  market: 'text-purple-800',
  audience: 'text-orange-800',
  channels: 'text-teal-800',
  strategy: 'text-green-800',
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { artifactId?: string }
}) {
  const db = getDb()
  const { id: jobId } = params
  const { artifactId } = searchParams

  // Load research job and company
  const jobs = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  const job = jobs[0]
  if (!job) notFound()

  const comps = await db
    .select()
    .from(companies)
    .where(eq(companies.id, job.companyId))
    .limit(1)

  const company = comps[0]

  // Load artifact — prefer artifactId param, else most recent for this job
  let artifacts
  if (artifactId) {
    artifacts = await db
      .select()
      .from(reportArtifacts)
      .where(eq(reportArtifacts.id, artifactId))
      .limit(1)
  } else {
    artifacts = await db
      .select()
      .from(reportArtifacts)
      .where(eq(reportArtifacts.researchJobId, jobId))
      .limit(1)
  }

  const artifact = artifacts[0]
  if (!artifact) notFound()

  const sections = artifact.contentMarkdown ? parseSections(artifact.contentMarkdown) : []
  const isGenerating = artifact.status === 'generating'
  const isError = artifact.status === 'error'

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {company?.name ?? 'Компания'} — Стратегический анализ
              </h1>
              {company?.industry && (
                <p className="text-sm text-gray-500 mt-1">{company.industry}</p>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${
                artifact.status === 'done'
                  ? 'text-green-700 bg-green-100'
                  : artifact.status === 'error'
                    ? 'text-red-700 bg-red-100'
                    : 'text-yellow-700 bg-yellow-100'
              }`}
            >
              {artifact.status === 'done'
                ? 'Готово'
                : artifact.status === 'error'
                  ? 'Ошибка'
                  : 'Генерируется...'}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Создан: {artifact.createdAt.toLocaleString('ru-RU')}
          </p>
        </div>

        {/* Generating state */}
        {isGenerating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Стратегия генерируется… Обновите страницу через несколько секунд.
            </p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-xs font-medium text-red-700 mb-1">Ошибка генерации</p>
            <p className="text-sm text-red-800 font-mono">{artifact.contentMarkdown}</p>
          </div>
        )}

        {/* Mock mode notice */}
        {artifact.status === 'done' && artifact.contentMarkdown?.includes('Mock-режим активен') && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-6 text-xs text-gray-600">
            Стратегия сгенерирована в <strong>mock-режиме</strong>. Для реального анализа задайте{' '}
            <code className="font-mono">ANTHROPIC_API_KEY</code>.
          </div>
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div
                key={section.id}
                className={`border rounded-lg p-6 ${SECTION_COLORS[section.id] ?? 'border-gray-200 bg-white'}`}
              >
                <h2
                  className={`text-base font-semibold mb-3 ${SECTION_HEADER_COLORS[section.id] ?? 'text-gray-800'}`}
                >
                  {i + 1}. {SECTION_LABELS[section.id] ?? section.title}
                </h2>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raw markdown fallback (error case with content) */}
        {sections.length === 0 && artifact.status === 'done' && artifact.contentMarkdown && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {artifact.contentMarkdown}
            </pre>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <a
            href={`/research/${jobId}/validation`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Валидация фактов
          </a>
          <a href={`/research/${jobId}`} className="text-sm text-gray-500 hover:underline">
            ← Исследование
          </a>
          <a href="/intake" className="text-sm text-gray-400 hover:underline ml-auto">
            Новое исследование
          </a>
        </div>
      </div>
    </main>
  )
}
