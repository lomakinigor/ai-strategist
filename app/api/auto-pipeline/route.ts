// Auto-pipeline: запускает полный цикл research → создаёт пустой report_artifact
// для jobId. v2 brief и full отчёты генерируются on-demand при просмотре
// (BriefV2View → /api/brief-v2, FullV2View → /api/full-v2), поэтому здесь не
// pre-generation, а только research-этап + создание placeholder артефакта.
//
// Использование: клиент на /research/[jobId] делает один POST на маунте.
// Не нужно ждать ответа на клиенте — параллельно polling /api/pipeline-status
// показывает прогресс и редиректит на отчёт когда готово.
//
// v1 strategy/brief generation удалены 2026-06-19 — больше не вызываем
// generateStrategyDraft / generateBriefReport. Только research + placeholder.

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { researchJobs, reportArtifacts } from '@/db/schema'
import { startResearchJob } from '@/lib/research/orchestrator'
import { notifyArtifactReady } from '@/lib/magic-link/notify'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let jobId: string | undefined
  try {
    const body = (await req.json().catch(() => ({}))) as { jobId?: string }
    jobId = body.jobId?.trim()
  } catch {
    // ignore
  }
  if (!jobId) {
    const url = new URL(req.url)
    jobId = url.searchParams.get('job')?.trim() || undefined
  }
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const db = getDb()

  const [job] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  if (!job) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 })
  }

  // Гейт оплаты для tier=paid: не запускаем pipeline пока админ не подтвердил оплату.
  if (job.tier === 'paid' && !job.paid) {
    return NextResponse.json({ blocked: 'unpaid' }, { status: 200 })
  }

  // ─── Stage 1: Research ─────────────────────────────────────────────────────
  if (job.status === 'pending') {
    console.log(`[auto-pipeline] starting research for job ${jobId}`)
    try {
      await startResearchJob(jobId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[auto-pipeline] research failed for ${jobId}:`, msg)
      return NextResponse.json({ error: 'research_failed', detail: msg }, { status: 500 })
    }
  } else if (job.status === 'running') {
    console.log(`[auto-pipeline] research already running for ${jobId}, skipping`)
    return NextResponse.json({ status: 'research_running', skipped: true })
  } else if (job.status === 'error') {
    return NextResponse.json({ error: 'research_failed_earlier', detail: job.errorMessage }, { status: 500 })
  }

  // К этому моменту research завершён (status='done')
  const [refreshedJob] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)
  if (!refreshedJob || refreshedJob.status !== 'done') {
    return NextResponse.json({ error: 'research_not_done', status: refreshedJob?.status }, { status: 500 })
  }

  // ─── Stage 2: Placeholder artifact ─────────────────────────────────────────
  // v2 brief и full генерируются on-demand при просмотре отчёта (нет
  // pre-generation в pipeline). Создаём пустой artifact со status='done'
  // чтобы /pipeline-status увидел готовность и редиректнул клиента.
  const existingArtifacts = await db
    .select({ id: reportArtifacts.id, status: reportArtifacts.status })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.researchJobId, jobId))
    .limit(1)

  let artifactId: string
  if (existingArtifacts[0]) {
    artifactId = existingArtifacts[0].id
    // Если артефакт почему-то остался в pending/generating — финализируем
    if (existingArtifacts[0].status !== 'done') {
      await db
        .update(reportArtifacts)
        .set({ status: 'done', updatedAt: new Date() })
        .where(eq(reportArtifacts.id, artifactId))
    }
  } else {
    const [created] = await db
      .insert(reportArtifacts)
      .values({
        companyId: refreshedJob.companyId,
        researchJobId: jobId,
        status: 'done',
        tier: refreshedJob.tier,
      })
      .returning({ id: reportArtifacts.id })
    artifactId = created.id
  }

  // Email magic-link клиенту — fire-and-forget, не валит ответ.
  // Если у компании задан clientEmail — шлём ссылку на /free-report или
  // /research/[id]/report в зависимости от tier (логика в email-template).
  void notifyArtifactReady(artifactId)

  console.log(`[auto-pipeline] research done + artifact ready for job ${jobId}`)
  return NextResponse.json({
    status: 'done',
    artifactId,
    tier: refreshedJob.tier,
  })
}
