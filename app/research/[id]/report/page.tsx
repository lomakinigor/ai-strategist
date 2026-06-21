// Полный отчёт — рендерит ТОЛЬКО v2 (L2-методология, 9 Частей).
// v1 (decision-driven §0-8) удалён 2026-06-19. Старые report_artifacts с
// contentMarkdown остаются в БД (audit-trail), но не читаются — v2 генерируется
// на лету через /api/full-v2/[jobId] и кешируется в SessionStorage у клиента.

import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getDb } from '@/db'
import { researchJobs, companies } from '@/db/schema'
import { FullV2View } from './FullV2View'

export const maxDuration = 300

export default async function ReportPage({
  params,
}: {
  params: { id: string }
}) {
  const db = getDb()
  const { id: jobId } = params

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

  return (
    <FullV2View
      jobId={jobId}
      companyName={company?.name ?? 'Компания'}
      industry={company?.industry ?? ''}
    />
  )
}
