import Link from 'next/link'

export const metadata = {
  title: 'Страница не найдена — AI-Стратег',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-[#0a0a0a] flex flex-col">
      <nav className="max-w-3xl mx-auto px-6 pt-8 w-full">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
      </nav>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="lp-eyebrow mb-4">404</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.025em] leading-[1.1] mb-5">
            Такой страницы нет
          </h1>
          <p className="text-base text-[#525252] leading-[1.65] mb-10">
            Возможно, вы перешли по устаревшей ссылке или ошиблись в адресе.
            Вернитесь на главную или сразу попробуйте бесплатный разбор.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link href="/" className="lp-btn-primary">
              На главную
              <span aria-hidden>→</span>
            </Link>
            <Link href="/intake" className="lp-btn-secondary">
              Бесплатный разбор
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-[#6b7280]">
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
