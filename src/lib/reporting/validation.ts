import { eq, and, inArray, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { facts, sources } from '@/db/schema'
import type { ResearchType, FactType, ConfidenceLevel, SourceType } from '@/lib/types'

export interface FactForValidation {
  id: string
  researchType: ResearchType
  factType: FactType
  confidence: ConfidenceLevel
  rs: number
  content: string
  isActive: boolean
  source: {
    id: string
    url: string | null
    label: string
    type: SourceType
  } | null
}

export interface FactFilters {
  streams?: ResearchType[]
  factTypes?: FactType[]
  confidences?: ConfidenceLevel[]
  onlyActive?: boolean
}

export async function getFactsForJob(jobId: string, filters?: FactFilters): Promise<FactForValidation[]> {
  const db = getDb()

  const conditions: SQL[] = [eq(facts.researchJobId, jobId)]

  if (filters?.streams && filters.streams.length > 0) {
    conditions.push(inArray(facts.researchType, filters.streams))
  }
  if (filters?.factTypes && filters.factTypes.length > 0) {
    conditions.push(inArray(facts.factType, filters.factTypes))
  }
  if (filters?.confidences && filters.confidences.length > 0) {
    conditions.push(inArray(facts.confidence, filters.confidences))
  }
  if (filters?.onlyActive) {
    conditions.push(eq(facts.isActive, true))
  }

  const rows = await db
    .select({
      id: facts.id,
      researchType: facts.researchType,
      factType: facts.factType,
      confidence: facts.confidence,
      rs: facts.reliabilityScore,
      content: facts.content,
      isActive: facts.isActive,
      sourceId: facts.sourceId,
      sourceUrl: sources.sourceUrl,
      sourceName: sources.sourceName,
      sourceType: sources.sourceType,
    })
    .from(facts)
    .leftJoin(sources, eq(facts.sourceId, sources.id))
    .where(and(...conditions))
    .orderBy(facts.researchType, facts.createdAt)

  return rows.map((row) => ({
    id: row.id,
    researchType: row.researchType as ResearchType,
    factType: row.factType as FactType,
    confidence: row.confidence as ConfidenceLevel,
    rs: row.rs,
    content: row.content,
    isActive: row.isActive,
    source:
      row.sourceId && row.sourceType
        ? {
            id: row.sourceId,
            url: row.sourceUrl ?? null,
            label: row.sourceName ?? '',
            type: row.sourceType as SourceType,
          }
        : null,
  }))
}

export async function setFactActive(factId: string, isActive: boolean): Promise<void> {
  const db = getDb()
  await db
    .update(facts)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(facts.id, factId))
}
