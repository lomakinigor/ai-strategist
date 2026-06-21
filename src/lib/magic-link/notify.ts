// Уведомление клиента: artifact готов → magic-link на email.
// v1 brief auto-gen удалён 2026-06-19 — теперь brief v2 генерируется
// on-demand при просмотре /free-report, pre-generation не нужна.
//
// Вызывается из app/api/auto-pipeline после создания placeholder артефакта.

import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import { createMagicLink } from './tokens'
import { renderFreeReportReadyEmail } from './email-template'
import { sendEmail } from './sender'

export async function notifyArtifactReady(artifactId: string): Promise<void> {
  try {
    const db = getDb()
    const rows = await db
      .select({
        tier: reportArtifacts.tier,
        companyName: companies.name,
        industry: companies.industry,
        clientEmail: companies.clientEmail,
      })
      .from(reportArtifacts)
      .leftJoin(companies, eq(companies.id, reportArtifacts.companyId))
      .where(eq(reportArtifacts.id, artifactId))
      .limit(1)

    const row = rows[0]
    if (!row) {
      console.warn(`[notify] artifact not found: ${artifactId}`)
      return
    }
    if (!row.clientEmail) {
      console.log(`[notify] no client_email for artifact ${artifactId} — skipping`)
      return
    }

    const link = await createMagicLink({
      email: row.clientEmail,
      artifactId,
    })
    const rendered = renderFreeReportReadyEmail({
      companyName: row.companyName ?? 'Компания',
      magicLinkUrl: link.url,
      tier: row.tier,
    })
    const result = await sendEmail({ to: row.clientEmail, ...rendered })

    if (!result.ok) {
      console.error(`[notify] send failed for ${artifactId}:`, result.error)
    } else {
      console.log(
        `[notify] artifact=${artifactId} tier=${row.tier} provider=${result.provider} email=${row.clientEmail}`,
      )
    }
  } catch (err) {
    // Никогда не пробрасываем — отправка отчёта не должна падать из-за email.
    console.error(`[notify] unexpected error for artifact ${artifactId}:`, err)
  }
}
