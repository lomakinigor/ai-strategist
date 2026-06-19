// Общая admin-навигация. Используется и в /admin/* (через app/admin/layout.tsx),
// и в /archive (т.к. /archive не лежит под /admin layout).

import Link from 'next/link'

export function AdminNav() {
  return (
    <nav className="border-b border-[#e5e5e5] bg-white">
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
  )
}
