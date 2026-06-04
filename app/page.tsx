import Link from 'next/link'

export const metadata = {
  title: 'AI-Стратег — узнайте, почему клиенты выбирают конкурента',
  description:
    'Анкета 5 минут → AI изучит 4–6 конкурентов → отчёт со слабыми точками вашего бизнеса и готовым УТП. За 24 часа. Без интервью, с источниками.',
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--lp-bg)] text-[var(--lp-text)]">
      {/* ── Навигация ─────────────────────────────────────────────────────── */}
      <nav className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="lp-serif text-xl tracking-tight">
          AI-<span className="lp-em">Стратег</span>
        </Link>
        <Link href="/archive" className="lp-btn-ghost">
          Архив отчётов →
        </Link>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="lp-hero-glow" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-28">
          <div className="flex justify-center mb-9">
            <span className="lp-eyebrow">Для российских компаний</span>
          </div>

          <h1 className="lp-serif text-5xl sm:text-6xl md:text-[68px] leading-[1.08] tracking-tight mb-8 text-center">
            Конкурент рядом{' '}
            <span className="lp-em">забирает</span>{' '}
            ваших клиентов.
            <br />
            За 24 часа покажем&nbsp;— почему.
          </h1>

          <p className="text-lg sm:text-xl text-[var(--lp-text-muted)] max-w-2xl mx-auto leading-[1.65] mb-12 text-center">
            Анкета 5 минут. AI изучит 4–6 ваших конкурентов и пришлёт отчёт со
            слабыми точками вашего бизнеса и готовым УТП. Без интервью, с
            источниками.
          </p>

          <div className="flex flex-col items-center">
            <Link href="/intake" className="lp-btn-primary">
              Получить бесплатный разбор
              <span aria-hidden>→</span>
            </Link>
            <p className="text-sm text-[var(--lp-text-faint)] mt-5">
              Анкета 5 минут. Без оплаты, без звонков менеджера.
            </p>
          </div>
        </div>
      </section>

      <div className="lp-rule" />

      {/* ── Сценарии боли ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="lp-eyebrow mb-5 inline-flex">Знакомо?</span>
          <h2 className="lp-serif text-4xl sm:text-5xl leading-[1.1] tracking-tight mt-5">
            Что вы видите <span className="lp-em">каждый день</span>
          </h2>
        </div>

        <div className="grid gap-7 md:grid-cols-3">
          {PAIN_SCENARIOS.map((p, i) => (
            <article key={i} className="lp-card p-8">
              <p className="lp-serif text-3xl mb-5" style={{ color: p.color }}>
                {p.icon}
              </p>
              <h3 className="lp-serif text-xl leading-snug mb-3 tracking-tight">
                {p.title}
              </h3>
              <p className="text-[15px] text-[var(--lp-text-muted)] leading-[1.65]">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="lp-rule" />

      {/* ── 3 шага метода ─────────────────────────────────────────────────── */}
      <section className="bg-[var(--lp-bg-soft)] border-y border-[var(--lp-border)]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="lp-eyebrow mb-5 inline-flex">Как это работает</span>
            <h2 className="lp-serif text-4xl sm:text-5xl leading-[1.1] tracking-tight mt-5">
              Три шага от анкеты до{' '}
              <span className="lp-em">готового УТП</span>
            </h2>
          </div>

          <div className="grid gap-7 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <article key={i} className="lp-card p-8 bg-white">
                <div className="flex items-baseline gap-4 mb-5">
                  <span className="lp-step-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-medium text-[var(--lp-text-faint)] uppercase tracking-[0.12em]">
                    {s.duration}
                  </span>
                </div>
                <h3 className="lp-serif text-xl mb-3 tracking-tight">{s.title}</h3>
                <p className="text-[15px] text-[var(--lp-text-muted)] leading-[1.65]">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Финальный CTA ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-28 text-center">
        <h2 className="lp-serif text-4xl sm:text-5xl leading-[1.1] tracking-tight mb-6">
          Готовы посмотреть на свой рынок{' '}
          <span className="lp-em">свежим взглядом?</span>
        </h2>
        <p className="text-lg text-[var(--lp-text-muted)] mb-10 max-w-xl mx-auto leading-[1.65]">
          Назовите своих конкурентов или мы найдём их сами. Бесплатный отчёт
          придёт на почту в течение 24&nbsp;часов.
        </p>
        <Link href="/intake" className="lp-btn-primary">
          Запустить разбор
          <span aria-hidden>→</span>
        </Link>
        <p className="text-sm text-[var(--lp-text-faint)] mt-5">
          Анкета 5 минут. Без оплаты, без звонков.
        </p>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--lp-border)]">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[var(--lp-text-faint)]">
            © {new Date().getFullYear()} AI-Стратег. Стратегический анализ для
            российских компаний.
          </p>
        </div>
      </footer>
    </main>
  )
}

const PAIN_SCENARIOS = [
  {
    icon: '↓',
    color: '#b8443e',
    title: 'Снижаете цены, но заявок всё равно меньше, чем у соседа',
    body:
      'Скидки съедают маржу, а клиент всё равно уходит. Значит, дело не в цене — а в том, чего не видно на сайте.',
  },
  {
    icon: '?',
    color: '#8f3530',
    title: 'На сайте «20 лет опыта» — а в чём конкретно вы лучше, не объяснить',
    body:
      'У клиента 5 секунд на первый экран. Без чёткого «почему вы» он уходит к тому, кто сформулировал понятнее.',
  },
  {
    icon: '→',
    color: '#6b5b50',
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
