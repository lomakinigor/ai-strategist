// POST /api/interactive-v2/[jobId] — синхронно генерирует ИНТЕРАКТИВНЫЙ
// «рабочий отчёт» (дизайн innodor-report.html) — дистилляцию уже готовых
// FullV2 + BriefV2 в ~10 «экранов» для первого прочтения владельцем бизнеса.
//
// Кеш в БД: report_artifacts.interactiveJson (аналог full-v2/brief-v2 — первый
// вызов генерирует, последующие читают из БД без повторного LLM-вызова).
//
// Если FullV2 ещё не сгенерирован (contentJson пуст) — генерируем его здесь же
// (переиспользуем generateFullV2 напрямую, не через HTTP) и заодно сохраняем,
// чтобы не терять эту генерацию для будущих просмотров /report.

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, researchJobs, companies } from '@/db/schema'
import { generateFullV2, type FullV2 } from '@/lib/strategy/full-v2'
import { generateInteractiveV2 } from '@/lib/strategy/interactive-v2'
import type { BriefV2 } from '@/lib/strategy/brief-v2'

export const maxDuration = 300 // Vercel Hobby Fluid Compute
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const db = getDb()

  const artifactRows = await db
    .select({
      id: reportArtifacts.id,
      contentJson: reportArtifacts.contentJson,
      briefJson: reportArtifacts.briefJson,
      interactiveJson: reportArtifacts.interactiveJson,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.researchJobId, jobId))
    .limit(1)

  const artifact = artifactRows[0]

  // Cache-hit: рабочий отчёт уже собран — отдаём из БД без LLM-вызова.
  if (artifact?.interactiveJson) {
    return NextResponse.json({ interactive: artifact.interactiveJson, cached: true })
  }

  try {
    // 1. Нужен FullV2 (+ BriefV2) как источник контента. Если уже закеширован —
    // используем его (не гоняем заново 8 параллельных вызовов full-v2).
    let full: FullV2
    let brief: BriefV2
    if (artifact?.contentJson) {
      full = artifact.contentJson as FullV2
      brief = (artifact.briefJson ?? {}) as BriefV2
    } else {
      const result = await generateFullV2({ artifactIdOrJobId: jobId })
      full = result.parsed
      brief = result.brief
      if (artifact) {
        try {
          await db
            .update(reportArtifacts)
            .set({
              contentJson: result.parsed,
              briefJson: artifact.briefJson ?? result.brief,
              updatedAt: new Date(),
            })
            .where(eq(reportArtifacts.id, artifact.id))
        } catch (saveErr) {
          console.error('[api/interactive-v2] failed to save contentJson:', saveErr)
        }
      }
    }

    // 2. Имя/ниша компании — для тона промпта.
    const jobRows = await db
      .select({ companyId: researchJobs.companyId })
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1)
    let companyName = ''
    let industry = ''
    const companyId = jobRows[0]?.companyId
    if (companyId) {
      const companyRows = await db
        .select({ name: companies.name, industry: companies.industry })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)
      companyName = companyRows[0]?.name ?? ''
      industry = companyRows[0]?.industry ?? ''
    }

    // 3. Дистилляция в InteractiveV2.
    const result = await generateInteractiveV2({
      researchJobId: jobId,
      companyName,
      industry,
      intakeQuote: full.part_0?.intake_quote,
      full,
      brief,
    })

    if (artifact) {
      try {
        await db
          .update(reportArtifacts)
          .set({ interactiveJson: result.parsed, updatedAt: new Date() })
          .where(eq(reportArtifacts.id, artifact.id))
      } catch (saveErr) {
        console.error('[api/interactive-v2] failed to save interactiveJson:', saveErr)
      }
    }

    return NextResponse.json({ interactive: result.parsed, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/interactive-v2] generation failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
