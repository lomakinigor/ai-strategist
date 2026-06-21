// Endpoint для глобальной кнопки «Написать админу».
// Принимает { contact?, message } → пушит в ту же TG-группу, что и
// notifyPaymentRequest/notifyLead. Контакт опционален, сообщение — обязательно.
//
// Если TG-env vars не выставлены — sendTelegramMessage логирует warn и возвращает
// false; мы всё равно отвечаем клиенту 200 чтобы UX не ломался (видеть в логах).

import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/notify/telegram'

export const dynamic = 'force-dynamic'

interface Body {
  contact?: string
  message?: string
  pageUrl?: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const message = (body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'message_required' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'message_too_long' }, { status: 400 })
  }

  const contact = (body.contact ?? '').trim()
  const pageUrl = (body.pageUrl ?? '').trim()

  const lines: string[] = [
    '<b>📨 Сообщение от клиента (кнопка «Написать админу»)</b>',
    '',
    `<b>Сообщение:</b>`,
    escapeHtml(truncate(message, 2000)),
  ]
  if (contact) {
    lines.push('')
    lines.push(`<b>Контакт:</b> ${escapeHtml(truncate(contact, 200))}`)
  } else {
    lines.push('')
    lines.push('<i>⚠ Клиент не оставил контакт — связаться нельзя.</i>')
  }
  if (pageUrl) {
    lines.push('')
    lines.push(`<b>Откуда:</b> ${escapeHtml(truncate(pageUrl, 300))}`)
  }

  await sendTelegramMessage({
    text: lines.join('\n'),
    parseMode: 'HTML',
  })

  return NextResponse.json({ ok: true })
}
