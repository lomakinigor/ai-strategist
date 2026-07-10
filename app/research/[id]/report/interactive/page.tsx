// Интерактивный «рабочий отчёт» — первый экран для paid-клиента после оплаты
// (см. app/api/pipeline-status/[jobId]/route.ts). Paywall-гейт зеркалит
// app/research/[id]/report/page.tsx (FullV2View) — доступ только tier=paid && paid.

import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getDb } from '@/db'
import { researchJobs, companies, reportArtifacts } from '@/db/schema'
import { InteractiveV2View } from './InteractiveV2View'

export const maxDuration = 300

export default async function InteractiveReportPage({
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

  // Тот же paywall, что у FullV2View: только оплаченный paid-job.
  if (job.tier !== 'paid' || !job.paid) {
    const arts = await db
      .select({ id: reportArtifacts.id })
      .from(reportArtifacts)
      .where(eq(reportArtifacts.researchJobId, jobId))
      .limit(1)
    if (arts[0]) {
      redirect(`/free-report/${arts[0].id}`)
    }
    redirect('/')
  }

  const comps = await db
    .select()
    .from(companies)
    .where(eq(companies.id, job.companyId))
    .limit(1)

  const company = comps[0]

  return (
    <InteractiveV2View
      jobId={jobId}
      companyName={company?.name ?? 'Компания'}
      industry={company?.industry ?? ''}
    />
  )
}
