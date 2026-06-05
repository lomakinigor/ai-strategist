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
import { generateBriefReport } from '@/lib/strategy/brief'

export async function notifyArtifactReady(artifactId: string): Promise<void> {
  try {
    const db = getDb()
    const rows = await db
      .select({
        tier: reportArtifacts.tier,
        briefJson: reportArtifacts.briefJson,
        contentMarkdown: reportArtifacts.contentMarkdown,
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
      console.log(`[notify] no client_email for artifact ${artifactId} — skipping (legacy intake without email)`)
      return
    }

    // ── Free-tier: автоматически генерируем brief ДО отправки письма ────────
    // Чтобы пользователь открыл magic-link → /free-report сразу увидел готовую
    // карточку, а не «пробник в обработке, нажмите сгенерировать». UX-аудит
    // топ-2: устранение dead-end в free-flow. Стоимость: ~$0.02 на free-юзера
    // (Sonnet 4.6 дистилляция). Ошибки логируем — не валим отправку письма.
    if (
      row.tier === 'free' &&
      !row.briefJson &&
      row.contentMarkdown &&
      row.companyName
    ) {
      try {
        const { parsed } = await generateBriefReport(
          row.companyName,
          row.industry ?? '',
          row.contentMarkdown,
        )
        await db
          .update(reportArtifacts)
          .set({ briefJson: parsed, updatedAt: new Date() })
          .where(eq(reportArtifacts.id, artifactId))
        console.log(`[notify] auto-generated brief for free artifact ${artifactId}`)
      } catch (err) {
        console.error(`[notify] free brief auto-gen failed for ${artifactId}:`, err)
        // Продолжаем — отправим письмо, юзер увидит «пробник в обработке»
        // и сможет сгенерировать вручную как раньше.
      }
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
