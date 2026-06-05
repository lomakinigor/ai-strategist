// Вызывается из generator.ts когда артефакт переходит в status='done'.
// Лукапит email клиента из companies, создаёт magic-link, отправляет письмо.
// Любые ошибки логируются, но НЕ пробрасываются — невозможность отправить
// письмо не должна валить генерацию отчёта (у клиента всегда есть прямой
// доступ через /research/[jobId] → /brief/[artifactId]).

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
      console.log(`[notify] no client_email for artifact ${artifactId} — skipping (legacy intake without email)`)
      return
    }

    const link = await createMagicLink({
      email: row.clientEmail,
      artifactId,
    })
    const rendered = renderFreeReportReadyEmail({
      companyName: row.companyName,
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
    // Никогда не пробрасываем — генерация отчёта не должна падать из-за email.
    console.error(`[notify] unexpected error for artifact ${artifactId}:`, err)
  }
}
