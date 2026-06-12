// Crisis variant — A/B-тест против /. Тот же дизайн (lp-* классы), но
// позиционирование «оптимизация маркетинга в кризис»: больше заявок при
// меньшем бюджете + анализ конкурентов + анализ бизнес-процессов.
// История с конкурентами не удалена, но смещена в один из трёх value-props.

import Link from 'next/link'
import CTALink from '../CTALink'

export const metadata = {
  title: 'AI-Стратег — за 24 часа покажем, где теряете деньги',
  description:
    'Анализ зон роста, конкурентов и бизнес-процессов за 24 часа. Что бесплатно сделать прямо сейчас, куда вкладывать бюджет и где экономить. Без интервью, с источниками.',
}

export default function CrisisHome() {
  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      {/* ── Навигация ─────────────────────────────────────────────────────── */}
      <nav className="max-w-5xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        <Link href="/archive" className="lp-btn-ghost">
          Архив →
        </Link>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-32 text-center">
        <p className="lp-eyebrow mb-8">Маркетинг в кризис</p>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.03em] leading-[1.02] mb-8">
          За 24 часа покажем, где теряете деньги и что сделать бесплатно уже завтра.
        </h1>

        <p className="text-lg sm:text-xl text-[#525252] max-w-2xl mx-auto leading-[1.55] mb-12">
          AI разберёт ваш маркетинг и 4–6 конкурентов. Получите три вещи: что
          бесплатно сделать прямо сейчас, как работают конкуренты и куда тратить
          бюджет, где оптимизировать бизнес-процессы.
        </p>

        <div className="flex flex-col items-center">
          <CTALink href="/intake" goal="open_intake" className="lp-btn-primary">
            Получить бесплатный разбор
            <span aria-hidden>→</span>
          </CTALink>
          <p className="text-sm text-[#6b7280] mt-5">
            Анкета 5 минут. Без оплаты, без звонков менеджера.
          </p>
        </div>
      </section>

      {/* ── Pain section — три боли в кризис ──────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow lp-eyebrow-warm mb-4">Знакомо?</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Что не получается прямо сейчас
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {CRISIS_PAINS.map((p, i) => (
              <article key={i} className="lp-card p-8">
                <p className="lp-pain-num mb-6">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="text-lg font-bold leading-snug mb-3 tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="text-[15px] text-[#525252] leading-[1.6]">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who benefits ──────────────────────────────────────────────────── */}
      <section className="bg-[#fafafa] border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow mb-4">Для кого</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Кто получит результат
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {WHO_BENEFITS.map((w, i) => (
              <article key={i} className="lp-card bg-white p-8">
                <p className="text-xs font-bold text-[#1e3a8a] uppercase tracking-[0.12em] mb-4">
                  {w.role}
                </p>
                <h3 className="text-xl font-bold leading-snug mb-4 tracking-[-0.015em]">
                  {w.headline}
                </h3>
                <ul className="space-y-3">
                  {w.outcomes.map((o, j) => (
                    <li
                      key={j}
                      className="flex gap-3 text-[15px] text-[#525252] leading-[1.55]"
                    >
                      <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Три value-props (метод по сути) ───────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow mb-4">Что вы получите</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Три вещи в одном отчёте
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {VALUE_PROPS.map((v, i) => (
              <article key={i} className="lp-card p-7">
                <div className="flex items-baseline gap-4 mb-5">
                  <span className="lp-step-num">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">{v.title}</h3>
                <p className="text-[15px] text-[#525252] leading-[1.6]">{v.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Тарифы ────────────────────────────────────────────────────────── */}
      <section className="bg-[#fafafa] border-t border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow mb-4">Тарифы</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Выберите формат работы
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TARIFFS.map((t, i) => (
              <article
                key={i}
                className={`lp-card bg-white p-8 flex flex-col ${
                  t.featured ? 'border-2 border-[#1e3a8a]' : ''
                }`}
              >
                {t.badge && (
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1e3a8a] mb-4">
                    {t.badge}
                  </p>
                )}
                <h3 className="text-2xl font-bold tracking-[-0.015em] mb-2">{t.name}</h3>
                <p className="text-sm text-[#525252] mb-7 leading-relaxed">{t.subtitle}</p>

                <div className="mb-7 pb-7 border-b border-[#e5e5e5]">
                  <p className="text-3xl font-bold tracking-[-0.02em]">{t.price}</p>
                  <p className="text-xs text-[#6b7280] mt-1.5">{t.priceHint}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {t.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex gap-3 text-sm text-[#525252] leading-[1.55]"
                    >
                      <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <CTALink
                  href={t.href}
                  goal={t.goal}
                  className={t.featured ? 'lp-btn-primary justify-center' : 'lp-btn-secondary'}
                >
                  {t.cta}
                  <span aria-hidden>→</span>
                </CTALink>

                {t.note && (
                  <p className="text-xs text-[#6b7280] mt-4 leading-[1.55]">{t.note}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Об основателях ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-12 max-w-2xl">
            <p className="lp-eyebrow mb-4">Команда AI-Стратег</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Опыт двух основателей — упакованный в AI
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {FOUNDERS.map((f, i) => (
              <article key={i} className="lp-card overflow-hidden flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.photo}
                  alt={f.name}
                  className="w-full aspect-[3/4] object-cover bg-[#fafafa]"
                />
                <div className="p-7 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold mb-1 tracking-[-0.015em]">{f.name}</h3>
                  <p className="text-sm text-[#6b7280] uppercase tracking-[0.08em] font-semibold mb-5">
                    {f.role}
                  </p>
                  <ul className="space-y-3">
                    {f.facts.map((fact, j) => (
                      <li key={j} className="flex gap-3 text-[15px] text-[#525252] leading-[1.55]">
                        <span className="text-[#1e3a8a] font-bold shrink-0 mt-0.5">✓</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Главное обещание приложения ────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5] bg-[#0a0a0a] text-white">
        <div className="max-w-4xl mx-auto px-6 py-28 text-center">
          <p className="text-xs font-semibold text-[#fbbf24] uppercase tracking-[0.16em] mb-6">
            Зачем мы создали AI-Стратег
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.025em] leading-[1.15] mb-8">
            Увеличить вашу выручку <span className="text-[#fbbf24]">в&nbsp;1,5&nbsp;раза</span> при снижении затрат <span className="text-[#fbbf24]">в&nbsp;2&nbsp;раза</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/75 leading-[1.6] max-w-2xl mx-auto">
            За счёт анализа вашего маркетинга и бизнес-процессов. AI-Стратег делает за 24 часа то, на что у директора по маркетингу уходят недели.
          </p>
        </div>
      </section>

      {/* ── Окупаемость (после Об основателе) ─────────────────────────────── */}
      <section className="bg-[#fafafa] border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="lp-eyebrow mb-4">Окупаемость</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
              9 999 ₽ окупаются с одного клиента
            </h2>
            <p className="text-base text-[#525252] leading-[1.65]">
              Отчёт — это не расход, а решение из 2–3 действий, которые
              перенаправят существующий бюджет туда, где он реально приносит
              заявки.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {ROI_EXAMPLES.map((ex, i) => (
              <div key={i} className="lp-card bg-white p-7">
                <p className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-[0.12em] mb-4">
                  {ex.niche}
                </p>
                <p className="text-3xl font-bold tracking-[-0.025em] text-[#0a0a0a] mb-1">
                  {ex.metric}
                </p>
                <p className="text-xs text-[#6b7280] uppercase tracking-[0.08em] font-semibold mb-4">
                  {ex.metricLabel}
                </p>
                <p className="text-[14px] text-[#525252] leading-[1.6]">{ex.payback}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Сравнение ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-3xl">
            <p className="lp-eyebrow mb-4">Сравнение</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              С AI-Стратегом и без него
            </h2>
          </div>

          {/* Desktop: 3-колоночная таблица */}
          <div className="hidden md:block lp-card bg-[#fafafa] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="lp-cmp-th"></th>
                  <th className="lp-cmp-th">Без AI-Стратега</th>
                  <th className="lp-cmp-th text-[#1e3a8a]">С AI-Стратегом</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-t border-[#e5e5e5]">
                    <td className="lp-cmp-td font-semibold text-[#0a0a0a] w-1/3">
                      {row.label}
                    </td>
                    <td className="lp-cmp-td text-[#525252] w-1/3">{row.them}</td>
                    <td className="lp-cmp-td text-[#0a0a0a] w-1/3 font-medium">
                      {row.us}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: карточки */}
          <div className="md:hidden space-y-3">
            {COMPARISON.map((row, i) => (
              <div key={i} className="lp-card p-5">
                <p className="text-xs font-bold text-[#0a0a0a] uppercase tracking-[0.1em] mb-4">
                  {row.label}
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-[#6b7280] uppercase tracking-[0.1em] mb-1 font-semibold">
                      Без AI-Стратега
                    </p>
                    <p className="text-sm text-[#525252] leading-[1.55]">{row.them}</p>
                  </div>
                  <div className="pt-3 border-t border-[#e5e5e5]">
                    <p className="text-[11px] text-[#1e3a8a] uppercase tracking-[0.1em] mb-1 font-bold">
                      С AI-Стратегом
                    </p>
                    <p className="text-sm text-[#0a0a0a] font-medium leading-[1.55]">
                      {row.us}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#fafafa] border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <div className="mb-12 max-w-2xl">
            <p className="lp-eyebrow mb-4">Вопросы и ответы</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Что чаще всего спрашивают
            </h2>
          </div>

          <div className="border-t border-[#e5e5e5]">
            {FAQ.map((f, i) => (
              <details key={i} className="group border-b border-[#e5e5e5] py-6">
                <summary className="flex items-start justify-between gap-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="text-lg font-bold tracking-[-0.01em] text-[#0a0a0a] leading-snug">
                    {f.q}
                  </h3>
                  <span className="text-2xl text-[#1e3a8a] font-bold transition-transform group-open:rotate-45 shrink-0 leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-[15px] text-[#525252] leading-[1.65] pr-12">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Финальный CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-28 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.025em] leading-[1.1] mb-6">
            Понятно, куда движется рынок — понятно, куда вкладывать
          </h2>
          <p className="text-lg text-[#525252] mb-10 max-w-xl mx-auto leading-[1.6]">
            Бесплатный разбор покажет 3 ваших слабых точки и одну идею для
            быстрого роста — без оплаты и без созвона.
          </p>
          <CTALink href="/intake" goal="open_intake" className="lp-btn-primary">
            Запустить разбор
            <span aria-hidden>→</span>
          </CTALink>
          <p className="text-sm text-[#6b7280] mt-5">
            Анкета 5 минут. Без оплаты, без звонков.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6b7280] text-center sm:text-left">
            © {new Date().getFullYear()} AI-Стратег. Стратегический анализ для
            российских компаний.
          </p>
          <div className="flex gap-5 text-xs text-[#6b7280]">
            <Link href="/privacy" className="hover:text-[#0a0a0a]">
              Политика обработки данных
            </Link>
            <Link href="/offer" className="hover:text-[#0a0a0a]">
              Публичная оферта
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

// ─── Контент: 3 боли в кризис ────────────────────────────────────────────────
const CRISIS_PAINS = [
  {
    title: 'Нет бюджета на рекламу, а заявок надо больше',
    body:
      'Урезали расходы, но план продаж не урезали. Каждый новый рубль на рекламу — под микроскопом, но непонятно, какой канал даст результат.',
  },
  {
    title: 'Не понимаете, как увеличить заявки прямо сейчас',
    body:
      'Сайт есть, реклама крутится, но кратного роста нет. Очевидных рычагов не видно — а гадать вслепую с урезанным бюджетом нельзя.',
  },
  {
    title: 'Хочется понять, как конкуренты выходят из кризиса',
    body:
      'Кто-то из них точно знает, что делает. Хочется увидеть их ходы прямо сейчас — какие каналы тянут, что говорят клиентам, где экономят.',
  },
] as const

// ─── Кому подойдёт (2 роли) ──────────────────────────────────────────────────
const WHO_BENEFITS = [
  {
    role: 'Предприниматель',
    headline: 'Понятно, куда вкладывать бюджет и где сокращать',
    outcomes: [
      'Конкретика: где брать заявки, что делать и почему',
      'Оптимизация отдела маркетинга и снижение расходов без потери качества',
      'Понимание зон роста бизнеса — не только в маркетинге, но и в процессах',
    ],
  },
  {
    role: 'Маркетолог',
    headline: 'Снижение стоимости заявки без потери объёма',
    outcomes: [
      'Понимание, как работают конкуренты прямо сейчас и что у них даёт результат',
      'Оптимизация бюджета без потери количества и качества заявок',
      'Оптимизация бизнес-процессов в отделе маркетинга — меньше рутины, больше результата',
    ],
  },
] as const

// ─── Об основателях ──────────────────────────────────────────────────────────
const FOUNDERS = [
  {
    name: 'Александр Вайсберг',
    role: 'Маркетолог · Сооснователь',
    photo: '/founder-aleksandr.jpg',
    facts: [
      '13 лет в маркетинге — стратегия, контекст, перформанс',
      'Управлял рекламными бюджетами до 10 млн ₽/месяц',
      'Привлекал 2+ млн ₽ выручки с нулевым рекламным бюджетом',
      'Основатель сети кулинарных квест-шоу в 4 городах России',
    ],
  },
  {
    name: 'Игорь Ломакин',
    role: 'Предприниматель · Сооснователь',
    photo: '/founder-lomakin.jpg',
    facts: [
      '30 лет предпринимательского стажа',
      'Основатель компании GOLDAYS',
    ],
  },
] as const

// ─── Сравнение «С AI-Стратегом vs без» ───────────────────────────────────────
const COMPARISON = [
  {
    label: 'Срок до решения',
    them: 'Недели на интервью, согласования, поиск маркетолога',
    us: '24 часа на готовый отчёт с действиями',
  },
  {
    label: 'Ваше время',
    them: 'Интервью 2–3 часа + правки',
    us: 'Анкета 5 минут',
  },
  {
    label: 'Цена',
    them: 'Маркетолог-консультант от 60 000 ₽, штатный CMO от 150 000 ₽/мес',
    us: '9 999 ₽ за разовый разбор (или бесплатный пробник)',
  },
  {
    label: 'Анализ конкурентов',
    them: '2–3 конкурента субъективно',
    us: '4–6 конкурентов с источниками и датами',
  },
  {
    label: 'Решения по каналам',
    them: 'Общие рекомендации «развивайте Telegram»',
    us: 'Ранжированный микс: куда вкладывать, а где экономить',
  },
  {
    label: 'Зависит от человека',
    them: 'Да, от одного эксперта',
    us: 'Нет, методика повторяема и не теряется при уходе сотрудника',
  },
] as const

// ─── 3 value-props ───────────────────────────────────────────────────────────
const VALUE_PROPS = [
  {
    title: 'Зоны роста и быстрые победы',
    body:
      'Что бесплатно сделать прямо сейчас, чтобы уже завтра пошли заявки. Конкретные действия — не «поработайте над сайтом», а «поменяйте первый экран на формулировку X».',
  },
  {
    title: 'Что делают конкуренты прямо сейчас',
    body:
      'Анализ 4–6 конкурентов с источниками: их офферы, каналы, посадочные. Видно, куда они тратят бюджет — и куда вам тратить НЕ нужно, потому что там уже занято.',
  },
  {
    title: 'Бизнес-процессы и AI-оптимизация',
    body:
      'Краткий аудит рутинных операций: где AI снимет нагрузку с команды, какие процессы можно автоматизировать. Снижение издержек по времени и персоналу.',
  },
] as const

// ─── ROI-примеры (типичные средние чеки по нишам) ────────────────────────────
const ROI_EXAMPLES = [
  {
    niche: 'Юр. услуги · B2B',
    metric: 'от 30 000 ₽',
    metricLabel: 'Средний чек одного дела',
    payback:
      'Перенаправление бюджета с одного нерабочего канала на рабочий обычно даёт +30% к заявкам уже в первый месяц.',
  },
  {
    niche: 'Производство · B2B',
    metric: 'от 500 000 ₽',
    metricLabel: 'Средняя сделка',
    payback:
      'Прирост конверсии лендинга на 0,2% при текущем трафике окупает отчёт за месяц. Одна сделка — окупает 50 отчётов.',
  },
  {
    niche: 'Локальный бизнес · B2C',
    metric: '20–40 лидов',
    metricLabel: 'В месяц с одного канала',
    payback:
      'Свободный канал, который не закрывают конкуренты, даёт стабильный поток. Отчёт окупается за 2 недели.',
  },
] as const

// ─── Тарифы (с обновлённым описанием 9 999 ₽ под crisis-сценарий) ────────────
const TARIFFS = [
  {
    badge: null,
    name: 'Бесплатно',
    subtitle: 'Пробник, чтобы понять формат',
    price: 'Бесплатно',
    priceHint: '24 часа · Дашборд + email',
    features: [
      '2 конкурента — что они делают сейчас',
      '2 слабые точки вашего бизнеса',
      '1 идея для быстрого роста',
    ],
    cta: 'Получить',
    href: '/intake',
    goal: 'open_intake',
    featured: false,
    note: null,
  },
  {
    badge: 'Популярный',
    name: '9 999 ₽',
    subtitle: 'Полный разбор с планом действий',
    price: '9 999 ₽',
    priceHint: '24 часа · PDF + дашборд + email',
    features: [
      'Анализ конкурентов с конкретными выводами и рекомендациями',
      'Конкретный план действий по каналам: с чем работать, куда вкладывать бюджет, а где не нужно',
      'Анализ текущего состояния маркетинга и бизнес-процессов для понимания зон роста',
    ],
    cta: 'Заказать',
    href: '/intake?tier=paid',
    goal: 'paywall_click',
    featured: true,
    note: null,
  },
  {
    badge: null,
    name: 'Сопровождение',
    subtitle: 'Маркетинговая команда: куратор-стратег + AI-движок',
    price: 'от 100 000 ₽/мес',
    priceHint: 'От 1 месяца · Договор, персональный куратор',
    features: [
      'Всё из тарифа «9 999 ₽»',
      'Ежемесячный мониторинг конкурентов и рынка',
      'Управление маркетинговой стратегией в кризис',
      'Постоянная оптимизация бюджета и процессов',
    ],
    cta: 'Записаться на отбор',
    href: '/lead/retainer',
    goal: 'lead_retainer',
    featured: false,
    note: 'Работаем с 3 компаниями одновременно. Сначала — бесплатный звонок 30 минут, чтобы понять, подходим ли друг другу.',
  },
] as const

// ─── FAQ (адаптирован под crisis-позиционирование) ──────────────────────────
const FAQ = [
  {
    q: 'Откуда вы берёте данные о конкурентах?',
    a: 'Публичные источники: сайты конкурентов, их соцсети, поисковая выдача, базы вакансий, картографические сервисы. Никаких внутренних или закрытых данных — мы анализируем то, что и сами клиенты конкурента видят.',
  },
  {
    q: 'А если у меня нет списка конкурентов?',
    a: 'Назовите нишу и регион — мы найдём по 4–6 ключевым автоматически. Можно дополнить своим списком, если кого-то знаете.',
  },
  {
    q: 'Что если AI ошибётся?',
    a: 'Каждый факт в отчёте сопровождается источником, датой и оценкой надёжности (5 уровней). Вы сами видите, на чём построен вывод — и можете отбросить недостоверное.',
  },
  {
    q: 'Что значит «анализ бизнес-процессов»?',
    a: 'Кратко смотрим на ваши рутинные операции (приём заявок, квалификация лидов, повторные продажи) — где AI-инструменты могут снять нагрузку и снизить издержки. Это не полный консалтинг по операциям, а конкретные точки приложения AI.',
  },
  {
    q: 'Безопасно ли загружать данные о моём бизнесе?',
    a: 'Данные хранятся в зашифрованной базе на серверах в РФ. Не передаются третьим лицам, не используются для обучения моделей. Можно удалить по запросу.',
  },
  {
    q: 'Что такое сопровождение и чем отличается от отчёта?',
    a: 'Разовый отчёт — снимок ситуации. Сопровождение — постоянная работа: каждый месяц мониторим конкурентов и рынок, корректируем стратегию под изменения, участвуем в принятии маркетинговых решений вместе с вами. Это ближе к найму CMO на аутсорс, чем к разовой консультации.',
  },
] as const
