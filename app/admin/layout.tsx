// Admin-zone layout: общий гард по cookie archive_auth (тот же что у /archive).
// На Этапе 2 заменится на NextAuth-логин — пока используем единый пароль.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AdminNav } from './AdminNav'

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
      <AdminNav />
      {children}
    </div>
  )
}
