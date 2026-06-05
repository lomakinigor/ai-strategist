// Free-tier «карточка позиции» — урезанный view одного и того же briefJson.
// Сюда попадают пользователи, заполнившие анкету бесплатного тарифа. В отличие
// от /brief/[id] (полный neon-дашборд), здесь только: 2 конкурента + 2 узких
// места + 1 тизер УТП + крупный paywall на 9 999 ₽.
//
// View tier-agnostic: можно открыть для любого артефакта (например, демо
// реального клиента на лендинге). Маршрутизация free vs paid вынесена выше
// (в intake/email — придёт в Коммитах 6–7).

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { reportArtifacts, companies } from '@/db/schema'
import type { BriefReportBlock } from '@/lib/strategy/brief'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Карточка позиции — бесплатный пробник',
  robots: { index: false, follow: false },
}

export default async function FreeReportPage({
  params,
}: {
  params: { artifactId: string }
}) {
  const db = getDb()
  const rows = await db
    .select({
      brief: reportArtifacts.briefJson,
      status: reportArtifacts.status,
      companyName: companies.name,
      industry: companies.industry,
    })
    .from(reportArtifacts)
    .leftJoin(companies, eq(reportArtifacts.companyId, companies.id))
    .where(eq(reportArtifacts.id, params.artifactId))
    .limit(1)

  const row = rows[0]
  if (!row) notFound()

  const brief = row.brief as BriefReportBlock | null

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      {/* ── Минимальная навигация ────────────────────────────────────────── */}
      <nav className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        <Link href="/lead/paid" className="lp-btn-ghost">
          Полный отчёт →
        </Link>
      </nav>

      {/* ── Заголовок ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Бесплатный пробник</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
          Карточка позиции — {row.companyName ?? 'ваша компания'}
        </h1>
        {row.industry && (
          <p className="text-base text-[#525252] leading-[1.55]">
            Ниша: {row.industry}
          </p>
        )}
      </section>

      <div className="border-t border-[#e5e5e5]" />

      {/* ── Контент или плейсхолдер ──────────────────────────────────────── */}
      {brief ? (
        <FreeBrief brief={brief} />
      ) : (
        <BriefNotReady artifactId={params.artifactId} />
      )}

      {/* ── Paywall на 9 999 ₽ ───────────────────────────────────────────── */}
      <Paywall />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#6b7280]">
            © {new Date().getFullYear()} AI-Стратег. Стратегический анализ для
            российских компаний.
          </p>
        </div>
      </footer>
    </main>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Урезанный рендер брифа: 3 блока из 6, всё подаётся как «приоткрытое окно».
// ────────────────────────────────────────────────────────────────────────────

function FreeBrief({ brief }: { brief: BriefReportBlock }) {
  const top2Competitors = brief.competitor_landscape.competitors.slice(0, 2)
  const top2Bottlenecks = brief.critical_bottlenecks.slice(0, 2)
  const teaserUtp = brief.competitor_landscape.white_spots[0]

  return (
    <>
      {/* Конкуренты — 2 из 4–6 */}
      {top2Competitors.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-14">
          <div className="mb-8">
            <p className="lp-eyebrow mb-3">Кто рядом с вами</p>
            <h2 className="text-2xl font-bold tracking-[-0.02em]">
              2 ваших конкурента в нише
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {top2Competitors.map((c, i) => (
              <article key={i} className="lp-card p-7">
                <p className="lp-pain-num mb-4">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="text-lg font-bold mb-2 tracking-[-0.01em]">
                  {c.name}
                </h3>
                <p className="text-[15px] text-[#525252] leading-[1.6]">
                  {c.focus}
                </p>
              </article>
            ))}
          </div>
          <p className="text-xs text-[#6b7280] mt-6 leading-[1.6]">
            В полном отчёте — 4–6 конкурентов с разбором по 6 параметрам каждый:
            оффер, аудитория, болевые точки, доказательства, креативы,
            посадочная.
          </p>
        </section>
      )}

      <div className="border-t border-[#e5e5e5]" />

      {/* Узкие места — 2 из 3–5 */}
      {top2Bottlenecks.length > 0 && (
        <section className="bg-[#fafafa] border-t border-[#e5e5e5]">
          <div className="max-w-4xl mx-auto px-6 py-14">
            <div className="mb-8">
              <p className="lp-eyebrow lp-eyebrow-warm mb-3">
                Где вы слабее
              </p>
              <h2 className="text-2xl font-bold tracking-[-0.02em]">
                2 точки, которые работают против вас
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {top2Bottlenecks.map((b, i) => (
                <article key={i} className="lp-card bg-white p-7">
                  <p className="lp-pain-num mb-4">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="text-base font-bold leading-snug mb-3 tracking-[-0.01em]">
                    {b.problem}
                  </h3>
                  {b.metric && (
                    <p className="text-xs font-bold text-[#b45309] mb-3 uppercase tracking-[0.12em]">
                      {b.metric}
                    </p>
                  )}
                  <p className="text-[15px] text-[#525252] leading-[1.6]">
                    {b.consequence}
                  </p>
                </article>
              ))}
            </div>
            <p className="text-xs text-[#6b7280] mt-6 leading-[1.6]">
              В полном отчёте — все 3–5 слабых точек с источниками, оценкой
              надёжности и привязкой к плану действий 30/60/90 дней.
            </p>
          </div>
        </section>
      )}

      {/* Тизер УТП — 1 из 3 формулировок */}
      {teaserUtp && (
        <section className="border-t border-[#e5e5e5]">
          <div className="max-w-4xl mx-auto px-6 py-14">
            <div className="mb-6">
              <p className="lp-eyebrow mb-3">Где у вас «белое пятно»</p>
              <h2 className="text-2xl font-bold tracking-[-0.02em]">
                Идея для отстройки — тизер
              </h2>
            </div>
            <article className="lp-card p-8 border-2 border-[#1e3a8a]">
              <p className="text-lg font-medium leading-[1.55] text-[#0a0a0a] mb-6">
                {teaserUtp}
              </p>
              <p className="text-sm text-[#525252] leading-[1.6]">
                Это одно из направлений отстройки. В полном отчёте —{' '}
                <strong className="text-[#0a0a0a]">
                  3 готовые формулировки УТП
                </strong>{' '}
                под разные сегменты вашей аудитории, с обоснованием каждой.
              </p>
            </article>
          </div>
        </section>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Состояние: артефакт есть, но briefJson ещё не сгенерирован
// ────────────────────────────────────────────────────────────────────────────

function BriefNotReady({ artifactId }: { artifactId: string }) {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-center">
      <p className="lp-eyebrow mb-4">Пробник в обработке</p>
      <h2 className="text-2xl font-bold mb-4 tracking-[-0.02em]">
        Краткий отчёт ещё не сгенерирован
      </h2>
      <p className="text-base text-[#525252] mb-10 max-w-md mx-auto leading-[1.6]">
        Зайдите на полную страницу отчёта и нажмите «Сгенерировать краткий
        отчёт» — после этого пробник появится здесь.
      </p>
      <Link href={`/brief/${artifactId}`} className="lp-btn-primary">
        Сгенерировать пробник
        <span aria-hidden>→</span>
      </Link>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Paywall: что не входит в пробник + CTA на полный отчёт 9 999 ₽
// ────────────────────────────────────────────────────────────────────────────

function Paywall() {
  return (
    <section className="border-t border-[#e5e5e5] bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow mb-4">Что не входит в пробник</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-10">
          Полный отчёт за 9 999 ₽
        </h2>

        <ul className="text-left max-w-md mx-auto space-y-3 mb-10 text-[15px] text-[#0a0a0a]">
          {PAYWALL_FEATURES.map((f, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link href="/lead/paid" className="lp-btn-primary">
          Получить полный отчёт
          <span aria-hidden>→</span>
        </Link>
        <p className="text-sm text-[#6b7280] mt-5">
          9 999 ₽. Отчёт за 24 часа на ваш email.
        </p>
      </div>
    </section>
  )
}

const PAYWALL_FEATURES = [
  'Все 4–6 конкурентов с разбором по 6 параметрам',
  'Все слабые точки (3–5) с источниками и оценкой надёжности',
  '3 готовых варианта УТП под разные сегменты',
  'Маркетинговый микс под вашу нишу — таблица каналов с CPL и бюджетом',
  'AI-автоматизация — конкретные рычаги с эффектом и сроком',
  'План действий на 30 / 60 / 90 дней с метриками и ответственными',
] as const
