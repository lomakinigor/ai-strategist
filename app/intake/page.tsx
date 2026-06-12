import Link from 'next/link'
import IntakeForm from './IntakeForm'
import OpenIntakeGoal from './OpenIntakeGoal'

export const metadata = {
  title: 'Новое исследование — AI-Стратег',
}

export default function IntakePage({
  searchParams,
}: {
  searchParams?: { tier?: string }
}) {
  // tier из URL: ?tier=paid → платный полный отчёт (через QR-оплату).
  // Любое другое значение / отсутствие → free (бесплатный пробник).
  const tier: 'free' | 'paid' = searchParams?.tier === 'paid' ? 'paid' : 'free'
  const isPaid = tier === 'paid'

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <OpenIntakeGoal />
      <nav className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        <Link href="/" className="lp-btn-ghost">
          ← На главную
        </Link>
      </nav>

      <section className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        <p className="lp-eyebrow mb-4">
          {isPaid ? 'Полный отчёт — 9 999 ₽' : 'Бесплатный пробник'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
          Расскажите о своём бизнесе
        </h1>
        <p className="text-base text-[#525252] leading-[1.6] mb-10">
          Три коротких шага: бизнес, рынок, запуск. Можно вставить любой текст о
          компании в первое поле первого шага — AI сам разберёт и заполнит
          остальное.
        </p>

        <IntakeForm tier={tier} />

        <p className="text-xs text-[#6b7280] mt-6 leading-[1.6]">
          {isPaid
            ? 'После отправки откроется страница оплаты с QR-кодом. Когда мы получим оплату — запустим параллельное исследование по 4 направлениям. Отчёт откроется в браузере на этой же странице — никуда не уйдёт.'
            : 'После отправки запустим параллельное исследование по 4 направлениям: бизнес, рынок, аудитория, конкуренты. Краткий отчёт откроется в браузере, как только будет готов — никуда не уйдёт.'}
        </p>
      </section>

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-2xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-[#6b7280]">
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
