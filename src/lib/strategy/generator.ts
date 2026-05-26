import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies } from '@/db/schema'
import { buildResearchContext, serializeContext, type ResearchContext } from '@/lib/rag/context'
import { AI_CONFIG } from '@/lib/ai/config'
import {
  buildSectionSystemPrompt,
  buildSectionUserPrompt,
  buildSynthesisUserPrompt,
  buildFullReportPrompt,
  STRATEGY_SYNTHESIS_SYSTEM_PROMPT,
  SECTION_TITLES,
} from './prompts'
import { detectNiche, loadReportRequirements } from './kb'
import { serializeConfirmation, type Confirmation } from './confirm-types'
import type {
  PartialStrategyContent,
  StrategySection,
  StrategySectionType,
} from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SectionId =
  // decision-driven форма §0–8 (текущая)
  | 'summary' // §0 Резюме для собственника
  | 'diagnosis' // §1 Диагноз роста — узкие места
  | 'positioning' // §2 Позиционирование и аудитория
  | 'channel_mix' // §3 Маркетинговый микс
  | 'ai_automation' // §4 AI-автоматизация (общий с legacy)
  | 'action_plan' // §5 План действий по горизонтам
  | 'tests' // §6 Программа тестов продвижения
  | 'risks' // §7 Риски и меры
  | 'sources' // §8 Источники
  // legacy тематическая форма (обратная совместимость со старыми отчётами)
  | 'business'
  | 'market'
  | 'audience'
  | 'channels'
  | 'competitors'
  | 'strategy'
  | 'hypotheses'

export interface StrategySectionRendered {
  id: SectionId
  title: string
  content: string
}

export interface StrategyDraftResult {
  reportArtifactId: string
  sections: StrategySectionRendered[]
  contentMarkdown: string
  generatedAt: Date
  modelId: string
  contextFactCount: number
  mode: 'mock' | 'real'
  // Status of artifact after this call. In two-stage mode Stage 1 returns 'partial'; one-shot returns 'done'.
  status: 'partial' | 'done'
}

// ─── Section parsing (markdown → sections, used by report page) ──────────────

// Сопоставление заголовка раздела с SectionId по ключевым словам.
// Поддерживает обе схемы: старую (one-shot/two-stage «Анализ ...», «Стратегия и
// рекомендации») и новую FULL_REPORT (8 разделов в верхнем регистре). Матчинг по
// подстроке устойчив к суффиксам вроде «(H1–H6)» и регистру.
function classifySectionTitle(rawTitle: string): SectionId | null {
  const t = rawTitle.toLowerCase()
  // Порядок важен: новая decision-driven форма раньше legacy, специфичное раньше общего.
  // ── decision-driven форма §0–8 ──
  if (t.includes('резюме') || t.includes('собственник')) return 'summary'
  if (t.includes('диагноз') || t.includes('узк')) return 'diagnosis' // «узкие места»
  if (t.includes('позициониров')) return 'positioning' // до 'аудитори', т.к. «Позиционирование и аудитория»
  if (t.includes('микс')) return 'channel_mix' // «маркетинговый микс»
  if (t.includes('план действ') || t.includes('дорожн')) return 'action_plan' // до 'стратег'
  if (t.includes('тест') || t.includes('эксперимент')) return 'tests'
  if (t.includes('риск')) return 'risks'
  if (t.includes('источник')) return 'sources'
  // ── общий для обеих форм ──
  if (t.includes('ai-автоматизац') || t.includes('ai автоматизац') || t.includes('автоматизац'))
    return 'ai_automation'
  // ── legacy тематическая форма ──
  if (t.includes('гипотез')) return 'hypotheses'
  if (t.includes('профиль') || t.includes('бизнес')) return 'business'
  if (t.includes('рын')) return 'market' // «рынок», «рыночная позиция»
  if (t.includes('аудитори')) return 'audience'
  if (t.includes('канал')) return 'channels'
  if (t.includes('конкурент')) return 'competitors'
  if (t.includes('стратег')) return 'strategy'
  return null
}

export function parseSections(markdown: string): StrategySectionRendered[] {
  const sections: StrategySectionRendered[] = []
  const parts = markdown.split(/(?=##\s+\d+\.\s+)/)

  for (const part of parts) {
    const headerMatch = part.match(/^##\s+\d+\.\s+(.+?)\n([\s\S]*)$/)
    if (!headerMatch) continue
    const title = headerMatch[1].trim()
    const content = headerMatch[2].trim()
    const id = classifySectionTitle(title)
    if (id) {
      sections.push({ id, title, content })
    }
  }

  return sections
}

// ─── Mock draft (no API key) ─────────────────────────────────────────────────

function getMockDraft(factCount: number): string {
  const dataNote =
    factCount > 0
      ? `Контекст содержит ${factCount} фактов из research pipeline.`
      : 'Контекст не содержит фактов. Запустите research pipeline перед генерацией стратегии.'

  return `## 0. РЕЗЮМЕ ДЛЯ СОБСТВЕННИКА
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Для генерации реального анализа настройте OPENROUTER_API_KEY.]

${dataNote} В реальном режиме здесь — тезис, три уровня действий (Фундамент / Быстрый старт / Умножитель) и цена бездействия.

## 1. ДИАГНОЗ РОСТА — УЗКИЕ МЕСТА
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — 3–5 узких мест, каждое: факт с маркировкой → последствие → куда ведёт.

## 2. ПОЗИЦИОНИРОВАНИЕ И АУДИТОРИЯ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — свободная ниша, сегменты с триггерами, отстройка от конкурентов, сообщение первого экрана.

## 3. МАРКЕТИНГОВЫЙ МИКС ПОД НИШУ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — ранжированная таблица каналов РФ с CPL-ориентиром и бюджетом в ₽.

## 4. AI-АВТОМАТИЗАЦИЯ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — AI-рычаги, каждый закрывает узкое место из §1, с эффектом в ₽/часах и ROI.

## 5. ПЛАН ДЕЙСТВИЙ ПО ГОРИЗОНТАМ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — действия по горизонтам (неделя / 30–60 дней / 3–6 месяцев) с owner и метрикой.

## 6. ПРОГРАММА ТЕСТОВ ПРОДВИЖЕНИЯ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — тесты T1…Tn с гипотезой, метрикой, сроком и двумя исходами.

## 7. РИСКИ И МЕРЫ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — таблица «риск / сигнал / мера».

## 8. ИСТОЧНИКИ
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен.]

В реальном режиме — таблица «факт / источник / дата / RS».`
}

// ─── OpenRouter chat call (single LLM round-trip) ────────────────────────────

interface OpenRouterChatResponse {
  choices: Array<{ message: { content: string } }>
}

export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  modelId?: string,
): Promise<{ content: string; modelId: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }
  const model = modelId ?? AI_CONFIG.strategy.defaultModel

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://ai-strategist-bice.vercel.app',
      'X-Title': 'ai-strategist',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      provider: { allow_fallbacks: true, sort: 'throughput' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as OpenRouterChatResponse
  return {
    content: data.choices[0]?.message?.content ?? '',
    modelId: model,
  }
}

// Public helper kept for backwards compatibility with existing tests / one-shot path
export async function callStrategyLLM(
  systemPrompt: string,
  userPrompt: string,
  modelId?: string,
): Promise<{ content: string; modelId: string }> {
  return callOpenRouter(systemPrompt, userPrompt, 5000, modelId)
}

// ─── Stage 1: per-section generation ─────────────────────────────────────────

const STAGE_ONE_SECTION_TYPES: StrategySectionType[] = [
  'business',
  'market',
  'audience',
  'channels',
  'competitors',
]

// Sections 1 (business) and 4 (channels) routinely truncated mid-word at 1800 — bumped
// to 3000 so the model can finish all required cards. Each Stage-1 call still fits inside
// the Vercel 60s limit because all 5 sections run in parallel.
const SECTION_MAX_TOKENS = 3000

export async function generateSectionDraft(
  sectionType: StrategySectionType,
  context: ResearchContext,
  kbRequirements?: string,
): Promise<StrategySection> {
  const title = SECTION_TITLES[sectionType]
  const generatedAt = new Date().toISOString()

  try {
    const systemPrompt = buildSectionSystemPrompt(sectionType, kbRequirements)
    const userPrompt = buildSectionUserPrompt(sectionType, context)
    const { content, modelId } = await callOpenRouter(
      systemPrompt,
      userPrompt,
      SECTION_MAX_TOKENS,
      AI_CONFIG.strategy.defaultModel,
    )
    const trimmed = content.trim()
    // OpenRouter sometimes returns 200 OK with empty content (provider timeout, content
    // filter, or model returning only reasoning tokens). Without this guard the section
    // is stored as content="" / error=null and the report page renders a blank block —
    // the user has no way to retry. Convert the empty response into an error so the UI
    // surfaces a regenerate button.
    if (!trimmed) {
      throw new Error('LLM вернул пустой ответ — недостаточно фактов или таймаут провайдера')
    }
    return {
      id: sectionType,
      title,
      content: trimmed,
      generatedAt,
      modelId,
      error: null,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return {
      id: sectionType,
      title,
      content: '',
      generatedAt,
      modelId: AI_CONFIG.strategy.defaultModel,
      error: errMsg,
    }
  }
}

export async function generateAllSectionsParallel(
  context: ResearchContext,
  kbRequirements?: string,
): Promise<StrategySection[]> {
  return Promise.all(
    STAGE_ONE_SECTION_TYPES.map((type) => generateSectionDraft(type, context, kbRequirements)),
  )
}

// ─── Stage 2: synthesis ──────────────────────────────────────────────────────

// Синтез теперь генерит 3 раздела (6 AI-автоматизация, 7 Стратегия, 8 Гипотезы),
// а не один — лимит повышен.
const SYNTHESIS_MAX_TOKENS = 6000

// FULL_REPORT — 8 разделов, 3000–5000 слов русского текста. Русский токенизируется
// дороже (~2–3 токена/слово), поэтому лимит сильно выше синтеза. Vercel maxDuration=300
// и Claude Sonnet 4.6 (до 64k output) это выдерживают.
const FULL_REPORT_MAX_TOKENS = 16000

function assembleFullMarkdown(
  sections: StrategySection[],
  synthesisBody: string,
): string {
  const ordered = STAGE_ONE_SECTION_TYPES.map((t) => sections.find((s) => s.id === t)).filter(
    (s): s is StrategySection => Boolean(s),
  )

  const blocks: string[] = []
  ordered.forEach((s, idx) => {
    const body = s.error ? `[НЕДОСТАТОЧНО ДАННЫХ: секция не сгенерирована — ${s.error}]` : s.content
    blocks.push(`## ${idx + 1}. ${s.title}\n\n${body}`)
  })

  // synthesisBody уже содержит разделы 6, 7, 8 с собственными заголовками «## N. ...».
  blocks.push(synthesisBody.trim())

  return blocks.join('\n\n')
}

export async function synthesizeStrategy(artifactId: string): Promise<StrategyDraftResult> {
  const db = getDb()

  const rows = await db
    .select()
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact) {
    throw new Error(`Report artifact not found: ${artifactId}`)
  }
  if (artifact.status !== 'partial') {
    throw new Error(
      `Cannot synthesize artifact in status='${artifact.status}': expected 'partial'.`,
    )
  }

  const partial = artifact.contentJson as PartialStrategyContent | null
  if (!partial?.sections || partial.sections.length === 0) {
    throw new Error('Artifact contentJson is empty: nothing to synthesize.')
  }

  const failed = partial.sections.filter((s) => s.error)
  if (failed.length > 0) {
    throw new Error(
      `Cannot synthesize: ${failed.length} section(s) have failed sections — перегенерируй: ${failed.map((s) => s.id).join(', ')}.`,
    )
  }

  // Подгружаем требования базы знаний по нише компании для синтеза разделов 6–8.
  const [company] = await db
    .select({ name: companies.name, industry: companies.industry, description: companies.description })
    .from(companies)
    .where(eq(companies.id, artifact.companyId))
    .limit(1)
  const nicheId = await detectNiche(
    [company?.industry, company?.name, company?.description].filter(Boolean).join(' '),
  )
  const reqs = await loadReportRequirements(nicheId)

  try {
    const userPrompt = buildSynthesisUserPrompt(partial.sections, reqs.combinedMarkdown)
    const { content: synthesisBody, modelId } = await callOpenRouter(
      STRATEGY_SYNTHESIS_SYSTEM_PROMPT,
      userPrompt,
      SYNTHESIS_MAX_TOKENS,
      AI_CONFIG.strategy.synthesisModel,
    )

    const fullMarkdown = assembleFullMarkdown(partial.sections, synthesisBody)

    await db
      .update(reportArtifacts)
      .set({
        status: 'done',
        contentMarkdown: fullMarkdown,
        updatedAt: new Date(),
      })
      .where(eq(reportArtifacts.id, artifactId))

    return {
      reportArtifactId: artifactId,
      sections: parseSections(fullMarkdown),
      contentMarkdown: fullMarkdown,
      generatedAt: new Date(),
      modelId,
      contextFactCount: partial.sections.length,
      mode: 'real',
      status: 'done',
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    await db
      .update(reportArtifacts)
      .set({ status: 'error', contentMarkdown: errMsg, updatedAt: new Date() })
      .where(eq(reportArtifacts.id, artifactId))
    throw error
  }
}

// ─── Per-section regenerate (UI retry button) ────────────────────────────────

export async function regenerateSection(
  artifactId: string,
  sectionType: StrategySectionType,
  jobId: string,
): Promise<StrategySection> {
  const db = getDb()

  const context = await buildResearchContext(jobId)

  // KB-требования по нише — чтобы перегенерированная секция следовала тем же правилам.
  const [job] = await db
    .select({ companyId: researchJobs.companyId })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)
  let kbRequirements: string | undefined
  if (job?.companyId) {
    const [company] = await db
      .select({ name: companies.name, industry: companies.industry, description: companies.description })
      .from(companies)
      .where(eq(companies.id, job.companyId))
      .limit(1)
    const nicheId = await detectNiche(
      [company?.industry, company?.name, company?.description].filter(Boolean).join(' '),
    )
    kbRequirements = (await loadReportRequirements(nicheId)).combinedMarkdown
  }

  const newSection = await generateSectionDraft(sectionType, context, kbRequirements)

  const rows = await db
    .select()
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact) {
    throw new Error(`Report artifact not found: ${artifactId}`)
  }

  const partial = (artifact.contentJson ?? { stage: 1, sections: [] }) as PartialStrategyContent
  const updatedSections = partial.sections.map((s) => (s.id === sectionType ? newSection : s))

  await db
    .update(reportArtifacts)
    .set({
      contentJson: { stage: 1, sections: updatedSections },
      updatedAt: new Date(),
    })
    .where(eq(reportArtifacts.id, artifactId))

  return newSection
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function generateStrategyDraft(jobId: string): Promise<StrategyDraftResult> {
  const db = getDb()

  const jobRows = await db
    .select({ companyId: researchJobs.companyId, confirmationsJson: researchJobs.confirmationsJson })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  const companyId = jobRows[0]?.companyId
  if (!companyId) {
    throw new Error(`Research job not found: ${jobId}`)
  }
  // Подтверждённые клиентом данные (гейт «Подтверди и поправь») — авторитетный префикс,
  // перекрывает домыслы research при генерации FULL_REPORT.
  const confirmation = jobRows[0]?.confirmationsJson as Confirmation | null
  const confirmedPreamble = confirmation ? serializeConfirmation(confirmation) : ''

  const companyRows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)
  const company = companyRows[0]

  const inserted = await db
    .insert(reportArtifacts)
    .values({
      companyId,
      researchJobId: jobId,
      status: 'generating',
    })
    .returning({ id: reportArtifacts.id })

  const artifactId = inserted[0].id

  const hasApiKey = Boolean(process.env.OPENROUTER_API_KEY)
  const twoStage = AI_CONFIG.strategy.twoStageReview && hasApiKey

  try {
    const context = await buildResearchContext(jobId)

    if (!hasApiKey) {
      // Mock mode — single combined markdown, status=done.
      const contentMarkdown = getMockDraft(context.totalFactCount)
      await db
        .update(reportArtifacts)
        .set({ status: 'done', contentMarkdown, updatedAt: new Date() })
        .where(eq(reportArtifacts.id, artifactId))
      return {
        reportArtifactId: artifactId,
        sections: parseSections(contentMarkdown),
        contentMarkdown,
        generatedAt: new Date(),
        modelId: 'mock',
        contextFactCount: context.totalFactCount,
        mode: 'mock',
        status: 'done',
      }
    }

    // KB-требования (universal + ниша) — нужны и Stage 1 (направления), и one-shot.
    const nicheId = await detectNiche(
      [company?.industry, company?.name, company?.description].filter(Boolean).join(' '),
    )
    const reqs = await loadReportRequirements(nicheId)

    if (twoStage) {
      // Stage 1: 5 параллельных черновиков направлений (разделы 1–5), persist as partial.
      const sections = await generateAllSectionsParallel(context, reqs.combinedMarkdown)
      const contentJson: PartialStrategyContent = { stage: 1, sections }

      await db
        .update(reportArtifacts)
        .set({
          status: 'partial',
          contentJson,
          contentMarkdown: null,
          updatedAt: new Date(),
        })
        .where(eq(reportArtifacts.id, artifactId))

      return {
        reportArtifactId: artifactId,
        sections: [],
        contentMarkdown: '',
        generatedAt: new Date(),
        modelId: AI_CONFIG.strategy.defaultModel,
        contextFactCount: context.totalFactCount,
        mode: 'real',
        status: 'partial',
      }
    }

    // One-shot path (twoStageReview=false): полный отчёт FULL_REPORT (8 разделов)
    // одним вызовом на synthesisModel, повышенный лимит токенов под 3000–5000 слов.
    const { system, user } = buildFullReportPrompt({
      companyName: company?.name ?? 'Компания',
      companySite: company?.website ?? undefined,
      niche: reqs.niche,
      goal: company?.goals ?? '',
      factsMarkdown: confirmedPreamble
        ? `${confirmedPreamble}\n\n${serializeContext(context)}`
        : serializeContext(context),
      kbRequirements: reqs.combinedMarkdown,
    })
    const { content: contentMarkdown, modelId } = await callOpenRouter(
      system,
      user,
      FULL_REPORT_MAX_TOKENS,
      AI_CONFIG.strategy.synthesisModel,
    )

    await db
      .update(reportArtifacts)
      .set({ status: 'done', contentMarkdown, updatedAt: new Date() })
      .where(eq(reportArtifacts.id, artifactId))

    return {
      reportArtifactId: artifactId,
      sections: parseSections(contentMarkdown),
      contentMarkdown,
      generatedAt: new Date(),
      modelId,
      contextFactCount: context.totalFactCount,
      mode: 'real',
      status: 'done',
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    await db
      .update(reportArtifacts)
      .set({ status: 'error', contentMarkdown: errMsg, updatedAt: new Date() })
      .where(eq(reportArtifacts.id, artifactId))
    throw error
  }
}
