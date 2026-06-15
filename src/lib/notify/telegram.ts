// Telegram-нотификатор для админ-уведомлений.
// Использует Bot API напрямую через fetch — без зависимостей.
//
// Требуемые env-переменные:
//   TELEGRAM_BOT_TOKEN — токен от @BotFather (например, "8123456789:AAH...")
//   TELEGRAM_ADMIN_CHAT_ID — id группового чата, куда писать (число с минусом для групп)
//
// Если переменные не заданы — функция логирует warn и возвращает false (не падает).
// Это позволяет приложению работать в dev/preview без реальной отправки в TG.

interface SendOptions {
  text: string
  parseMode?: 'Markdown' | 'HTML'
  replyMarkup?: {
    inline_keyboard: Array<Array<{ text: string; url: string }>>
  }
}

export async function sendTelegramMessage(opts: SendOptions): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token || !chatId) {
    console.warn(
      '[telegram] TELEGRAM_BOT_TOKEN или TELEGRAM_ADMIN_CHAT_ID не заданы — нотификация пропущена.',
    )
    console.warn('[telegram] preview text:', opts.text)
    return false
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: opts.text,
      parse_mode: opts.parseMode ?? 'HTML',
      disable_web_page_preview: true,
    }
    if (opts.replyMarkup) {
      body.reply_markup = opts.replyMarkup
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>')
      console.error('[telegram] sendMessage failed', res.status, errText)
      return false
    }
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[telegram] sendMessage exception:', message)
    return false
  }
}

// Удобный шорткат: уведомить о запросе QR-оплаты.
// Шлёт в группу: данные компании из intake + кнопка «Подтвердить оплату» (approve-ссылка с secret).
export async function notifyPaymentRequest(args: {
  jobId: string
  companyName: string
  industry: string
  website: string | null
  description: string | null
  competitors: string | null
  goals: string | null
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-strategist-bice.vercel.app'
  const approveSecret = process.env.ADMIN_APPROVE_SECRET ?? 'MISSING_SECRET'
  const approveUrl = `${siteUrl}/api/admin/approve-payment?job=${args.jobId}&secret=${approveSecret}`

  const lines: string[] = [
    '<b>💰 Запрошен QR на оплату — 9 999 ₽</b>',
    '',
    `<b>Компания:</b> ${escapeHtml(args.companyName)}`,
    `<b>Отрасль:</b> ${escapeHtml(args.industry)}`,
  ]
  if (args.website) lines.push(`<b>Сайт:</b> ${escapeHtml(args.website)}`)
  if (args.description) lines.push(`<b>Описание:</b> ${escapeHtml(truncate(args.description, 200))}`)
  if (args.competitors) lines.push(`<b>Конкуренты:</b> ${escapeHtml(truncate(args.competitors, 200))}`)
  if (args.goals) lines.push(`<b>Цель:</b> ${escapeHtml(truncate(args.goals, 200))}`)
  lines.push('')
  lines.push(`<b>jobId:</b> <code>${args.jobId}</code>`)
  lines.push('')
  lines.push(
    '⏳ Клиент ждёт оплаты на странице <code>/pay/' + args.jobId + '</code>. Проверь СБП и нажми кнопку ниже после поступления денег.',
  )

  return sendTelegramMessage({
    text: lines.join('\n'),
    parseMode: 'HTML',
    replyMarkup: {
      inline_keyboard: [
        [{ text: '✅ Подтвердить оплату', url: approveUrl }],
      ],
    },
  })
}

// Уведомление о новой заявке с лендинга (тариф «9 999 ₽» или «Сопровождение»).
// Шлёт в ту же группу что и оплаты — оператор/админ видит все лиды в одном месте.
export async function notifyLead(args: {
  leadId: string
  type: 'paid' | 'retainer'
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string | null
}): Promise<boolean> {
  const tariffLabel = args.type === 'paid'
    ? '🟦 Разовый отчёт 9 999 ₽'
    : '🟨 Сопровождение от 100 000 ₽/мес'

  const lines: string[] = [
    `<b>📩 Новая заявка</b>`,
    `<b>${tariffLabel}</b>`,
    '',
    `<b>Имя:</b> ${escapeHtml(args.name)}`,
    `<b>Email:</b> ${escapeHtml(args.email)}`,
  ]
  if (args.phone) lines.push(`<b>Телефон:</b> ${escapeHtml(args.phone)}`)
  if (args.company) lines.push(`<b>Компания:</b> ${escapeHtml(args.company)}`)
  if (args.message) lines.push(`<b>Сообщение:</b> ${escapeHtml(truncate(args.message, 500))}`)
  lines.push('')
  lines.push(`<b>leadId:</b> <code>${args.leadId}</code>`)

  return sendTelegramMessage({
    text: lines.join('\n'),
    parseMode: 'HTML',
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}
