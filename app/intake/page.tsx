import Link from 'next/link'
import IntakeForm from './IntakeForm'

export const metadata = {
  title: 'Новое исследование — AI-Стратег',
}

export default function IntakePage() {
  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <nav className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
        <Link href="/" className="lp-btn-ghost">
          ← На главную
        </Link>
      </nav>

      <section className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        <p className="lp-eyebrow mb-4">Бесплатный пробник</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
          Расскажите о своём бизнесе
        </h1>
        <p className="text-base text-[#525252] leading-[1.6] mb-10">
          Анкета 5 минут. Можно вставить любой текст о компании в первое поле — AI
          сам разберёт и заполнит остальное.
        </p>

        <IntakeForm />

        <p className="text-xs text-[#6b7280] mt-6 leading-[1.6]">
          После отправки запустим параллельное исследование по 4 направлениям:
          бизнес, рынок, аудитория, конкуренты. Ссылка на готовый отчёт придёт на
          указанный email в течение 24 часов.
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
