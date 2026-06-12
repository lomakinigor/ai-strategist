// Approve-эндпоинт для администратора. Принимает GET с параметрами job + secret.
// Сравнивает secret с env ADMIN_APPROVE_SECRET (constant-time). Если совпало —
// ставит paid=true + paid_at=now на researchJobs.
//
// Использование: ссылку с этим URL шлёт бот в Telegram. Админ нажимает в чате
// → открывается этот эндпоинт → сразу подтверждает оплату → редирект на /research/[id]
// чтобы админ мог сразу увидеть запуск пайплайна и при необходимости проконтролировать.
//
// Безопасность для MVP: ссылка работает у любого, кто знает secret. Защита от
// случайных переходов — secret не угадаешь. От серьёзной атаки не защищает —
// для production нужен полноценный admin-логин (отложено в следующий спринт).

import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { researchJobs } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const jobId = url.searchParams.get('job')
  const secret = url.searchParams.get('secret')

  if (!jobId || !secret) {
    return new NextResponse('Missing job or secret parameter', { status: 400 })
  }

  const expected = process.env.ADMIN_APPROVE_SECRET
  if (!expected) {
    console.error('[approve-payment] ADMIN_APPROVE_SECRET не задан в env')
    return new NextResponse('Server misconfigured', { status: 500 })
  }

  // Constant-time сравнение, чтобы не было timing-attack
  if (!timingSafeEqual(secret, expected)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const db = getDb()
  const rows = await db
    .select({ id: researchJobs.id, paid: researchJobs.paid, tier: researchJobs.tier })
    .from(researchJobs)
    .where(eq(researchJobs.id, jobId))
    .limit(1)

  const row = rows[0]
  if (!row) {
    return new NextResponse('Job not found', { status: 404 })
  }

  if (row.tier !== 'paid') {
    return new NextResponse('Job is not in paid tier — no approval needed', { status: 400 })
  }

  if (row.paid) {
    // Уже подтверждено ранее — идемпотентно, просто редиректим
    return NextResponse.redirect(new URL(`/research/${jobId}`, req.url))
  }

  await db
    .update(researchJobs)
    .set({ paid: true, paidAt: new Date() })
    .where(eq(researchJobs.id, jobId))

  // Редирект админа на /research/[jobId] — он сам увидит как стартует pipeline
  return NextResponse.redirect(new URL(`/research/${jobId}`, req.url))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
