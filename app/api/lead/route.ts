// POST /api/lead — приём заявок с тарифов «9 999 ₽» и «Сопровождение».
// Сохраняет в leads, отправляет уведомление оператору (stub до Resend).
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/db'
import { leads } from '@/db/schema'
import { sendEmail } from '@/lib/magic-link/sender'

interface LeadBody {
  type?: 'paid' | 'retainer'
  name?: string
  email?: string
  phone?: string
  company?: string
  message?: string
  turnstile_token?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Email оператора для уведомлений. Plaheholder до открытия юрлица —
// тогда заменим на реальный (или вообще на CRM-вебхук).
const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? 'operator@example.com'

export async function POST(req: NextRequest) {
  let body: LeadBody
  try {
    body = (await req.json()) as LeadBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const type = body.type
  if (type !== 'paid' && type !== 'retainer') {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }

  const name = body.name?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  // ── Turnstile verify (заглушка) ─────────────────────────────────────────
  // Когда подключим Cloudflare Turnstile: проверить body.turnstile_token
  // через /turnstile/v0/siteverify с CLOUDFLARE_TURNSTILE_SECRET.
  // Сейчас — пропускаем все запросы.

  const phone = body.phone?.trim() || null
  const company = body.company?.trim() || null
  const message = body.message?.trim() || null

  const db = getDb()
  const [inserted] = await db
    .insert(leads)
    .values({ leadType: type, name, email, phone, company, message })
    .returning()

  // Уведомление оператору (stub-логгер если RESEND_API_KEY не задан).
  const tariffLabel = type === 'paid' ? 'Разовый отчёт 9 999 ₽' : 'Сопровождение от 100 000 ₽/мес'
  const subject = `Новая заявка: ${tariffLabel}`
  const text = `Заявка с лендинга AI-Стратег.

Тариф: ${tariffLabel}
Имя: ${name}
Email: ${email}
Телефон: ${phone ?? '—'}
Компания: ${company ?? '—'}
Сообщение:
${message ?? '—'}

ID заявки: ${inserted.id}
Время: ${inserted.createdAt.toISOString()}`

  await sendEmail({
    to: OPERATOR_EMAIL,
    subject,
    html: `<pre style="font-family:monospace;font-size:13px;line-height:1.6">${escapeHtml(text)}</pre>`,
    text,
  })

  return NextResponse.json({ ok: true, leadId: inserted.id })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
