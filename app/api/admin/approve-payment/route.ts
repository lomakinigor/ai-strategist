// Approve-эндпоинт для администратора. Принимает GET с параметрами job + secret.
// Сравнивает secret с env ADMIN_APPROVE_SECRET (constant-time). Если совпало —
// ставит paid=true + paid_at=now на researchJobs.
//
// Использование: ссылку с этим URL шлёт бот в Telegram. Админ нажимает в чате
// → ОС открывает endpoint в браузере (обычно НОВАЯ вкладка), мы возвращаем
// маленькую HTML-страницу «оплата подтверждена, вернитесь в исходную вкладку».
// НЕ редиректим на /research/[id] — иначе у клиента, который параллельно
// смотрит /pay, получится две вкладки на одном и том же отчёте. Polling
// в /pay сам подхватит paid=true и перенаправит клиента на /research/[id].
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

  const alreadyPaid = row.paid

  if (!alreadyPaid) {
    await db
      .update(researchJobs)
      .set({ paid: true, paidAt: new Date() })
      .where(eq(researchJobs.id, jobId))
  }

  return new NextResponse(renderApprovedHtml({ jobId, alreadyPaid }), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function renderApprovedHtml({ jobId, alreadyPaid }: { jobId: string; alreadyPaid: boolean }): string {
  const title = alreadyPaid ? 'Оплата уже была подтверждена' : 'Оплата подтверждена'
  const subtitle = alreadyPaid
    ? `Заявка ${jobId.slice(0, 8)}… уже отмечена как оплаченная ранее.`
    : `Заявка ${jobId.slice(0, 8)}… отмечена как оплаченная. Клиент увидит запуск отчёта автоматически.`
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — AI-Стратег</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafaf9;color:#0a0a0a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:480px;background:white;border:1px solid #e5e5e5;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04)}
  .check{width:64px;height:64px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px}
  h1{font-size:24px;line-height:1.2;margin-bottom:12px;letter-spacing:-.02em}
  p{font-size:15px;line-height:1.55;color:#525252;margin-bottom:8px}
  .hint{margin-top:28px;padding:16px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;line-height:1.5;text-align:left}
  .hint b{color:#78350f}
</style>
</head><body>
<div class="card">
  <div class="check">✓</div>
  <h1>${title}</h1>
  <p>${subtitle}</p>
  <div class="hint">
    <b>Вернитесь в исходную вкладку</b> со страницей оплаты — она сама перенаправит клиента на отчёт через несколько секунд. Эту вкладку можно закрыть.
  </div>
</div>
</body></html>`
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
