import Link from 'next/link'

export const metadata = {
  title: 'AI-Стратег — узнайте, почему клиенты выбирают конкурента',
  description:
    'Анкета 5 минут → AI изучит 4–6 конкурентов → отчёт со слабыми точками вашего бизнеса и готовым УТП. За 24 часа. Без интервью, с источниками.',
}

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0d] text-[#e8e8f0] overflow-hidden">
      <div className="nr-bg-grid" />

      {/* ── Навигация (минимальная) ─────────────────────────────────────────── */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 pt-7 flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight">
          AI-<span className="nr-grad">Стратег</span>
        </Link>
        <Link
          href="/archive"
          className="text-xs text-[#8888a0] hover:text-[#e8e8f0] transition-colors"
        >
          Архив отчётов →
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-28 text-center">
        <p className="nr-eyebrow mb-5 inline-flex items-center gap-2">
          <span className="nr-dot" />
          Стратегический разбор для российских компаний
        </p>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
          Конкурент рядом{' '}
          <span className="nr-grad">забирает ваших клиентов.</span>
          <br />
          За 24 часа покажем — почему.
        </h1>

        <p className="text-lg sm:text-xl text-[#8888a0] max-w-2xl mx-auto leading-relaxed mb-10">
          Анкета 5 минут → AI изучит 4–6 ваших конкурентов → отчёт со слабыми
          точками вашего бизнеса и готовым УТП. Без интервью, с источниками.
        </p>

        <Link
          href="/intake"
          className="nr-btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-lg text-base font-bold"
        >
          Получить бесплатный разбор →
        </Link>
        <p className="text-xs text-[#8888a0] mt-4">
          Анкета 5 минут. Без оплаты, без звонков менеджера.
        </p>
      </section>

      {/* ── Pain Scenarios: «Что вы видите каждый день» ─────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="nr-eyebrow mb-3">01 · Знакомо?</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Что вы видите{' '}
            <span className="nr-grad">каждый день</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PAIN_SCENARIOS.map((p, i) => (
            <div key={i} className="nr-card p-7">
              <div
                className="nr-mono text-3xl mb-4"
                style={{ color: p.color }}
              >
                {p.icon}
              </div>
              <h3 className="text-base font-bold text-[#e8e8f0] leading-snug mb-3">
                {p.title}
              </h3>
              <p className="text-sm text-[#8888a0] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works: 3 шага ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="nr-eyebrow mb-3">02 · Как это работает</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Три шага от анкеты до{' '}
            <span className="nr-grad">готового УТП</span>
          </h2>
        </div>

        <div className="nr-timeline max-w-3xl mx-auto">
          {STEPS.map((s, i) => (
            <div key={i} className="nr-ti">
              <span className="nr-tdot" />
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#00d4aa] mb-2 font-mono">
                Шаг {i + 1} · {s.duration}
              </p>
              <h3 className="text-xl font-bold text-[#e8e8f0] mb-2">{s.title}</h3>
              <p className="text-sm text-[#8888a0] leading-relaxed max-w-xl">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Финальный CTA-блок (заглушка под Коммит 2) ──────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="nr-cta">
          <p className="nr-eyebrow mb-3">Готовы посмотреть на свой рынок свежим взглядом?</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
            Получите <span className="nr-grad">бесплатный разбор</span>
            <br />
            за 24 часа
          </h2>
          <p className="text-sm text-[#8888a0] mb-7 max-w-md mx-auto leading-relaxed">
            Назовите своих конкурентов или мы найдём их сами. Отчёт придёт на
            почту.
          </p>
          <Link
            href="/intake"
            className="nr-cta-hint hover:bg-[#00f5c4] transition-colors"
          >
            Запустить разбор →
          </Link>
        </div>
      </section>

      {/* ── Footer (минимум) ────────────────────────────────────────────────── */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 pb-10 pt-6 border-t border-white/5 text-center">
        <p className="text-xs text-[#44445a]">
          © {new Date().getFullYear()} AI-Стратег. Стратегический анализ для
          российских компаний.
        </p>
      </footer>
    </main>
  )
}

// ─── Контент: сценарии боли (3 шт., конкретно, без «карточек-плейсхолдеров») ──
const PAIN_SCENARIOS = [
  {
    icon: '↓',
    color: '#ff6b6b',
    title: 'Снижаете цены, но заявок всё равно меньше, чем у соседа',
    body:
      'Скидки съедают маржу, а клиент всё равно уходит. Значит, дело не в цене — а в том, чего не видно на сайте.',
  },
  {
    icon: '?',
    color: '#f5a623',
    title: 'На сайте «20 лет опыта» — а в чём конкретно вы лучше, не объяснить',
    body:
      'У клиента 5 секунд на первый экран. Без чёткого «почему вы» он уходит к тому, кто сформулировал понятнее.',
  },
  {
    icon: '→',
    color: '#5b9cf6',
    title: 'Конкурент делает то же самое, но клиенты идут к нему',
    body:
      'Вы оба продаёте «качество». Он просто упаковал предложение так, что в нём узнают свою боль, а в вашем — нет.',
  },
] as const

// ─── Контент: 3 шага метода (без жаргона: никаких «fan-out», «RAG», «RS») ────
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
      'Что у вас слабее, чем у них. Где «белое пятно» — в чём отстроиться. Готовые формулировки УТП под ваши сегменты. План на ближайшие 30/60/90 дней.',
  },
] as const
