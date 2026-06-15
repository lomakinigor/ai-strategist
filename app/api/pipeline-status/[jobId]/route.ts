// Polling-endpoint для страницы /research/[jobId]. Возвращает текущий статус
// pipeline по 6 «этапам» и redirectTo URL когда всё готово.
//
// Этапы:
//   1. unpaid          — tier=paid и оплата не подтверждена (юзер должен быть на /pay)
//   2. research_pending — research ещё не запущен (auto-pipeline сейчас стартует)
//   3. research_running — research идёт, видны стримы business/market/audience/competitors
//   4. strategy_generating — research done, идёт synthesis в FULL_REPORT
//   5. brief_generating — strategy done, для free идёт дистилляция в краткий
//   6. done             — отчёт готов, redirectTo = /free-report/[id] или /brief/[id]
//   7. error            — где-то упало, errorMessage заполнен

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { researchJobs, reportArtifacts } from '@/db/schema'

export const dynamic = 'force-dynamic'

type Stage =
  | 'unpaid'
  | 'research_pending'
  | 'research_running'
  | 'strategy_generating'
  | 'brief_generating'
  | 'done'
  | 'error'

interface StatusResponse {
  stage: Stage
  jobStatus: string | null
  streams: {
    business: string | null
    market: string | null
    audience: string | null
    competitors: string | null
  }
  redirectTo: string | null
  errorMessage: string | null
}

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const db = getDb()

  const rows = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, params.jobId))
    .limit(1)
  const job = rows[0]

  if (!job) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 })
  }

  const streams = {
    business: job.businessStatus,
    market: job.marketStatus,
    audience: job.audienceStatus,
    competitors: job.competitorsStatus,
  }

  // tier=paid + ещё не оплачено → unpaid
  if (job.tier === 'paid' && !job.paid) {
    const body: StatusResponse = {
      stage: 'unpaid',
      jobStatus: job.status,
      streams,
      redirectTo: `/pay/${job.id}`,
      errorMessage: null,
    }
    return NextResponse.json(body)
  }

  if (job.status === 'error') {
    const body: StatusResponse = {
      stage: 'error',
      jobStatus: job.status,
      streams,
      redirectTo: null,
      errorMessage: job.errorMessage,
    }
    return NextResponse.json(body)
  }

  if (job.status === 'pending') {
    const body: StatusResponse = {
      stage: 'research_pending',
      jobStatus: job.status,
      streams,
      redirectTo: null,
      errorMessage: null,
    }
    return NextResponse.json(body)
  }

  if (job.status === 'running') {
    const body: StatusResponse = {
      stage: 'research_running',
      jobStatus: job.status,
      streams,
      redirectTo: null,
      errorMessage: null,
    }
    return NextResponse.json(body)
  }

  // research done → проверяем артефакт
  const artifactRows = await db
    .select({
      id: reportArtifacts.id,
      status: reportArtifacts.status,
      tier: reportArtifacts.tier,
      briefJson: reportArtifacts.briefJson,
      contentMarkdown: reportArtifacts.contentMarkdown,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.researchJobId, job.id))
    .limit(1)
  const artifact = artifactRows[0]

  if (!artifact) {
    // Артефакт ещё не создан — auto-pipeline сейчас на этапе перехода
    const body: StatusResponse = {
      stage: 'strategy_generating',
      jobStatus: job.status,
      streams,
      redirectTo: null,
      errorMessage: null,
    }
    return NextResponse.json(body)
  }

  if (artifact.status === 'error') {
    const body: StatusResponse = {
      stage: 'error',
      jobStatus: job.status,
      streams,
      redirectTo: null,
      errorMessage: artifact.contentMarkdown || 'Не удалось сгенерировать отчёт',
    }
    return NextResponse.json(body)
  }

  if (artifact.status !== 'done') {
    // generating / partial
    const body: StatusResponse = {
      stage: 'strategy_generating',
      jobStatus: job.status,
      streams,
      redirectTo: null,
      errorMessage: null,
    }
    return NextResponse.json(body)
  }

  // Артефакт done. Оба tier'а теперь идут на /free-report — там единая «Карточка
  // позиции» в белом дизайне, tier-aware: free показывает Cliffhanger + Paywall,
  // paid показывает CTA «Открыть полный отчёт» на /research/[id]/report.
  const body: StatusResponse = {
    stage: 'done',
    jobStatus: job.status,
    streams,
    redirectTo: `/free-report/${artifact.id}`,
    errorMessage: null,
  }
  return NextResponse.json(body)
}
