// /access?token=<base64url>
// Принимает magic-link токен → проверяет → редиректит на /free-report/[id]
// или /brief/[id] в зависимости от tier артефакта.
//
// Если токена нет / истёк / не найден — рендерит вежливое сообщение со
// ссылкой на главную и предложением запросить новую ссылку.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { verifyMagicLink } from '@/lib/magic-link/tokens'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Доступ к отчёту',
  robots: { index: false, follow: false },
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token?.trim()

  if (!token) {
    return <AccessError reason="not_found" />
  }

  const result = await verifyMagicLink(token)

  if (!result.ok) {
    return <AccessError reason={result.reason} />
  }

  // Маршрутизация по тарифу: free → урезанный view, paid/retainer → полный бриф.
  const target =
    result.tier === 'free'
      ? `/free-report/${result.artifactId}`
      : `/brief/${result.artifactId}`

  redirect(target)
}

function AccessError({ reason }: { reason: 'not_found' | 'expired' }) {
  const title =
    reason === 'expired'
      ? 'Ссылка устарела'
      : 'Ссылка не найдена'

  const body =
    reason === 'expired'
      ? 'Ссылка действовала 30 дней. Запросите новую — мы пришлём её на тот же email.'
      : 'Возможно, ссылку скопировали не полностью или она была удалена. Запросите новую — мы пришлём её на email.'

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a] flex flex-col">
      <nav className="max-w-3xl mx-auto px-6 pt-8 w-full">
        <Link href="/" className="text-base font-bold tracking-tight">
          AI-Стратег
        </Link>
      </nav>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="lp-eyebrow lp-eyebrow-warm mb-4">{title}</p>
          <h1 className="text-3xl font-bold tracking-[-0.02em] leading-[1.15] mb-5">
            {title}
          </h1>
          <p className="text-base text-[#525252] leading-[1.65] mb-10">
            {body}
          </p>
          <Link href="/intake" className="lp-btn-primary">
            Запросить новую ссылку
            <span aria-hidden>→</span>
          </Link>
          <p className="text-sm text-[#a3a3a3] mt-5">
            Через анкету — это быстрее, чем восстанавливать пароль.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-[#a3a3a3]">
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
