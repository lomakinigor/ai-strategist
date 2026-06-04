import Link from 'next/link'

export const metadata = {
  title: 'AI-Стратег — узнайте, почему клиенты выбирают конкурента',
  description:
    'Анкета 5 минут → AI изучит 4–6 конкурентов → отчёт со слабыми точками вашего бизнеса и готовым УТП. За 24 часа. Без интервью, с источниками.',
}

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white text-[#0a1838]">
      {/* ── Навигация ─────────────────────────────────────────────────────── */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 pt-7 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-<span className="lp-grad">Стратег</span>
        </Link>
        <Link href="/archive" className="lp-btn-ghost">
          Архив отчётов →
        </Link>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="lp-hero-glow" />
        <div className="lp-grid" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
          <span className="lp-eyebrow mb-7">
            <span className="lp-eyebrow-dot" />
            Стратегический разбор для российских компаний
          </span>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05] mb-6 text-[#0a1838]">
            Конкурент рядом{' '}
            <span className="lp-grad">забирает ваших клиентов.</span>
            <br />
            За 24 часа покажем — почему.
          </h1>

          <p className="text-lg sm:text-xl text-[#6b7280] max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Анкета 5 минут → AI изучит 4–6 ваших конкурентов → отчёт со слабыми
            точками вашего бизнеса и готовым УТП. Без интервью, с источниками.
          </p>

          <Link href="/intake" className="lp-btn-primary">
            Получить бесплатный разбор
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-[#9ca3af] mt-5">
            Анкета 5 минут. Без оплаты, без звонков менеджера.
          </p>
        </div>
      </section>

      {/* ── Сценарии боли ─────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-sm font-medium text-[#5046e5] mb-3 tracking-wide uppercase">
            Знакомо?
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a1838] leading-tight">
            Что вы видите каждый день
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PAIN_SCENARIOS.map((p, i) => (
            <div key={i} className="lp-card p-7">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                style={{ background: p.bg, color: p.color }}
              >
                <span className="text-2xl font-bold leading-none">{p.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-[#0a1838] leading-snug mb-3 tracking-tight">
                {p.title}
              </h3>
              <p className="text-sm text-[#6b7280] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3 шага метода ─────────────────────────────────────────────────── */}
      <section className="relative bg-[#f8f9fc] border-y border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-[#5046e5] mb-3 tracking-wide uppercase">
              Как это работает
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a1838] leading-tight">
              Три шага от анкеты до готового УТП
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={i} className="lp-card p-7 bg-white">
                <div className="flex items-center gap-3 mb-5">
                  <span className="lp-step-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">
                    {s.duration}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a1838] mb-3 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Финальный CTA ─────────────────────────────────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0a1838] leading-tight mb-5">
          Готовы посмотреть на свой рынок{' '}
          <span className="lp-grad">свежим взглядом?</span>
        </h2>
        <p className="text-base text-[#6b7280] mb-9 max-w-lg mx-auto leading-relaxed">
          Назовите своих конкурентов или мы найдём их сами. Бесплатный отчёт
          придёт на почту в течение 24 часов.
        </p>
        <Link href="/intake" className="lp-btn-primary">
          Запустить разбор
          <span aria-hidden>→</span>
        </Link>
        <p className="text-sm text-[#9ca3af] mt-5">
          Анкета 5 минут. Без оплаты, без звонков.
        </p>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#9ca3af]">
            © {new Date().getFullYear()} AI-Стратег. Стратегический анализ для
            российских компаний.
          </p>
        </div>
      </footer>
    </main>
  )
}

// ─── Контент: 3 конкретных сценария боли (не плейсхолдеры) ────────────────────
const PAIN_SCENARIOS = [
  {
    icon: '↓',
    color: '#dc2626',
    bg: '#fef2f2',
    title: 'Снижаете цены, но заявок всё равно меньше, чем у соседа',
    body:
      'Скидки съедают маржу, а клиент всё равно уходит. Значит, дело не в цене — а в том, чего не видно на сайте.',
  },
  {
    icon: '?',
    color: '#d97706',
    bg: '#fffbeb',
    title: 'На сайте «20 лет опыта» — а в чём конкретно вы лучше, не объяснить',
    body:
      'У клиента 5 секунд на первый экран. Без чёткого «почему вы» он уходит к тому, кто сформулировал понятнее.',
  },
  {
    icon: '→',
    color: '#5046e5',
    bg: '#eef2ff',
    title: 'Конкурент делает то же самое, но клиенты идут к нему',
    body:
      'Вы оба продаёте «качество». Он просто упаковал предложение так, что в нём узнают свою боль, а в вашем — нет.',
  },
] as const

// ─── Контент: 3 шага метода (без жаргона — никаких «fan-out», «RAG», «RS») ───
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
