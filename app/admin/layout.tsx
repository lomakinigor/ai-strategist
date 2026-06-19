// Admin-zone layout: общий гард по cookie archive_auth (тот же что у /archive).
// На Этапе 2 заменится на NextAuth-логин — пока используем единый пароль.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'

function checkAuth(): boolean {
  const expected = process.env.ADMIN_ARCHIVE_PASSWORD
  if (!expected) return false
  const cookieVal = cookies().get('archive_auth')?.value
  if (!cookieVal || cookieVal.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < cookieVal.length; i++) {
    diff |= cookieVal.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

export const metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!checkAuth()) {
    redirect('/archive/login')
  }

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      <nav className="border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="text-base font-bold tracking-tight">
            AI-Стратег · admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/costs" className="text-[#525252] hover:text-[#0a0a0a]">
              Стоимости
            </Link>
            <Link href="/admin/usage" className="text-[#525252] hover:text-[#0a0a0a]">
              Использование
            </Link>
            <Link href="/archive" className="text-[#525252] hover:text-[#0a0a0a]">
              Архив отчётов
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
