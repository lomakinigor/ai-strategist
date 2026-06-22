// POST /api/full-v2/[jobId] — синхронно генерирует ПОЛНЫЙ ОТЧЁТ v2
// (L2-методология) на основе research-фактов + утверждённого краткого v2.
// Возвращает JSON FullV2.
//
// Кеш в БД: report_artifacts.contentJson. Первый вызов генерирует ~$0.30-1.50
// в токенах, сохраняет в БД, последующие читают из БД (0₽). Раньше каждый
// просмотр в новом браузере = новая генерация — этим багом пользовались
// архив-просмотры и тратили деньги впустую.

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts } from '@/db/schema'
import { generateFullV2 } from '@/lib/strategy/full-v2'

export const maxDuration = 300 // Vercel Hobby Fluid Compute
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const db = getDb()

  // Ищем artifact по jobId — для cache-проверки и для save после генерации.
  const artifactRows = await db
    .select({
      id: reportArtifacts.id,
      contentJson: reportArtifacts.contentJson,
      briefJson: reportArtifacts.briefJson,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.researchJobId, jobId))
    .limit(1)

  const artifact = artifactRows[0]

  // Cache-hit: полный отчёт уже сгенерирован — отдаём из БД без LLM-вызова.
  // Brief тоже из БД если есть, иначе пустой объект (full самодостаточен).
  if (artifact?.contentJson) {
    return NextResponse.json({
      full: artifact.contentJson,
      brief: artifact.briefJson ?? {},
      cached: true,
    })
  }

  try {
    const result = await generateFullV2({ artifactIdOrJobId: jobId })
    // Сохраняем в БД для будущих запросов. Заодно обновляем briefJson если
    // его ещё не было — generateFullV2 возвращает brief как побочный продукт.
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
        console.error('[api/full-v2] failed to save contentJson:', saveErr)
      }
    }
    return NextResponse.json({ full: result.parsed, brief: result.brief, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/full-v2] generation failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
