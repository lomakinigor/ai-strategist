// POST /api/usage-event — endpoint для фронта чтобы лог одно событие
// использования (brief_viewed / full_viewed / pdf_downloaded) с привязкой
// к research_job или artifact.
//
// Тело: { eventType, researchJobId?, artifactId?, metadata? }
//
// Безопасность для MVP: открытый endpoint без аутентификации (фронт-only).
// Это accept-only логирование — без чтения, риски только в спаме записями.
// Если станет проблемой — добавить rate-limit per IP (Этап 3).

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/db'
import { usageEvents, reportArtifacts } from '@/db/schema'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENT_TYPES = new Set([
  'brief_viewed',
  'full_viewed',
  'interactive_viewed',
  'pdf_downloaded',
])

interface UsageEventBody {
  eventType?: string
  researchJobId?: string | null
  artifactId?: string | null
  metadata?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  let body: UsageEventBody
  try {
    body = (await req.json()) as UsageEventBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const eventType = body.eventType
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'invalid_event_type' }, { status: 400 })
  }

  let researchJobId = body.researchJobId ?? null
  const artifactId = body.artifactId ?? null

  if (!researchJobId && !artifactId) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  try {
    const db = getDb()

    // Если есть artifactId но нет researchJobId — резолвим через JOIN
    // (так у дашборда всегда есть связь с research_job для группировки).
    if (artifactId && !researchJobId) {
      const [row] = await db
        .select({ researchJobId: reportArtifacts.researchJobId })
        .from(reportArtifacts)
        .where(eq(reportArtifacts.id, artifactId))
        .limit(1)
      researchJobId = row?.researchJobId ?? null
    }

    await db.insert(usageEvents).values({
      researchJobId,
      artifactId,
      eventType,
      metadata: body.metadata ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[usage-event] insert failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
