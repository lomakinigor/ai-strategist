// Email-шаблон письма «Ваш разбор готов».
// HTML + plain-text версии для всех клиентов (Outlook/Gmail/Mail.ru/Яндекс).
// Используется sender'ом (sender.ts) — отправка реальна при подключении Resend,
// сейчас logging stub.

export interface FreeReportReadyInput {
  companyName: string | null
  magicLinkUrl: string
  // tier влияет на формулировки: для free показываем тизер апсейла,
  // для paid — благодарность за оплату.
  tier: 'free' | 'paid' | 'retainer'
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function renderFreeReportReadyEmail(
  input: FreeReportReadyInput,
): RenderedEmail {
  const { companyName, magicLinkUrl, tier } = input
  const company = companyName?.trim() || 'вашей компании'

  const subject =
    tier === 'free'
      ? `Бесплатный разбор для ${company} — готов`
      : `Стратегический отчёт для ${company} — готов`

  const headline =
    tier === 'free'
      ? 'Ваш бесплатный разбор готов'
      : 'Ваш стратегический отчёт готов'

  const intro =
    tier === 'free'
      ? `Карточка позиции для <strong>${escapeHtml(company)}</strong> сформирована: 2 конкурента, 2 слабые точки вашего бизнеса и 1 идея для отстройки.`
      : `Полный стратегический отчёт для <strong>${escapeHtml(company)}</strong> готов: 4–6 конкурентов с разбором по 6 параметрам, все слабые точки с источниками, 3 готовых варианта УТП и план на 30/60/90 дней.`

  const upsell =
    tier === 'free'
      ? `<p style="margin: 24px 0 0; font-size: 14px; color: #525252; line-height: 1.6;">P.S. Хотите полную картину с 4–6 конкурентами и готовым УТП? Ответьте на это письмо или закажите полный отчёт за 9 999 ₽.</p>`
      : ''

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 24px;">
    <p style="font-size: 14px; font-weight: 700; letter-spacing: 0.02em; color: #0a0a0a; margin: 0 0 32px;">
      AI-Стратег
    </p>

    <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; color: #0a0a0a; margin: 0 0 16px;">
      ${escapeHtml(headline)}
    </h1>

    <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 32px;">
      ${intro}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 32px;">
      <tr>
        <td style="background: #1e3a8a; border-radius: 8px;">
          <a href="${magicLinkUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; line-height: 1;">
            Открыть отчёт →
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
      Если кнопка не работает — скопируйте ссылку в браузер:
    </p>
    <p style="font-size: 12px; line-height: 1.5; color: #6b7280; margin: 0; word-break: break-all;">
      ${magicLinkUrl}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

    <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0;">
      Ссылка действует 30 дней. Сам отчёт по адресу выше доступен бессрочно — добавьте в закладки.
    </p>

    ${upsell}

    <p style="font-size: 12px; line-height: 1.5; color: #6b7280; margin: 40px 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      AI-Стратег — стратегический анализ для российских компаний. Это письмо отправлено автоматически после вашего запроса на разборе.
    </p>
  </div>
</body>
</html>`

  const upsellText =
    tier === 'free'
      ? `\n\nP.S. Хотите полную картину с 4–6 конкурентами и готовым УТП? Ответьте на это письмо или закажите полный отчёт за 9 999 ₽.`
      : ''

  const text = `${headline}

${stripHtml(intro)}

Открыть отчёт: ${magicLinkUrl}

Ссылка действует 30 дней. Сам отчёт доступен бессрочно — добавьте в закладки.${upsellText}

—
AI-Стратег. Стратегический анализ для российских компаний.`

  return { subject, html, text }
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
}
