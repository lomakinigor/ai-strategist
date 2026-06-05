// POST /api/magic-link/send
// Body: { email: string, artifactId: string }
// Создаёт magic-link, генерит письмо «отчёт готов», отправляет (или
// логирует на stub-провайдере). Возвращает { ok: true } без раскрытия
// токена — клиенту достаточно знать «письмо ушло».
//
// Используется:
// - Из intake-обработчика после генерации артефакта (Коммит 7).
// - Из админ-вью повторно отправить ссылку клиенту.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import { createMagicLink } from '@/lib/magic-link/tokens'
import { renderFreeReportReadyEmail } from '@/lib/magic-link/email-template'
import { sendEmail } from '@/lib/magic-link/sender'

interface SendBody {
  email?: string
  artifactId?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: SendBody
  try {
    body = (await req.json()) as SendBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const artifactId = body.artifactId?.trim() ?? ''

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (!artifactId) {
    return NextResponse.json({ error: 'artifact_id_required' }, { status: 400 })
  }

  // Проверяем, что артефакт существует и берём связку с companies для шаблона.
  const db = getDb()
  const rows = await db
    .select({
      tier: reportArtifacts.tier,
      companyName: companies.name,
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(eq(reportArtifacts.id, artifactId))
    .limit(1)

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: 'artifact_not_found' }, { status: 404 })
  }

  try {
    const link = await createMagicLink({ email, artifactId })
    const rendered = renderFreeReportReadyEmail({
      companyName: row.companyName,
      magicLinkUrl: link.url,
      tier: row.tier,
    })
    const sendResult = await sendEmail({ to: email, ...rendered })

    if (!sendResult.ok) {
      console.error('[magic-link/send] send failed:', sendResult.error)
      return NextResponse.json({ error: 'send_failed' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      provider: sendResult.provider,
      expiresAt: link.expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('[magic-link/send] unexpected error:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
