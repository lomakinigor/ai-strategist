// Полный отчёт — рендерит ТОЛЬКО v2 (L2-методология, 9 Частей).
// v1 (decision-driven §0-8) удалён 2026-06-19. Старые report_artifacts с
// contentMarkdown остаются в БД (audit-trail), но не читаются — v2 генерируется
// на лету через /api/full-v2/[jobId] и кешируется в SessionStorage у клиента.

import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getDb } from '@/db'
import { researchJobs, companies, reportArtifacts } from '@/db/schema'
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

  // Paywall: полный отчёт показываем ТОЛЬКО для оплаченных paid-job.
  // Любой другой случай (tier=free или paid+unpaid) — редиректим на /free-report
  // (там есть upgrade-to-paid кнопка). Без этого гейта free-юзер мог открыть
  // полный отчёт по прямой ссылке без оплаты.
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
    <FullV2View
      jobId={jobId}
      companyName={company?.name ?? 'Компания'}
      industry={company?.industry ?? ''}
    />
  )
}
