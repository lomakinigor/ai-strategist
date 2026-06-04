import Link from 'next/link'

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
          <Link href="/intake" className="lp-btn-primary">
            Получить бесплатный разбор
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-[#a3a3a3] mt-5">
            Анкета 5 минут. Без оплаты, без звонков менеджера.
          </p>
        </div>
      </section>

      {/* ── Сценарии боли ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <p className="lp-eyebrow mb-4">Знакомо?</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1]">
              Что вы видите каждый день
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PAIN_SCENARIOS.map((p, i) => (
              <article key={i} className="lp-card p-8">
                <p className="text-3xl font-bold mb-5 text-[#0a0a0a] leading-none">
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
                  <span className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-[0.14em]">
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
          <Link href="/intake" className="lp-btn-primary">
            Запустить разбор
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-[#a3a3a3] mt-5">
            Анкета 5 минут. Без оплаты, без звонков.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#a3a3a3]">
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
