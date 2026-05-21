import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies } from '@/db/schema'
import { parseSections } from '@/lib/strategy/generator'
import { CopyButton } from './CopyButton'
import { SynthesizeButton, RegenerateSectionButton } from './TwoStageActions'
import { BriefReportPanel } from './BriefReportPanel'
import type { PartialStrategyContent } from '@/lib/types'

// Server actions in this segment may run for the full Vercel Hobby budget.
// 300 = Vercel Hobby max with Fluid Compute (Pro allows up to 800).
export const maxDuration = 300

// ─── Section metadata ─────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  business: 'Анализ бизнеса',
  market: 'Анализ рынка',
  audience: 'Анализ целевой аудитории',
  channels: 'Анализ каналов',
  competitors: 'Анализ конкурентов',
  strategy: 'Стратегия и рекомендации',
}

const SECTION_BORDER: Record<string, string> = {
  business: 'border-blue-200',
  market: 'border-purple-200',
  audience: 'border-orange-200',
  channels: 'border-teal-200',
  competitors: 'border-rose-200',
  strategy: 'border-green-200',
}

const SECTION_BG: Record<string, string> = {
  business: 'bg-blue-50',
  market: 'bg-purple-50',
  audience: 'bg-orange-50',
  channels: 'bg-teal-50',
  competitors: 'bg-rose-50',
  strategy: 'bg-green-50',
}

const SECTION_HEADING: Record<string, string> = {
  business: 'text-blue-800',
  market: 'text-purple-800',
  audience: 'text-orange-800',
  channels: 'text-teal-800',
  competitors: 'text-rose-800',
  strategy: 'text-green-800',
}

// ─── Section content renderer ─────────────────────────────────────────────────

/**
 * Renders inline markdown bold (**text**) preserving emoji.
 */
function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/**
 * Renders section content with visual treatment for:
 * - Reliability markers: [ФАКТ] (green) / [ГИПОТЕЗА] (yellow) / [НЕДОСТАТОЧНО ДАННЫХ] (red)
 * - Asset cards: 🏢 / 🏆 — large bold headers
 * - Status lines: ✅ / ❌ / 🎯 — subtle coloured borders
 * - AI-rÑchag block: lines starting with 🤖 — prominent gradient block (this is the conversion driver)
 * - Roadmap horizons: 🔴 / 🟡 / 🟢 — coloured headers
 */
function renderSectionContent(content: string) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()

        // ═══ AI lever — the conversion driver, visually loudest ═══
        if (trimmed.startsWith('🤖')) {
          return (
            <div
              key={i}
              className="my-2 px-3 py-2.5 rounded-lg border border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm"
            >
              <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                {renderInlineBold(line)}
              </p>
            </div>
          )
        }

        // ═══ Asset card headers ═══
        if (/^\*\*🏢|^\*\*🏆/.test(trimmed)) {
          return (
            <h5
              key={i}
              className="text-base font-semibold text-gray-900 mt-4 mb-1.5 pt-2 border-t border-gray-100"
            >
              {renderInlineBold(line)}
            </h5>
          )
        }

        // ═══ Roadmap horizon headers ═══
        if (/^\*\*🔴|^\*\*🟡|^\*\*🟢/.test(trimmed)) {
          return (
            <h5 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1">
              {renderInlineBold(line)}
            </h5>
          )
        }

        // ═══ Card status lines ═══
        if (trimmed.startsWith('✅')) {
          return (
            <p key={i} className="text-sm text-emerald-900 pl-2 leading-relaxed">
              {renderInlineBold(line)}
            </p>
          )
        }
        if (trimmed.startsWith('❌')) {
          return (
            <p key={i} className="text-sm text-rose-900 pl-2 leading-relaxed">
              {renderInlineBold(line)}
            </p>
          )
        }
        if (trimmed.startsWith('🎯')) {
          return (
            <p key={i} className="text-sm text-blue-900 pl-2 leading-relaxed">
              {renderInlineBold(line)}
            </p>
          )
        }

        // ═══ Reliability markers ═══
        const hasFact = line.includes('[ФАКТ]')
        const hasHypothesis = line.includes('[ГИПОТЕЗА]')
        const hasInsufficient =
          line.includes('НЕДОСТАТОЧНО ДАННЫХ') || line.includes('[НЕДОСТАТОЧНО')

        if (hasInsufficient) {
          return (
            <p
              key={i}
              className="text-sm text-red-700 bg-red-50 border-l-2 border-red-300 pl-2 py-0.5 rounded-r leading-relaxed"
            >
              {renderInlineBold(line)}
            </p>
          )
        }
        if (hasFact) {
          return (
            <p
              key={i}
              className="text-sm text-gray-800 border-l-2 border-green-400 pl-2 py-0.5 leading-relaxed"
            >
              {renderInlineBold(line)}
            </p>
          )
        }
        if (hasHypothesis) {
          return (
            <p
              key={i}
              className="text-sm text-gray-800 border-l-2 border-yellow-400 pl-2 py-0.5 leading-relaxed"
            >
              {renderInlineBold(line)}
            </p>
          )
        }

        // ═══ Markdown headers ═══
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-sm font-semibold text-gray-900 mt-3 mb-1">
              {trimmed.slice(4)}
            </h4>
          )
        }

        // ═══ Bullet points ═══
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <p key={i} className="text-sm text-gray-800 pl-3 leading-relaxed">
              {'• '}
              {renderInlineBold(trimmed.slice(2))}
            </p>
          )
        }

        if (trimmed === '') {
          return <div key={i} className="h-1" />
        }

        return (
          <p key={i} className="text-sm text-gray-800 leading-relaxed">
            {renderInlineBold(line)}
          </p>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const isPartial = artifact.status === 'partial'
  const isError = artifact.status === 'error'
  const isDone = artifact.status === 'done'
  const isMock = isDone && artifact.contentMarkdown?.includes('Mock-режим активен')

  const partialContent = isPartial ? (artifact.contentJson as PartialStrategyContent | null) : null
  const partialSections = partialContent?.sections ?? []
  const failedSections = partialSections.filter((s) => s.error)
  const synthesisDisabled = failedSections.length > 0

  const currentArtifactId = artifact.id

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-6">
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
                isDone
                  ? 'text-green-700 bg-green-100'
                  : isError
                    ? 'text-red-700 bg-red-100'
                    : isPartial
                      ? 'text-indigo-700 bg-indigo-100'
                      : 'text-yellow-700 bg-yellow-100'
              }`}
            >
              {isDone
                ? 'Готово'
                : isError
                  ? 'Ошибка'
                  : isPartial
                    ? 'Этап 1: на проверке'
                    : 'Генерируется...'}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Создан: {artifact.createdAt.toLocaleString('ru-RU')}
          </p>
        </div>

        {/* ── Export actions ──────────────────────────────────────── */}
        {isDone && artifact.contentMarkdown && (
          <div className="flex gap-3 mb-6 flex-wrap">
            <CopyButton text={artifact.contentMarkdown} />
            <a
              href={`/api/export/${currentArtifactId}`}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
            >
              Скачать .md
            </a>
          </div>
        )}

        {/* ── Mock mode notice ────────────────────────────────────── */}
        {isMock && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-5 text-xs text-gray-600">
            Стратегия сгенерирована в <strong>mock-режиме</strong>. Для реального анализа задайте{' '}
            <code className="font-mono">ANTHROPIC_API_KEY</code>.
          </div>
        )}

        {/* ── Reliability disclaimer ──────────────────────────────── */}
        {isDone && !isMock && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 mb-6 text-xs text-amber-800">
            <p className="font-semibold mb-1">О достоверности данных</p>
            <p className="mb-1.5">
              Каждое ключевое утверждение маркировано по типу:
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="inline-block border-l-2 border-green-400 pl-1.5 text-gray-700">
                [ФАКТ] — подтверждено источником (RS ≥ 3)
              </span>
              <span className="inline-block border-l-2 border-yellow-400 pl-1.5 text-gray-700">
                [ГИПОТЕЗА] — вероятно, не подтверждено напрямую
              </span>
              <span className="inline-block border-l-2 border-red-300 pl-1.5 text-red-700">
                [НЕДОСТАТОЧНО ДАННЫХ] — данных нет, вывод не делается
              </span>
            </div>
            <p className="text-amber-700">
              Документ носит аналитический характер и не заменяет профессиональную консультацию.
              Качество анализа зависит от объёма и достоверности собранных фактов.
            </p>
          </div>
        )}

        {/* ── Generating state ────────────────────────────────────── */}
        {isGenerating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Стратегия генерируется… Обновите страницу через несколько секунд.
            </p>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────── */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-xs font-medium text-red-700 mb-1">Ошибка генерации</p>
            <p className="text-sm text-red-800 font-mono">{artifact.contentMarkdown}</p>
          </div>
        )}

        {/* ── Partial state (Stage 1 review pause) ────────────────── */}
        {isPartial && (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-indigo-900 mb-1">
                Этап 1 завершён — 5 разделов готовы к проверке
              </p>
              <p className="text-xs text-indigo-700">
                Проверь содержимое 5 разделов ниже. После этого нажми «Запустить синтез общей
                стратегии», чтобы LLM собрал на их основе финальный раздел «Стратегия и рекомендации»
                с трёхгоризонтным планом действий.
              </p>
            </div>

            <div className="space-y-6 mb-6">
              {partialSections.map((section, i) => (
                <div
                  key={section.id}
                  className={`border rounded-lg p-6 ${SECTION_BORDER[section.id] ?? 'border-gray-200'} ${SECTION_BG[section.id] ?? 'bg-white'}`}
                >
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <h2
                      className={`text-base font-semibold ${SECTION_HEADING[section.id] ?? 'text-gray-800'}`}
                    >
                      {i + 1}. {SECTION_LABELS[section.id] ?? section.title}
                    </h2>
                    {section.error && (
                      <RegenerateSectionButton
                        jobId={jobId}
                        artifactId={currentArtifactId}
                        sectionType={section.id}
                      />
                    )}
                  </div>
                  {section.error ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-xs font-medium text-red-700 mb-1">Не удалось сгенерировать секцию</p>
                      <p className="text-xs text-red-800 font-mono break-words">{section.error}</p>
                    </div>
                  ) : (
                    renderSectionContent(section.content)
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white border border-indigo-200 rounded-lg p-5 mb-6">
              <SynthesizeButton
                jobId={jobId}
                artifactId={currentArtifactId}
                disabled={synthesisDisabled}
                disabledReason={
                  synthesisDisabled
                    ? `Перед синтезом нужно перегенерировать ${failedSections.length} упавшую секцию.`
                    : null
                }
              />
            </div>
          </>
        )}

        {/* ── Sections ────────────────────────────────────────────── */}
        {sections.length > 0 && (
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div
                key={section.id}
                className={`border rounded-lg p-6 ${SECTION_BORDER[section.id] ?? 'border-gray-200'} ${SECTION_BG[section.id] ?? 'bg-white'}`}
              >
                <h2
                  className={`text-base font-semibold mb-4 ${SECTION_HEADING[section.id] ?? 'text-gray-800'}`}
                >
                  {i + 1}. {SECTION_LABELS[section.id] ?? section.title}
                </h2>
                {renderSectionContent(section.content)}
              </div>
            ))}
          </div>
        )}

        {/* ── Brief report panel ──────────────────────────────────── */}
        {isDone && !isMock && sections.length > 0 && (
          <BriefReportPanel artifactId={currentArtifactId} />
        )}

        {/* ── Raw markdown fallback ───────────────────────────────── */}
        {sections.length === 0 && isDone && artifact.contentMarkdown && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {artifact.contentMarkdown}
            </pre>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────── */}
        <div className="mt-8 flex gap-4 flex-wrap">
          <a
            href={`/research/${jobId}/validation`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Валидация фактов
          </a>
          <a href={`/research/${jobId}`} className="text-sm text-gray-500 hover:underline">
            ← Исследование
          </a>
          <a href="/archive" className="text-sm text-gray-400 hover:underline">
            Архив отчётов
          </a>
          <a href="/intake" className="text-sm text-gray-400 hover:underline ml-auto">
            Новое исследование
          </a>
        </div>
      </div>
    </main>
  )
}
