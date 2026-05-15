import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { researchJobs, companies, sources, facts } from '@/db/schema'
import type { ResearchQuery, ResearchType } from '@/lib/types'
import { classify } from '@/lib/reliability/classify'
import { AI_CONFIG } from '@/lib/ai/config'
import { PerplexityResearchProvider } from '@/lib/ai/providers/perplexity-research-provider'
import { inferSourceType } from '@/lib/ai/providers/perplexity-research-provider'
import { businessAdapterMock } from './business-adapter.mock'
import { marketAdapterMock } from './market-adapter.mock'
import { audienceAdapterMock } from './audience-adapter.mock'
import { channelsAdapterMock } from './channels-adapter.mock'
import { competitorsAdapterMock } from './competitors-adapter.mock'
import { collectExternalMetrics } from './external-metrics'
import type { RawDataPoint } from '@/lib/types'

const MOCK_ADAPTERS = [
  businessAdapterMock,
  marketAdapterMock,
  audienceAdapterMock,
  channelsAdapterMock,
  competitorsAdapterMock,
]

const STREAM_TYPES: ResearchType[] = ['business', 'market', 'audience', 'channels', 'competitors']

// Insert classified facts, optionally creating source records for real-mode citations
async function insertFacts(
  companyId: string,
  jobId: string,
  allPoints: RawDataPoint[],
  createSources: boolean,
): Promise<void> {
  const db = getDb()

  for (const raw of allPoints) {
    const verified = classify(raw)
    let sourceId: string | null = null

    if (createSources && raw.source.startsWith('http')) {
      const sourceType = inferSourceType(raw.source)
      const [sourceRecord] = await db
        .insert(sources)
        .values({
          companyId,
          sourceType,
          sourceName: new URL(raw.source).hostname,
          sourceUrl: raw.source,
          sourceRegion: 'RU',
          reliabilityScore: raw.rs,
        })
        .returning({ id: sources.id })
      sourceId = sourceRecord.id
    }

    await db.insert(facts).values({
      companyId,
      researchJobId: jobId,
      sourceId,
      content: verified.content,
      factType: verified.type,
      confidence: verified.confidence,
      reliabilityScore: verified.rs,
      researchType: verified.researchType,
      isActive: verified.isActive,
      language: 'ru',
    })
  }
}

async function runMockResearch(companyId: string, jobId: string, query: ResearchQuery): Promise<void> {
  const allPoints = (await Promise.all(MOCK_ADAPTERS.map((a) => a.collect(query)))).flat()
  await insertFacts(companyId, jobId, allPoints, false)
}

async function runRealResearch(companyId: string, jobId: string, query: ResearchQuery): Promise<void> {
  const provider = new PerplexityResearchProvider()
  const modelId = AI_CONFIG.research.defaultModel

  // Phase 1: Perplexity по 5 streams + PageSpeed для сайта клиента — параллельно.
  // VK и Telegram исключены из пайплайна — данные не давали достоверных метрик.
  // PageSpeed запускается только для сайта (query.website).
  const siteUrls = [query.website].filter(Boolean) as string[]

  const siteMarketingStream = query.website
    ? provider.research({ query, researchType: 'site_marketing', modelId }).then((r) => r.points)
    : Promise.resolve([] as RawDataPoint[])

  const [streamResults, external, siteMarketingPoints] = await Promise.all([
    Promise.all(
      STREAM_TYPES.map((type) => provider.research({ query, researchType: type, modelId })),
    ),
    collectExternalMetrics(siteUrls),
    siteMarketingStream,
  ])

  const perplexityPoints = streamResults.flatMap((r) => r.points)

  const allPoints = [...perplexityPoints, ...external.points, ...siteMarketingPoints]

  console.log(
    `[orchestrator] external-metrics: requested=${external.stats.requested} succeeded=${external.stats.succeeded} skipped=${external.stats.skipped} failed=${external.stats.failed}`,
  )

  await insertFacts(companyId, jobId, allPoints, true)
}

export async function startResearchJob(jobId: string): Promise<void> {
  const db = getDb()

  const [job] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  if (!job || job.status === 'running' || job.status === 'done') return

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, job.companyId))
    .limit(1)

  if (!company) return

  const query: ResearchQuery = {
    companyName: company.name,
    industry: company.industry,
    description: company.description ?? undefined,
    website: company.website ?? undefined,
    channels: company.channels ?? undefined,
    competitors: company.competitors ?? undefined,
  }

  await db
    .update(researchJobs)
    .set({
      status: 'running',
      businessStatus: 'running',
      marketStatus: 'running',
      audienceStatus: 'running',
      channelsStatus: 'running',
      competitorsStatus: 'running',
      startedAt: new Date(),
    })
    .where(eq(researchJobs.id, jobId))

  try {
    const mode = AI_CONFIG.research.mode
    if (mode === 'real') {
      await runRealResearch(company.id, jobId, query)
    } else {
      await runMockResearch(company.id, jobId, query)
    }

    await db
      .update(researchJobs)
      .set({
        status: 'done',
        businessStatus: 'done',
        marketStatus: 'done',
        audienceStatus: 'done',
        channelsStatus: 'done',
        competitorsStatus: 'done',
        completedAt: new Date(),
      })
      .where(eq(researchJobs.id, jobId))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    await db
      .update(researchJobs)
      .set({ status: 'error', errorMessage: message })
      .where(eq(researchJobs.id, jobId))
    throw err
  }
}
