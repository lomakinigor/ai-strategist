import { eq, and } from 'drizzle-orm'
import { getDb } from '@/db'
import { facts, sources, researchJobs, intakeSubmissions } from '@/db/schema'
import type { ResearchType, FactType, ConfidenceLevel } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResearchContextBlock {
  researchType: ResearchType
  label: string
  factCount: number
  contextText: string
}

export interface ResearchContext {
  jobId: string
  companyId: string
  blocks: ResearchContextBlock[]
  totalFactCount: number
  builtAt: Date
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const STREAM_LABELS: Record<ResearchType, string> = {
  business: 'Анализ бизнеса',
  market: 'Анализ рынка',
  audience: 'Анализ аудитории',
  channels: 'Анализ каналов',
}

const FACT_TYPE_LABELS: Record<FactType, string> = {
  FACT: 'ФАКТ',
  HYPOTHESIS: 'ГИПОТЕЗА',
  INSUFFICIENT_DATA: 'НЕДОСТАТОЧНО ДАННЫХ',
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
}

const RESEARCH_TYPES: ResearchType[] = ['business', 'market', 'audience', 'channels']

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Builds structured LLM context from active facts for a research job.
 * MVP: SQL-based retrieval grouped by research_type (no pgvector needed at this scale).
 * Interface is ready for pgvector-based semantic retrieval in future iterations.
 */
export async function buildResearchContext(jobId: string): Promise<ResearchContext> {
  const db = getDb()

  // Resolve companyId from job
  const jobRows = await db
    .select({ companyId: researchJobs.companyId })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  const companyId = jobRows[0]?.companyId ?? ''

  // Fetch context notes from intake submission (if client provided extra info)
  const intakeRows = await db
    .select({ inputPayload: intakeSubmissions.inputPayload })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.companyId, companyId))
    .limit(1)

  const intakePayload = intakeRows[0]?.inputPayload as Record<string, unknown> | null
  const contextNotes = typeof intakePayload?.context_notes === 'string' && intakePayload.context_notes
    ? intakePayload.context_notes
    : null
  const competitorsNotes = typeof intakePayload?.competitors === 'string' && intakePayload.competitors
    ? intakePayload.competitors
    : null

  // Fetch all active facts with source info
  const rows = await db
    .select({
      researchType: facts.researchType,
      factType: facts.factType,
      confidence: facts.confidence,
      rs: facts.reliabilityScore,
      content: facts.content,
      sourceUrl: sources.sourceUrl,
      sourceName: sources.sourceName,
    })
    .from(facts)
    .leftJoin(sources, eq(facts.sourceId, sources.id))
    .where(and(eq(facts.researchJobId, jobId), eq(facts.isActive, true)))
    .orderBy(facts.researchType, facts.createdAt)

  // Group by research_type
  const grouped: Record<string, typeof rows> = {}
  for (const row of rows) {
    const key = row.researchType as string
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  }

  const blocks: ResearchContextBlock[] = []

  // Prepend client-provided context and competitors to business block header
  const headerParts: string[] = []
  if (contextNotes) headerParts.push(`=== Дополнительный контекст от клиента ===\n${contextNotes}`)
  if (competitorsNotes) headerParts.push(`=== Конкуренты (указаны клиентом) ===\n${competitorsNotes}`)
  const clientContextHeader = headerParts.length > 0 ? headerParts.join('\n\n') + '\n\n' : ''

  for (const rt of RESEARCH_TYPES) {
    const typeRows = grouped[rt] ?? []
    const label = STREAM_LABELS[rt]

    const lines: string[] = [rt === 'business' && clientContextHeader ? clientContextHeader + `=== ${label} ===` : `=== ${label} ===`]

    for (const row of typeRows) {
      const factLabel = FACT_TYPE_LABELS[row.factType as FactType] ?? row.factType
      const confLabel = CONFIDENCE_LABELS[row.confidence as ConfidenceLevel] ?? row.confidence
      lines.push(`[${factLabel}][${confLabel}][RS:${row.rs}] ${row.content}`)

      const srcLabel = row.sourceName ?? row.sourceUrl
      if (srcLabel) {
        lines.push(`Источник: ${srcLabel}`)
      }
      lines.push('')
    }

    if (typeRows.length === 0) {
      lines.push('Данных нет.')
      lines.push('')
    }

    blocks.push({
      researchType: rt,
      label,
      factCount: typeRows.length,
      contextText: lines.join('\n').trim(),
    })
  }

  return {
    jobId,
    companyId,
    blocks,
    totalFactCount: rows.length,
    builtAt: new Date(),
  }
}

/**
 * Returns context for a single research type stream.
 * Convenience wrapper used by strategy generation per section.
 */
export function getBlockByType(
  context: ResearchContext,
  researchType: ResearchType,
): ResearchContextBlock | undefined {
  return context.blocks.find((b) => b.researchType === researchType)
}

/**
 * Serializes full context into a single prompt-ready string.
 */
export function serializeContext(context: ResearchContext): string {
  return context.blocks.map((b) => b.contextText).join('\n\n')
}
