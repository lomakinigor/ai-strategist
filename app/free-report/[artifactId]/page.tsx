// Free-tier «карточка позиции» — рендерит ТОЛЬКО v2 (L2-методология).
// v1 (старый neon-дашборд + paywall-карточка) удалён 2026-06-19.
// briefJson в БД может оставаться от исторических записей — больше не читается.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import FreeReportGoal from './FreeReportGoal'
import { BriefV2View } from './BriefV2View'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Карточка позиции — бесплатный пробник',
  robots: { index: false, follow: false },
}

export default async function FreeReportPage({
  params,
}: {
  params: { artifactId: string }
}) {
  const db = getDb()
  const rows = await db
    .select({
      researchJobId: reportArtifacts.researchJobId,
      companyName: companies.name,
      industry: companies.industry,
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(eq(reportArtifacts.id, params.artifactId))
    .limit(1)

  const row = rows[0]
  if (!row) notFound()

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <FreeReportGoal />
      <nav className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between gap-3 flex-wrap no-print">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        {row.researchJobId && (
          <Link
            href={`/research/${row.researchJobId}/report`}
            className="lp-btn-primary text-xs"
          >
            Полный отчёт →
          </Link>
        )}
      </nav>
      <BriefV2View
        artifactId={params.artifactId}
        companyName={row.companyName ?? 'ваша компания'}
        industry={row.industry ?? ''}
      />
    </main>
  )
}
