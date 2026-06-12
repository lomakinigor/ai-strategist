import Link from 'next/link'
import CTALink from './CTALink'

export const metadata = {
  title: 'AI-Стратег — узнайте, почему клиенты выбирают конкурента',
  description:
    'Анкета 5 минут → AI изучит 4–6 конкурентов → отчёт со слабыми точками вашего бизнеса и готовым УТП. За 24 часа. Без интервью, с источниками.',
}

export default function Home() {
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
        <p className="lp-eyebrow mb-8">Для российских компаний</p>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.03em] leading-[1.02] mb-8">
          Конкурент рядом забирает ваших клиентов.
          <br />
          За 24 часа покажем — почему.
        </h1>

        <p className="text-lg sm:text-xl text-[#525252] max-w-2xl mx-auto leading-[1.55] mb-12">
          Анкета 5 минут. AI изучит 4–6 ваших конкурентов и пришлёт отчёт со
          слабыми точками вашего бизнеса и готовым УТП. Без интервью, с
          источниками.
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

      {/* ── Сценарии боли ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow lp-eyebrow-warm mb-4">Знакомо?</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Что вы видите каждый день
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PAIN_SCENARIOS.map((p, i) => (
              <article key={i} className="lp-card p-8">
                <p className="lp-pain-num mb-6">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="text-lg font-bold leading-snug mb-3 tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="text-[15px] text-[#525252] leading-[1.6]">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Кому подойдёт ─────────────────────────────────────────────────── */}
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

      {/* ── Тарифы ────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5] bg-[#fafafa]">
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
                className={`lp-card p-8 flex flex-col ${
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

      {/* ── 3 шага метода ─────────────────────────────────────────────────── */}
      <section className="bg-[#fafafa] border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow mb-4">Как это работает</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Три шага от анкеты до готового УТП
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <article key={i} className="lp-card p-8 bg-white">
                <div className="flex items-baseline gap-4 mb-5">
                  <span className="lp-step-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-[0.14em]">
                    {s.duration}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-3 tracking-[-0.01em]">
                  {s.title}
                </h3>
                <p className="text-[15px] text-[#525252] leading-[1.6]">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof: примеры находок в первом разборе ─────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow mb-4">Пример работы</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
              Что мы находим в первом разборе
            </h2>
            <p className="text-base text-[#525252] leading-[1.65]">
              Реалистичные находки на гипотетических компаниях. Реальные кейсы
              клиентов будут добавлены по мере получения согласия на публикацию.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PROOF_EXAMPLES.map((ex, i) => (
              <article key={i} className="lp-card p-7 flex flex-col">
                <p className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-[0.12em] mb-4">
                  {ex.niche}
                </p>
                <p className="text-sm text-[#525252] leading-[1.6] mb-4">
                  {ex.context}
                </p>
                <p className="text-[15px] text-[#0a0a0a] font-medium leading-[1.55] mb-5">
                  {ex.finding}
                </p>
                <div className="mt-auto pt-5 border-t border-[#e5e5e5]">
                  <p className="text-xs text-[#6b7280] uppercase tracking-[0.12em] mb-1.5">
                    Свободная ниша
                  </p>
                  <p className="text-[14px] text-[#1e3a8a] font-semibold leading-[1.5]">
                    {ex.opportunity}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <p className="text-xs text-[#6b7280] mt-8 max-w-3xl leading-[1.65]">
            В реальном отчёте каждый факт сопровождается ссылкой на источник
            (сайт, соцсеть, агрегатор), датой получения и оценкой надёжности от 1
            до 5. Вы видите, на чём построен каждый вывод, и можете его
            проверить.
          </p>
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
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="lp-eyebrow mb-4">Окупаемость</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
              9 999 ₽ окупаются с одного клиента
            </h2>
            <p className="text-base text-[#525252] leading-[1.65]">
              Отчёт — это не расход на «посмотреть», а инструмент для одного
              конкретного действия: переписать первый экран сайта так, чтобы
              целевой клиент узнавал себя.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {ROI_EXAMPLES.map((ex, i) => (
              <div key={i} className="lp-card p-7">
                <p className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-[0.12em] mb-4">
                  {ex.niche}
                </p>
                <p className="text-3xl font-bold tracking-[-0.025em] text-[#0a0a0a] mb-1">
                  {ex.metric}
                </p>
                <p className="text-xs text-[#6b7280] uppercase tracking-[0.08em] font-semibold mb-4">
                  {ex.metricLabel}
                </p>
                <p className="text-[14px] text-[#525252] leading-[1.6]">
                  {ex.payback}
                </p>
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
              AI-Стратег против стандартного маркетингового аудита
            </h2>
          </div>

          {/* Desktop: 3-колоночная таблица */}
          <div className="hidden md:block lp-card bg-[#fafafa] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="lp-cmp-th"></th>
                  <th className="lp-cmp-th">Маркетолог-консультант</th>
                  <th className="lp-cmp-th text-[#1e3a8a]">AI-Стратег</th>
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

          {/* Mobile: каждая строка — карточка с двумя сравниваемыми значениями */}
          <div className="md:hidden space-y-3">
            {COMPARISON.map((row, i) => (
              <div key={i} className="lp-card p-5">
                <p className="text-xs font-bold text-[#0a0a0a] uppercase tracking-[0.1em] mb-4">
                  {row.label}
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-[#6b7280] uppercase tracking-[0.1em] mb-1 font-semibold">
                      Маркетолог-консультант
                    </p>
                    <p className="text-sm text-[#525252] leading-[1.55]">{row.them}</p>
                  </div>
                  <div className="pt-3 border-t border-[#e5e5e5]">
                    <p className="text-[11px] text-[#1e3a8a] uppercase tracking-[0.1em] mb-1 font-bold">
                      AI-Стратег
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
      <section className="border-t border-[#e5e5e5]">
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
                <p className="mt-4 text-[15px] text-[#525252] leading-[1.65] pr-12">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Финальный CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-28 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.025em] leading-[1.1] mb-6">
            Готовы посмотреть на свой рынок свежим взглядом?
          </h2>
          <p className="text-lg text-[#525252] mb-10 max-w-xl mx-auto leading-[1.6]">
            Назовите своих конкурентов или мы найдём их сами. Бесплатный отчёт
            придёт на почту в течение 24&nbsp;часов.
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

const PAIN_SCENARIOS = [
  {
    title: 'Снижаете цены, но заявок всё равно меньше, чем у соседа',
    body:
      'Скидки съедают маржу, а клиент всё равно уходит. Значит, дело не в цене — а в том, чего не видно на сайте.',
  },
  {
    title: 'На сайте «20 лет опыта» — а в чём конкретно вы лучше, не объяснить',
    body:
      'У клиента 5 секунд на первый экран. Без чёткого «почему вы» он уходит к тому, кто сформулировал понятнее.',
  },
  {
    title: 'Конкурент делает то же самое, но клиенты идут к нему',
    body:
      'Вы оба продаёте «качество». Он просто упаковал предложение так, что в нём узнают свою боль, а в вашем — нет.',
  },
] as const

const STEPS = [
  {
    duration: '5 минут',
    title: 'Анкета о бизнесе',
    body:
      'Расскажите, что вы продаёте и кому. Назовите 3–5 конкурентов — или мы найдём их сами по вашей нише и региону.',
  },
  {
    duration: 'до 24 часов',
    title: 'Изучаем рынок',
    body:
      'Параллельно анализируем сайты, рекламу и соцсети ваших конкурентов. Каждый факт — со ссылкой на источник, чтобы вы могли проверить.',
  },
  {
    duration: 'готово',
    title: 'Отчёт со стратегией',
    body:
      'Что у вас слабее, чем у них. Где «белое пятно» — в чём отстроиться. Готовые формулировки УТП под ваши сегменты. План на 30/60/90 дней.',
  },
] as const

// ─── Контент: ROI-примеры (типичные средние чеки по нишам) ───────────────────
const ROI_EXAMPLES = [
  {
    niche: 'Юр. услуги · B2B',
    metric: 'от 30 000 ₽',
    metricLabel: 'Средний чек одного дела',
    payback:
      'Один клиент, пришедший на новое УТП с первого экрана сайта, окупает отчёт в 3 раза. Один контракт — в 10–30 раз.',
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
      'Свободный канал (ВКонтакте + 2ГИС), который не закрывают конкуренты, даёт стабильный поток. Отчёт окупается за 2 недели.',
  },
] as const

// ─── Контент: примеры находок (гипотетические, явно подписаны) ───────────────
const PROOF_EXAMPLES = [
  {
    niche: 'Юр. компания · Москва · B2B',
    context:
      '5 конкурентов в нише «защита бизнеса от налоговых проверок».',
    finding:
      '4 из 5 делают упор на «опыт 20+ лет». Один не показывает кейсы вообще. Никто не даёт гарантию результата с цифрами.',
    opportunity:
      '«Гарантия результата или возврат» + публичные кейсы — никто из 5 это не закрыл.',
  },
  {
    niche: 'Производство · Урал · B2B',
    context:
      'Промышленные дробемёты. 4 прямых конкурента в регионе.',
    finding:
      'У 3 из 4 на сайте нет калькулятора стоимости. У 2 — нет фото производства. Цены в КП высылают через 2–3 дня.',
    opportunity:
      '«Цена за 60 секунд через калькулятор» — снимает главную боль B2B-закупщика.',
  },
  {
    niche: 'Сеть кафе · СПб · B2C',
    context:
      '6 локальных кафе в районе, 4 прямых конкурента по позиционированию.',
    finding:
      '80% бюджета конкурентов уходит в Instagram (через VPN). ВКонтакте, MAX и 2ГИС — пусты или заброшены.',
    opportunity:
      'Свободные каналы локального трафика: один аккаунт ВК + карточка 2ГИС с фото может закрыть район.',
  },
] as const

const TARIFFS = [
  {
    badge: null,
    name: 'Бесплатно',
    subtitle: 'Пробник, чтобы понять формат',
    price: 'Бесплатно',
    priceHint: '24 часа · Дашборд + email',
    features: [
      '2 конкурента — краткий разбор',
      '2 слабые точки вашего бизнеса',
      '1 идея УТП — тизер',
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
    subtitle: 'Разовый отчёт со стратегией',
    price: '9 999 ₽',
    priceHint: '24 часа · PDF + дашборд + email',
    features: [
      '4–6 конкурентов в полном разборе',
      'Все слабые точки (3–5) с источниками',
      '3 готовых варианта УТП под сегменты',
      'План действий на 30 / 60 / 90 дней',
    ],
    cta: 'Заказать',
    href: '/lead/paid',
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
      'Ежемесячный мониторинг конкурентов',
      'Стратегические сессии с куратором',
      'Управление маркетинговой стратегией',
    ],
    cta: 'Записаться на отбор',
    href: '/lead/retainer',
    goal: 'lead_retainer',
    featured: false,
    note: 'Работаем с 3 компаниями одновременно. Сначала — бесплатный звонок 30 минут, чтобы понять, подходим ли друг другу.',
  },
] as const

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

const FOUNDERS = [
  {
    name: 'Игорь',
    role: 'Маркетолог · Сооснователь',
    photo: '/founder-igor.jpg',
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

const COMPARISON = [
  {
    label: 'Срок от заявки до отчёта',
    them: '2–3 недели',
    us: '24 часа',
  },
  {
    label: 'Ваше время',
    them: 'Интервью 2–3 часа + правки',
    us: 'Анкета 5 минут',
  },
  {
    label: 'Цена',
    them: 'от 60 000 ₽',
    us: '9 999 ₽ (или бесплатный пробник)',
  },
  {
    label: 'Источники фактов',
    them: 'Опыт консультанта',
    us: 'Каждый факт со ссылкой и датой',
  },
  {
    label: 'Сколько конкурентов разбираем',
    them: '2–3, выбирает консультант',
    us: '4–6, выбираете вы или находим сами',
  },
  {
    label: 'Зависит от человека',
    them: 'Да, от одного эксперта',
    us: 'Нет, полная автоматизация',
  },
] as const

const FAQ = [
  {
    q: 'Откуда вы берёте данные о конкурентах?',
    a: 'Публичные источники: сайты конкурентов, их соцсети, поисковая выдача, базы вакансий, картографические сервисы. Никаких внутренних или закрытых данных — мы анализируем то, что и сами клиенты конкурента видят.',
  },
  {
    q: 'А что, если у меня нет списка конкурентов?',
    a: 'Назовите нишу и регион — мы найдём по 4–6 ключевым автоматически. Можно дополнить своим списком, если кого-то знаете.',
  },
  {
    q: 'Что если AI ошибётся?',
    a: 'Каждый факт в отчёте сопровождается источником, датой и оценкой надёжности (5 уровней). Вы сами видите, на чём построен вывод — и можете отбросить недостоверное.',
  },
  {
    q: 'Безопасно ли загружать данные о моём бизнесе?',
    a: 'Данные хранятся в зашифрованной базе на серверах в РФ. Не передаются третьим лицам, не используются для обучения моделей. Можно удалить по запросу.',
  },
  {
    q: 'Чем это отличается от SEO-сервисов вроде Spywords?',
    a: 'Spywords показывает сырые ключевые слова — нужно ещё уметь их интерпретировать. AI-Стратег делает стратегию: что ваш бизнес делает слабо, в чём отстроиться, какое УТП написать на первом экране сайта.',
  },
  {
    q: 'Что такое сопровождение и чем отличается от отчёта?',
    a: 'Разовый отчёт — снимок: смотрим конкурентов, формулируем УТП, даём план на 30/60/90 дней. Этим документом дальше работаете вы или ваш маркетолог. Сопровождение — постоянная работа: каждый месяц мониторим конкурентов и рынок, корректируем стратегию под изменения, участвуем в принятии маркетинговых решений вместе с вами. Это ближе к найму CMO на аутсорс, чем к консультации.',
  },
] as const
