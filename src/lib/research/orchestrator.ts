import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { researchJobs, companies, facts } from '@/db/schema'
import type { ResearchQuery } from '@/lib/types'
import { classify } from '@/lib/reliability/classify'
import { businessAdapterMock } from './business-adapter.mock'
import { marketAdapterMock } from './market-adapter.mock'
import { audienceAdapterMock } from './audience-adapter.mock'
import { channelsAdapterMock } from './channels-adapter.mock'

const ADAPTERS = [
  businessAdapterMock,
  marketAdapterMock,
  audienceAdapterMock,
  channelsAdapterMock,
]

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
  }

  // Mark job and all streams as running
  await db
    .update(researchJobs)
    .set({
      status: 'running',
      businessStatus: 'running',
      marketStatus: 'running',
      audienceStatus: 'running',
      channelsStatus: 'running',
      startedAt: new Date(),
    })
    .where(eq(researchJobs.id, jobId))

  // Run all 4 adapters in parallel
  const [businessPoints, marketPoints, audiencePoints, channelsPoints] = await Promise.all(
    ADAPTERS.map((adapter) => adapter.collect(query)),
  )

  // Classify and insert facts for each stream
  const allPoints = [...businessPoints, ...marketPoints, ...audiencePoints, ...channelsPoints]

  for (const raw of allPoints) {
    const verified = classify(raw)
    await db.insert(facts).values({
      companyId: company.id,
      researchJobId: jobId,
      content: verified.content,
      factType: verified.type,
      confidence: verified.confidence,
      reliabilityScore: verified.rs,
      researchType: verified.researchType,
      isActive: true,
      language: 'ru',
    })
  }

  // Mark all streams and job as done
  await db
    .update(researchJobs)
    .set({
      status: 'done',
      businessStatus: 'done',
      marketStatus: 'done',
      audienceStatus: 'done',
      channelsStatus: 'done',
      completedAt: new Date(),
    })
    .where(eq(researchJobs.id, jobId))
}
