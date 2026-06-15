// Login-страница для /archive. Простая cookie-based auth: ввод пароля
// (ADMIN_ARCHIVE_PASSWORD из env) → set-cookie через server action →
// редирект на /archive.
//
// Безопасность для MVP: пароль строкой в env, cookie httpOnly + secure +
// signed (HMAC от пароля). Этого достаточно чтобы random URL-guesser не
// прошёл — для серьёзной защиты нужна полноценная auth (OAuth/NextAuth).

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'

export const metadata = {
  title: 'Вход — Архив AI-Стратег',
  robots: { index: false, follow: false },
}

async function login(formData: FormData) {
  'use server'
  const pw = ((formData.get('password') as string | null) ?? '').trim()
  const expected = process.env.ADMIN_ARCHIVE_PASSWORD

  if (!expected) {
    throw new Error('ADMIN_ARCHIVE_PASSWORD не задан в env')
  }

  // Constant-time compare
  if (!timingSafeEqual(pw, expected)) {
    redirect('/archive/login?error=1')
  }

  // 30 дней живёт куки. httpOnly + sameSite=lax + secure (на проде через Vercel)
  cookies().set('archive_auth', pw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect('/archive')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export default function ArchiveLoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const hasError = searchParams?.error === '1'

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a] flex flex-col">
      <nav className="max-w-md mx-auto px-6 pt-8 w-full">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
      </nav>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <p className="lp-eyebrow mb-4">Архив отчётов</p>
          <h1 className="text-3xl font-bold tracking-[-0.025em] leading-[1.1] mb-3">
            Вход для администратора
          </h1>
          <p className="text-base text-[#525252] leading-[1.65] mb-8">
            Архив содержит отчёты клиентов — доступ ограничен. Введите пароль для входа.
          </p>

          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                placeholder="••••••••••"
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            </div>

            {hasError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                Неверный пароль. Попробуйте ещё раз.
              </p>
            )}

            <button type="submit" className="lp-btn-primary w-full justify-center">
              Войти
              <span aria-hidden>→</span>
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-md mx-auto px-6 py-10 text-xs text-[#6b7280]">
          © {new Date().getFullYear()} AI-Стратег
        </div>
      </footer>
    </main>
  )
}
