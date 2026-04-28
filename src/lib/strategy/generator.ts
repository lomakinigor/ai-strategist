import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs } from '@/db/schema'
import { buildResearchContext } from '@/lib/rag/context'
import { buildStrategyUserPrompt, STRATEGY_SYSTEM_PROMPT } from './prompts'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SectionId = 'business' | 'market' | 'audience' | 'channels' | 'strategy'

export interface StrategySection {
  id: SectionId
  title: string
  content: string
}

export interface StrategyDraftResult {
  reportArtifactId: string
  sections: StrategySection[]
  contentMarkdown: string
  generatedAt: Date
  modelId: string
  contextFactCount: number
  mode: 'mock' | 'real'
}

// ─── Section parsing ──────────────────────────────────────────────────────────

const SECTION_IDS: Record<string, SectionId> = {
  'Анализ бизнеса': 'business',
  'Анализ рынка': 'market',
  'Анализ целевой аудитории': 'audience',
  'Анализ каналов': 'channels',
  'Стратегия и рекомендации': 'strategy',
}

export function parseSections(markdown: string): StrategySection[] {
  const sections: StrategySection[] = []
  // Split on "## N. Title" headings
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

// ─── Mock draft ───────────────────────────────────────────────────────────────

function getMockDraft(factCount: number): string {
  const dataNote =
    factCount > 0
      ? `Контекст содержит ${factCount} фактов из research pipeline.`
      : 'Контекст не содержит фактов. Запустите research pipeline перед генерацией стратегии.'

  return `## 1. Анализ бизнеса
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Для генерации реального анализа настройте DEEPSEEK_API_KEY.]

${dataNote} В реальном режиме этот раздел содержал бы анализ компании на основе верифицированных фактов с указанием типов утверждений.

## 2. Анализ рынка
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальный анализ рынка требует DEEPSEEK_API_KEY.]

В реальном режиме этот раздел содержал бы анализ отраслевых трендов, объёма рынка и динамики с РФ-релевантными данными.

## 3. Анализ целевой аудитории
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальный анализ аудитории требует DEEPSEEK_API_KEY.]

В реальном режиме этот раздел содержал бы анализ целевых сегментов, потребностей и поведения аудитории.

## 4. Анализ каналов
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальный анализ каналов требует DEEPSEEK_API_KEY.]

В реальном режиме этот раздел содержал бы анализ каналов присутствия (ВКонтакте, Telegram, YouTube и др.) с оценкой активности.

## 5. Стратегия и рекомендации
[НЕДОСТАТОЧНО ДАННЫХ: Mock-режим активен. Реальные рекомендации требуют DEEPSEEK_API_KEY.]

В реальном режиме этот раздел содержал бы конкретные рекомендации по развитию с уклоном в автоматизацию и AI, с оценкой стоимости в рублях.`
}

// ─── Perplexity API call (strategy generation) ───────────────────────────────

interface PerplexityChatResponse {
  choices: Array<{ message: { content: string } }>
}

export async function callDeepSeekAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      max_tokens: 8000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Perplexity API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as PerplexityChatResponse
  return data.choices[0]?.message?.content ?? ''
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateStrategyDraft(jobId: string): Promise<StrategyDraftResult> {
  const db = getDb()

  // Resolve companyId for artifact FK
  const jobRows = await db
    .select({ companyId: researchJobs.companyId })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  const companyId = jobRows[0]?.companyId
  if (!companyId) {
    throw new Error(`Research job not found: ${jobId}`)
  }

  // Create report_artifact record (status: generating) before any LLM or context work
  const inserted = await db
    .insert(reportArtifacts)
    .values({
      companyId,
      researchJobId: jobId,
      status: 'generating',
    })
    .returning({ id: reportArtifacts.id })

  const artifactId = inserted[0].id

  const hasApiKey = Boolean(process.env.PERPLEXITY_API_KEY)
  let contentMarkdown: string
  let modelId: string
  let mode: 'mock' | 'real'

  try {
    // Build RAG context from active, validated facts (inside try so errors mark artifact as error)
    const context = await buildResearchContext(jobId)

    if (hasApiKey) {
      const userPrompt = buildStrategyUserPrompt(context)
      contentMarkdown = await callDeepSeekAPI(STRATEGY_SYSTEM_PROMPT, userPrompt)
      modelId = 'sonar-pro'
      mode = 'real'
    } else {
      contentMarkdown = getMockDraft(context.totalFactCount)
      modelId = 'mock'
      mode = 'mock'
    }

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
      mode,
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
