// POST /api/brief-v2/[artifactId] — бриф (L2-методология).
// Кеш в БД: report_artifacts.briefJson. Первый вызов генерирует и сохраняет,
// последующие читают из БД (~0₽). Без этого: каждый просмотр в новом браузере
// = новая генерация = списание токенов.

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts } from '@/db/schema'
import { generateBriefV2 } from '@/lib/strategy/brief-v2'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { artifactId: string } }) {
  const { artifactId } = params
  const db = getDb()

  const rows = await db
    .select({
      id: reportArtifacts.id,
      companyId: reportArtifacts.companyId,
      researchJobId: reportArtifacts.researchJobId,
      status: reportArtifacts.status,
      briefJson: reportArtifacts.briefJson,
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact || !artifact.researchJobId) {
    return NextResponse.json({ error: 'artifact_not_found' }, { status: 404 })
  }

  // Cache-hit: бриф уже был сгенерирован для этого artifact — отдаём из БД
  // без LLM-вызова. Если структура BriefV2 поменялась (новая итерация v4) —
  // нужно либо инкрементить версию ключа в БД, либо чистить briefJson вручную.
  if (artifact.briefJson) {
    return NextResponse.json({ brief: artifact.briefJson, cached: true })
  }

  try {
    const { parsed } = await generateBriefV2({
      researchJobId: artifact.researchJobId,
      companyId: artifact.companyId,
    })
    // Сохраняем в БД для будущих запросов от других браузеров / админов.
    // Не валим ответ если save упал — клиент получит свой brief, кеш в
    // следующий раз заполнится сам.
    try {
      await db
        .update(reportArtifacts)
        .set({ briefJson: parsed, updatedAt: new Date() })
        .where(eq(reportArtifacts.id, artifactId))
    } catch (saveErr) {
      console.error('[api/brief-v2] failed to save briefJson:', saveErr)
    }
    return NextResponse.json({ brief: parsed, cached: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    console.error('[api/brief-v2] generation failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
