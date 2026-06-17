// POST /api/brief-v2/[artifactId] — НОВЫЙ независимый бриф (тестовая версия).
// Не кешируется в БД (схема не трогается); каждый вызов генерируется заново
// из facts + intake. Для production-флоу всегда работает старый /api/brief.

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
    })
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const artifact = rows[0]
  if (!artifact || !artifact.researchJobId) {
    return NextResponse.json({ error: 'artifact_not_found' }, { status: 404 })
  }

  try {
    const { parsed } = await generateBriefV2({
      researchJobId: artifact.researchJobId,
      companyId: artifact.companyId,
    })
    return NextResponse.json({ brief: parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    console.error('[api/brief-v2] generation failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
