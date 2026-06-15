// Страница прогресса pipeline после intake submit. На маунте триггерит
// /api/auto-pipeline (fire-and-forget) и поллит /api/pipeline-status каждые 3 сек.
// Когда отчёт готов — автоматически редиректит на /free-report или /brief.
//
// Все ручные кнопки («Запустить исследование», «Подтвердить данные», «Сгенерировать
// краткий») удалены — full autopilot per user requirement.

import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/db'
import { researchJobs, companies, reportArtifacts } from '@/db/schema'
import { ResearchProgress } from './ResearchProgress'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Готовим отчёт — AI-Стратег',
  robots: { index: false, follow: false },
}

export default async function ResearchProgressPage({ params }: { params: { id: string } }) {
  const db = getDb()

  const rows = await db
    .select({
      jobId: researchJobs.id,
      status: researchJobs.status,
      tier: researchJobs.tier,
      paid: researchJobs.paid,
      companyName: companies.name,
      industry: companies.industry,
    })
    .from(researchJobs)
    .leftJoin(companies, eq(companies.id, researchJobs.companyId))
    .where(eq(researchJobs.id, params.id))
    .limit(1)

  const job = rows[0]
  if (!job) notFound()

  // tier=paid но не оплачено → возвращаем на /pay (не показываем progress)
  if (job.tier === 'paid' && !job.paid) {
    redirect(`/pay/${job.jobId}`)
  }

  // Если уже всё готово (юзер обновил страницу/вернулся по URL) — сразу редирект на отчёт.
  // Оба tier'а едут на /free-report (там единая «карточка позиции» в tier-aware виде).
  if (job.status === 'done') {
    const artifactRows = await db
      .select({ id: reportArtifacts.id, status: reportArtifacts.status })
      .from(reportArtifacts)
      .where(eq(reportArtifacts.researchJobId, job.jobId))
      .limit(1)
    const artifact = artifactRows[0]
    if (artifact && artifact.status === 'done') {
      redirect(`/free-report/${artifact.id}`)
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <nav className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
      </nav>

      <ResearchProgress
        jobId={job.jobId}
        companyName={job.companyName ?? 'Компания'}
        industry={job.industry ?? ''}
        initialTier={job.tier === 'paid' ? 'paid' : 'free'}
      />

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-[#6b7280]">
          <p>© {new Date().getFullYear()} AI-Стратег</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#0a0a0a]">
              Политика
            </Link>
            <Link href="/offer" className="hover:text-[#0a0a0a]">
              Оферта
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
