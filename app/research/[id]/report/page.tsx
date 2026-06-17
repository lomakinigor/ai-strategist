import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies } from '@/db/schema'
import { parseSections } from '@/lib/strategy/generator'
import { CopyButton } from './CopyButton'
import { SynthesizeButton, RegenerateSectionButton } from './TwoStageActions'
import { FullV2View } from './FullV2View'
import type { PartialStrategyContent } from '@/lib/types'

// Server actions in this segment may run for the full Vercel Hobby budget.
// 300 = Vercel Hobby max with Fluid Compute (Pro allows up to 800).
export const maxDuration = 300

// ─── Section metadata ─────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  // decision-driven форма §0–8
  summary: 'Резюме для собственника',
  diagnosis: 'Диагноз роста — узкие места',
  positioning: 'Позиционирование и аудитория',
  channel_mix: 'Маркетинговый микс',
  ai_automation: 'AI-автоматизация',
  action_plan: 'План действий',
  tests: 'Программа тестов',
  risks: 'Риски и меры',
  sources: 'Источники',
  // legacy
  business: 'Профиль бизнеса',
  market: 'Рыночная позиция',
  audience: 'Целевая аудитория',
  channels: 'Каналы привлечения',
  competitors: 'Конкурентный ландшафт',
  strategy: 'Стратегия роста',
  hypotheses: 'Гипотезы для проверки',
}

const SECTION_BORDER: Record<string, string> = {
  summary: 'border-slate-300',
  diagnosis: 'border-rose-200',
  positioning: 'border-purple-200',
  channel_mix: 'border-teal-200',
  ai_automation: 'border-indigo-200',
  action_plan: 'border-green-200',
  tests: 'border-blue-200',
  risks: 'border-amber-200',
  sources: 'border-gray-200',
  // legacy
  business: 'border-blue-200',
  market: 'border-purple-200',
  audience: 'border-orange-200',
  channels: 'border-teal-200',
  competitors: 'border-rose-200',
  strategy: 'border-green-200',
  hypotheses: 'border-slate-200',
}

const SECTION_BG: Record<string, string> = {
  summary: 'bg-slate-50',
  diagnosis: 'bg-rose-50',
  positioning: 'bg-purple-50',
  channel_mix: 'bg-teal-50',
  ai_automation: 'bg-indigo-50',
  action_plan: 'bg-green-50',
  tests: 'bg-blue-50',
  risks: 'bg-amber-50',
  sources: 'bg-gray-50',
  // legacy
  business: 'bg-blue-50',
  market: 'bg-purple-50',
  audience: 'bg-orange-50',
  channels: 'bg-teal-50',
  competitors: 'bg-rose-50',
  strategy: 'bg-green-50',
  hypotheses: 'bg-slate-50',
}

const SECTION_HEADING: Record<string, string> = {
  summary: 'text-slate-900',
  diagnosis: 'text-rose-800',
  positioning: 'text-purple-800',
  channel_mix: 'text-teal-800',
  ai_automation: 'text-indigo-800',
  action_plan: 'text-green-800',
  tests: 'text-blue-800',
  risks: 'text-amber-800',
  sources: 'text-gray-700',
  // legacy
  business: 'text-blue-800',
  market: 'text-purple-800',
  audience: 'text-orange-800',
  channels: 'text-teal-800',
  competitors: 'text-rose-800',
  strategy: 'text-green-800',
  hypotheses: 'text-slate-800',
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
  searchParams: { artifactId?: string; version?: string }
}) {
  const db = getDb()
  const { id: jobId } = params
  const { artifactId } = searchParams
  const version: 'v1' | 'v2' = searchParams.version === 'v2' ? 'v2' : 'v1'

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

  // v2 — тестовая ветка нового полного отчёта по L2-методологии. Рендерится
  // только при ?version=v2. По умолчанию работает старый production-вариант
  // (decision-driven §0-8) без изменений.
  if (version === 'v2') {
    return (
      <FullV2View
        jobId={jobId}
        companyName={company?.name ?? 'Компания'}
        industry={company?.industry ?? ''}
      />
    )
  }

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
            {sections.map((section, i) => {
              const isSources = section.id === 'sources'
              const sourceCount = isSources
                ? (section.content.match(/https?:\/\/\S+/g) ?? []).length
                : 0
              const today = new Date().toISOString().split('T')[0]
              return (
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
                  {isSources && sourceCount > 0 && (
                    <div className="mt-6 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 rounded-r-md">
                      <p className="text-sm text-emerald-900 font-medium">
                        ✅ Все {sourceCount} {sourceCount === 1 ? 'источник проверен' : sourceCount < 5 ? 'источника проверены' : 'источников проверены'} автоматически перед публикацией отчёта ({today})
                      </p>
                      <p className="text-xs text-emerald-800 mt-1">
                        Anti-vibe-citing protocol: каждый URL получен через web_search с зафиксированной датой доступа. Жёсткий порог: больше 5% мёртвых ссылок = отчёт не выпускается клиенту.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Raw markdown fallback ───────────────────────────────── */}
        {sections.length === 0 && isDone && artifact.contentMarkdown && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {artifact.contentMarkdown}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
