import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs } from '@/db/schema'
import { buildResearchContext, type ResearchContext } from '@/lib/rag/context'
import { AI_CONFIG } from '@/lib/ai/config'
import {
  buildStrategyUserPrompt,
  buildSectionSystemPrompt,
  buildSectionUserPrompt,
  buildSynthesisUserPrompt,
  STRATEGY_SYSTEM_PROMPT,
  STRATEGY_SYNTHESIS_SYSTEM_PROMPT,
  SECTION_TITLES,
} from './prompts'
import type {
  PartialStrategyContent,
  StrategySection,
  StrategySectionType,
} from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SectionId =
  | 'business'
  | 'market'
  | 'audience'
  | 'channels'
  | 'competitors'
  | 'strategy'

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

const SECTION_IDS: Record<string, SectionId> = {
  'Анализ бизнеса': 'business',
  'Анализ рынка': 'market',
  'Анализ целевой аудитории': 'audience',
  'Анализ каналов': 'channels',
  'Анализ конкурентов': 'competitors',
  'Стратегия и рекомендации': 'strategy',
}

export function parseSections(markdown: string): StrategySectionRendered[] {
  const sections: StrategySectionRendered[] = []
  const parts = markdown.split(/(?=##\s+\d+\.\s+)/)

  for (const part of parts) {
    const headerMatch = part.match(/^##\s+\d+\.\s+(.+?)\n([\s\S]*)$/)
    if (!headerMatch) continue
    const title = headerMatch[1].trim()
    const content = headerMatch[2].trim()
    const id = SECTION_IDS[title]
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

  return `## 1. Анализ бизнеса
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Для генерации реального анализа настройте OPENROUTER_API_KEY.]

${dataNote} В реальном режиме этот раздел содержал бы анализ компании на основе верифицированных фактов с указанием типов утверждений.

## 2. Анализ рынка
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальный анализ рынка требует OPENROUTER_API_KEY.]

В реальном режиме этот раздел содержал бы анализ отраслевых трендов, объёма рынка и динамики с РФ-релевантными данными.

## 3. Анализ целевой аудитории
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальный анализ аудитории требует OPENROUTER_API_KEY.]

В реальном режиме этот раздел содержал бы анализ целевых сегментов, потребностей и поведения аудитории.

## 4. Анализ каналов
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальный анализ каналов требует OPENROUTER_API_KEY.]

В реальном режиме этот раздел содержал бы анализ каналов присутствия (ВКонтакте, Telegram, YouTube и др.) с оценкой активности.

## 5. Стратегия и рекомендации
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальные рекомендации требуют OPENROUTER_API_KEY.]

В реальном режиме этот раздел содержал бы конкретные рекомендации по развитию с уклоном в автоматизацию и AI, с оценкой стоимости в рублях.`
}

// ─── OpenRouter chat call (single LLM round-trip) ────────────────────────────

interface OpenRouterChatResponse {
  choices: Array<{ message: { content: string } }>
}

async function callOpenRouter(
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
): Promise<StrategySection> {
  const title = SECTION_TITLES[sectionType]
  const generatedAt = new Date().toISOString()

  try {
    const systemPrompt = buildSectionSystemPrompt(sectionType)
    const userPrompt = buildSectionUserPrompt(sectionType, context)
    const { content, modelId } = await callOpenRouter(systemPrompt, userPrompt, SECTION_MAX_TOKENS)
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
): Promise<StrategySection[]> {
  return Promise.all(
    STAGE_ONE_SECTION_TYPES.map((type) => generateSectionDraft(type, context)),
  )
}

// ─── Stage 2: synthesis ──────────────────────────────────────────────────────

const SYNTHESIS_MAX_TOKENS = 2500

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

  blocks.push(`## ${ordered.length + 1}. Стратегия и рекомендации\n\n${synthesisBody.trim()}`)

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

  try {
    const userPrompt = buildSynthesisUserPrompt(partial.sections)
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
  const newSection = await generateSectionDraft(sectionType, context)

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
    .select({ companyId: researchJobs.companyId })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  const companyId = jobRows[0]?.companyId
  if (!companyId) {
    throw new Error(`Research job not found: ${jobId}`)
  }

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

    if (twoStage) {
      // Stage 1: 5 parallel section drafts, persist as partial.
      const sections = await generateAllSectionsParallel(context)
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

    // One-shot path (twoStageReview=false): single LLM call returns full markdown.
    // This is the full-strategy synthesis → use the stronger synthesisModel.
    const userPrompt = buildStrategyUserPrompt(context)
    const { content: contentMarkdown, modelId } = await callStrategyLLM(
      STRATEGY_SYSTEM_PROMPT,
      userPrompt,
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
