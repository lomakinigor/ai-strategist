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
import FreeReportGoal from './FreeReportGoal'
import { PrintButton } from './PrintButton'
import { BriefAutoGenerate } from './BriefAutoGenerate'

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
      <FreeReportGoal />
      {/* ── Минимальная навигация ────────────────────────────────────────── */}
      <nav className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        <div className="flex items-center gap-3 no-print">
          <PrintButton />
          <Link href={`/api/upgrade-to-paid?artifactId=${params.artifactId}`} className="lp-btn-ghost">
            Полный отчёт →
          </Link>
        </div>
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
        <BriefAutoGenerate artifactId={params.artifactId} />
      )}

      {/* ── Cliffhanger «что мы нашли, но не включили» (L1→L2) ───────────── */}
      <Cliffhanger brief={brief} />

      {/* ── Paywall на 9 999 ₽ ───────────────────────────────────────────── */}
      <Paywall artifactId={params.artifactId} />

      {/* ── L3-pitch: исполнение (сайт + боты в каналы + автопостинг) ───── */}
      <ExecutionPitch />

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
// Paywall: что не входит в пробник + CTA на полный отчёт 9 999 ₽
// ────────────────────────────────────────────────────────────────────────────

function Cliffhanger({ brief }: { brief: BriefReportBlock | null }) {
  // Cliffhanger в духе KB product-system-3-tier.md:
  // «Ваш главный конкурент [имя] получает X… но показывать здесь не можем — это в расширенном.»
  // Используем настоящего конкурента из brief, если есть — даёт максимум персонализации.
  const topCompetitor = brief?.competitor_landscape.competitors?.[0]
  const totalCompetitors = brief?.competitor_landscape.competitors?.length ?? 0
  const hiddenCompetitors = Math.max(0, totalCompetitors - 2)

  return (
    <section className="border-t border-[#e5e5e5]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="lp-eyebrow lp-eyebrow-warm mb-4">Что мы нашли, но не включили</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-[1.15] mb-8">
          В&nbsp;этом пробнике закрыто самое важное
        </h2>

        <ul className="space-y-4 text-[15px] text-[#0a0a0a] leading-[1.6]">
          {topCompetitor && (
            <li className="flex gap-3">
              <span className="text-[#b45309] font-bold shrink-0 mt-0.5">×</span>
              <span>
                <strong className="text-[#0a0a0a]">{topCompetitor.name}</strong> — мы разобрали его
                по&nbsp;6&nbsp;уровням (оффер, аудитория, болевые точки, доказательства, креативы,
                посадочная). В&nbsp;пробнике видна только одна строка «{topCompetitor.focus}» —
                остальные 5 уровней закрыты.
              </span>
            </li>
          )}
          {hiddenCompetitors > 0 && (
            <li className="flex gap-3">
              <span className="text-[#b45309] font-bold shrink-0 mt-0.5">×</span>
              <span>
                Ещё <strong>{hiddenCompetitors} конкурент{hiddenCompetitors === 1 ? '' : 'а'}</strong>{' '}
                разобран{hiddenCompetitors === 1 ? '' : 'ы'} в&nbsp;полном отчёте — сравнительная
                таблица «вы&nbsp;vs&nbsp;каждый из&nbsp;них» по&nbsp;ключевым параметрам.
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <span className="text-[#b45309] font-bold shrink-0 mt-0.5">×</span>
            <span>
              <strong>Маркетинговый микс под вашу нишу</strong> с&nbsp;ранжированной таблицей каналов:
              CPL-ориентир по&nbsp;каждому, бюджет/месяц, что тестировать. Закрыто.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#b45309] font-bold shrink-0 mt-0.5">×</span>
            <span>
              <strong>Все 3–5 слабых точек</strong> с&nbsp;источниками и&nbsp;привязкой к&nbsp;плану
              30/60/90&nbsp;дней. В&nbsp;пробнике видны только 2&nbsp;из&nbsp;них.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#b45309] font-bold shrink-0 mt-0.5">×</span>
            <span>
              <strong>3 готовых варианта УТП</strong> под&nbsp;разные сегменты вашей аудитории
              с&nbsp;обоснованием каждого. В&nbsp;пробнике — только 1&nbsp;тизер.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-[#b45309] font-bold shrink-0 mt-0.5">×</span>
            <span>
              <strong>Сравнение вашей ниши в&nbsp;РФ с&nbsp;мировой</strong> — как эта же ниша устроена
              за&nbsp;рубежом (2–3 ведущие страны: США / Европа / APAC), какие тренды дойдут до&nbsp;РФ
              через&nbsp;12–24&nbsp;месяца, что копировать из&nbsp;Global, а&nbsp;что не&nbsp;повторять.
              В&nbsp;пробнике — закрыто.
            </span>
          </li>
        </ul>

        <p className="text-sm text-[#525252] mt-8 leading-[1.65]">
          Это конкретные данные — не&nbsp;пустые обещания. Мы&nbsp;их&nbsp;нашли в&nbsp;ходе исследования
          и&nbsp;собрали в&nbsp;полный отчёт. Чтобы открыть — ниже.
        </p>
      </div>
    </section>
  )
}

function Paywall({ artifactId }: { artifactId: string }) {
  return (
    <section className="border-t border-[#e5e5e5] bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="lp-eyebrow mb-4">Полный отчёт</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-10">
          За 9 999 ₽ откроется всё
        </h2>

        <ul className="text-left max-w-md mx-auto space-y-3 mb-10 text-[15px] text-[#0a0a0a]">
          {PAYWALL_FEATURES.map((f, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link href={`/api/upgrade-to-paid?artifactId=${artifactId}`} className="lp-btn-primary">
          Открыть полный отчёт
          <span aria-hidden>→</span>
        </Link>
        <p className="text-sm text-[#6b7280] mt-5">
          9 999 ₽ через СБП. Отчёт откроется в&nbsp;браузере сразу после подтверждения оплаты.
          Анкету заполнять заново не&nbsp;нужно — данные о&nbsp;вашей компании уже сохранены.
        </p>
      </div>
    </section>
  )
}

function ExecutionPitch() {
  return (
    <section className="border-t border-[#e5e5e5] bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-xs font-semibold text-[#fbbf24] uppercase tracking-[0.16em] mb-4">
          Кроме отчёта мы делаем
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.15] mb-8">
          Не&nbsp;только показать, но и&nbsp;сделать
        </h2>
        <p className="text-lg text-white/80 leading-[1.65] mb-10 max-w-2xl">
          Отчёт показывает что менять. Если у&nbsp;вас нет команды, которая это внедрит — мы&nbsp;делаем
          ключевые куски руками. Дешевле, чем нанимать штатный отдел.
        </p>

        <ul className="space-y-5 mb-10">
          {EXECUTION_SERVICES.map((s, i) => (
            <li key={i} className="flex gap-4 items-start">
              <span className="text-[#fbbf24] font-bold text-lg shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-base font-bold mb-1">{s.title}</p>
                <p className="text-sm text-white/70 leading-[1.55]">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-sm text-white/60 leading-[1.65]">
          Конкретные сметы — в&nbsp;диалоге после полного отчёта, когда поймём, что именно вам нужно
          внедрить из&nbsp;плана.
        </p>
      </div>
    </section>
  )
}

const PAYWALL_FEATURES = [
  'Все 4–6 конкурентов в полном разборе (6 уровней каждый)',
  'Сравнительная таблица «вы vs все конкуренты» по ключевым параметрам',
  'Все слабые точки (3–5) с источниками и оценкой надёжности',
  '3 готовых варианта УТП под разные сегменты',
  'Маркетинговый микс под вашу нишу — таблица каналов с CPL и бюджетом',
  'Сравнение ниши РФ с мировой — какие тренды дойдут через 12–24 месяца',
  'AI-автоматизация — конкретные рычаги с эффектом и сроком',
  'План действий на 30 / 60 / 90 дней с метриками и ответственными',
] as const

const EXECUTION_SERVICES = [
  {
    title: 'Правильный сайт под отчёт',
    body:
      'Лендинг или одностраничник, который отвечает на бренд-стратегию из отчёта — первый экран с УТП, посадочная под канал, формы захвата лидов. Под ключ.',
  },
  {
    title: 'AI-боты в рекламные каналы',
    body:
      'Чат-бот квалификации лидов на сайт, во ВКонтакте, MAX, Telegram. Принимает обращения 24/7, классифицирует по сегментам, передаёт менеджеру горячие — снижает CPL и нагрузку команды.',
  },
  {
    title: 'Автоматизация постинга',
    body:
      'AI-генерация контент-плана + автопостинг по каналам (ВКонтакте, Telegram, MAX, Дзен). 5–10 постов в неделю на канал × 4–5 каналов вместо найма SMM-щика за 60–120K ₽/месяц.',
  },
] as const
