// Auto-pipeline: запускает полный цикл research → strategy → brief для jobId.
// Идемпотентный: повторный POST пропускает уже выполненные этапы.
//
// Использование: клиент на /research/[jobId] делает один POST на маунте.
// Не нужно ждать ответа на клиенте — параллельно polling /api/pipeline-status
// показывает прогресс и редиректит на отчёт когда готово.
//
// Vercel Fluid Compute maxDuration=300 покрывает: research (30–60с) + strategy
// (60–90с) + brief (20–30с) ≈ 2–3 минуты в худшем случае на real-режиме.

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { researchJobs, reportArtifacts } from '@/db/schema'
import { startResearchJob } from '@/lib/research/orchestrator'
import { generateStrategyDraft } from '@/lib/strategy/generator'
import { generateBriefReport } from '@/lib/strategy/brief'
import { companies } from '@/db/schema'

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
  // Also support ?job=X in URL for ergonomics
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
  // Идемпотентность: startResearchJob сам пропускает уже running/done jobs.
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
    // Уже запущено другим вызовом — выходим с 200, polling подхватит прогресс
    console.log(`[auto-pipeline] research already running for ${jobId}, skipping`)
    return NextResponse.json({ status: 'research_running', skipped: true })
  } else if (job.status === 'error') {
    return NextResponse.json({ error: 'research_failed_earlier', detail: job.errorMessage }, { status: 500 })
  }

  // К этому моменту research завершён (status='done') — research_job снимок дальше
  const [refreshedJob] = await db
    .select()
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)
  if (!refreshedJob || refreshedJob.status !== 'done') {
    return NextResponse.json({ error: 'research_not_done', status: refreshedJob?.status }, { status: 500 })
  }

  // ─── Stage 2: Strategy generation ──────────────────────────────────────────
  // Идемпотентность: если артефакт уже сгенерирован — пропускаем.
  const existingArtifacts = await db
    .select({
      id: reportArtifacts.id,
      status: reportArtifacts.status,
      contentMarkdown: reportArtifacts.contentMarkdown,
      briefJson: reportArtifacts.briefJson,
      tier: reportArtifacts.tier,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.researchJobId, jobId))
    .limit(1)

  let artifact = existingArtifacts[0]

  if (!artifact) {
    console.log(`[auto-pipeline] generating strategy for job ${jobId}`)
    try {
      const result = await generateStrategyDraft(jobId)
      // Прокинем tier с research_job на report_artifact
      await db
        .update(reportArtifacts)
        .set({ tier: refreshedJob.tier })
        .where(eq(reportArtifacts.id, result.reportArtifactId))

      const [refreshed] = await db
        .select({
          id: reportArtifacts.id,
          status: reportArtifacts.status,
          contentMarkdown: reportArtifacts.contentMarkdown,
          briefJson: reportArtifacts.briefJson,
          tier: reportArtifacts.tier,
        })
        .from(reportArtifacts)
        .where(eq(reportArtifacts.id, result.reportArtifactId))
        .limit(1)
      artifact = refreshed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[auto-pipeline] strategy gen failed for ${jobId}:`, msg)
      return NextResponse.json({ error: 'strategy_failed', detail: msg }, { status: 500 })
    }
  }

  if (!artifact || artifact.status !== 'done') {
    return NextResponse.json({ error: 'strategy_not_done', status: artifact?.status }, { status: 500 })
  }

  // ─── Stage 3: Brief generation (для обоих tier, но критично для free) ─────
  // notifyArtifactReady уже автогенерирует brief в generator.ts (вызов в конце
  // generateStrategyDraft), но только при наличии clientEmail. У нас email
  // больше не собирается, поэтому генерируем явно тут — для всех артефактов.
  if (!artifact.briefJson && artifact.contentMarkdown) {
    console.log(`[auto-pipeline] generating brief for artifact ${artifact.id}`)
    try {
      const [companyRow] = await db
        .select({ name: companies.name, industry: companies.industry })
        .from(companies)
        .leftJoin(researchJobs, eq(researchJobs.companyId, companies.id))
        .where(eq(researchJobs.id, jobId))
        .limit(1)
      const { parsed } = await generateBriefReport(
        companyRow?.name ?? 'Компания',
        companyRow?.industry ?? '',
        artifact.contentMarkdown,
      )
      await db
        .update(reportArtifacts)
        .set({ briefJson: parsed, updatedAt: new Date() })
        .where(eq(reportArtifacts.id, artifact.id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Brief не валит pipeline — на /brief есть fallback-кнопка генерации
      console.error(`[auto-pipeline] brief gen failed for ${artifact.id}:`, msg)
    }
  }

  console.log(`[auto-pipeline] all stages done for job ${jobId}`)
  return NextResponse.json({
    status: 'done',
    artifactId: artifact.id,
    tier: artifact.tier,
  })
}
