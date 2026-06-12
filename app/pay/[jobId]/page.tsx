// Страница оплаты для tier=paid. Показывает QR-код СБП + реквизиты + ждёт approve.
// При маунте триггерит Telegram-уведомление администратору о запросе оплаты.
// Polling каждые 5 секунд: когда paid=true → автоматический редирект на /research/[jobId].

import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/db'
import { researchJobs, companies } from '@/db/schema'
import { notifyPaymentRequest } from '@/lib/notify/telegram'
import { PayPolling } from './PayPolling'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Оплата — AI-Стратег',
  robots: { index: false, follow: false },
}

export default async function PayPage({ params }: { params: { jobId: string } }) {
  const db = getDb()

  const rows = await db
    .select({
      jobId: researchJobs.id,
      tier: researchJobs.tier,
      paid: researchJobs.paid,
      paidAt: researchJobs.paidAt,
      companyName: companies.name,
      industry: companies.industry,
      website: companies.website,
      description: companies.description,
      competitors: companies.competitors,
      goals: companies.goals,
    })
    .from(researchJobs)
    .leftJoin(companies, eq(researchJobs.companyId, companies.id))
    .where(eq(researchJobs.id, params.jobId))
    .limit(1)

  const row = rows[0]
  if (!row) notFound()

  // free-tier юзеры не должны попадать сюда — отправляем на research
  if (row.tier !== 'paid') {
    redirect(`/research/${row.jobId}`)
  }

  // Уже оплачено → редирект на research (там polling прогресса research)
  if (row.paid) {
    redirect(`/research/${row.jobId}`)
  }

  // Шлём админу нотификацию о запросе оплаты (best-effort, не блокирует рендер).
  // Дедуп: Telegram сам не дедуплицирует, поэтому при каждой загрузке /pay/[jobId]
  // прилетит сообщение. В MVP это OK — нет смысла плодить state, перезагрузки от
  // одного клиента редки и помогают админу не забыть про оплату.
  // TODO когда появится throttle/last_notified_at — добавить cool-down 10 минут.
  await notifyPaymentRequest({
    jobId: row.jobId,
    companyName: row.companyName ?? 'Без названия',
    industry: row.industry ?? '—',
    website: row.website,
    description: row.description,
    competitors: row.competitors,
    goals: row.goals,
  })

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <nav className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
      </nav>

      <section className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Ожидание оплаты</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
          Оплатите 9 999 ₽, чтобы запустить исследование
        </h1>
        <p className="text-base text-[#525252] leading-[1.65] mb-10">
          Отсканируйте QR-код в приложении банка или используйте реквизиты ниже. После
          поступления денег нажмём «Подтвердить» — исследование запустится автоматически,
          отчёт откроется на этой же вкладке.
        </p>

        <div className="grid md:grid-cols-[auto_1fr] gap-10 items-start mb-10">
          <div className="lp-card p-4 bg-white mx-auto md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/payment-qr.png"
              alt="QR-код для оплаты"
              className="w-72 h-72 object-contain bg-[#fafafa]"
            />
          </div>

          <div>
            <div className="lp-card p-6 mb-4 bg-[#fafafa]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1e3a8a] mb-3">
                Сумма к оплате
              </p>
              <p className="text-3xl font-bold tracking-[-0.02em] mb-1">9 999 ₽</p>
              <p className="text-xs text-[#6b7280]">Разовый платёж, СБП</p>
            </div>

            <div className="lp-card p-6 mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b7280] mb-3">
                Реквизиты (если QR не работает)
              </p>
              <dl className="space-y-2 text-sm text-[#0a0a0a]">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Способ:</dt>
                  <dd>СБП по номеру телефона</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Телефон:</dt>
                  <dd className="font-mono">+7 (XXX) XXX-XX-XX</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Банк:</dt>
                  <dd>(укажите банк-получатель)</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Получатель:</dt>
                  <dd>(укажите ФИО)</dd>
                </div>
              </dl>
              <p className="text-xs text-[#6b7280] mt-4 leading-[1.55]">
                В комментарии к платежу укажите название компании и&nbsp;jobId:&nbsp;
                <code className="font-mono text-[11px] text-[#0a0a0a]">{row.jobId.slice(0, 8)}</code>
              </p>
            </div>

            <p className="text-xs text-[#6b7280] leading-[1.6]">
              Заявка #<code className="font-mono">{row.jobId.slice(0, 8)}</code> на компанию{' '}
              <strong className="text-[#0a0a0a]">{row.companyName ?? 'без названия'}</strong>
              {row.industry ? ` (ниша: ${row.industry})` : ''}. Мы получили уведомление о&nbsp;запросе оплаты.
            </p>
          </div>
        </div>

        {/* Опрос статуса оплаты раз в 5 секунд — когда paid=true редирект на /research/[jobId] */}
        <PayPolling jobId={row.jobId} />

        <div className="lp-card p-6 bg-[#fafafa]">
          <p className="text-sm text-[#525252] leading-[1.65]">
            <strong className="text-[#0a0a0a]">Что произойдёт после оплаты:</strong> мы вручную проверим
            поступление денег (обычно за 5–30 минут), подтвердим заявку, и эта страница автоматически
            перейдёт на исследование. Готовый полный отчёт можно будет посмотреть и&nbsp;скачать прямо в
            браузере — без отправки на почту, без созвонов.
          </p>
        </div>

        <p className="text-xs text-[#6b7280] mt-8 leading-[1.65]">
          Сохраните URL этой страницы (или вкладку в избранное) — он&nbsp;вам понадобится, если случайно
          закроете окно. По нему мы вернёмся к&nbsp;ожиданию оплаты, а&nbsp;потом — к&nbsp;готовому отчёту.
        </p>
      </section>

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-[#6b7280]">
          <p>© {new Date().getFullYear()} AI-Стратег</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#0a0a0a]">
              Политика
            </Link>
            <Link href="/offer" className="hover:text-[#0a0a0a]">
              Оферта
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
