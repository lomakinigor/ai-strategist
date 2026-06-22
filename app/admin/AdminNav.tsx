'use client'

// Общая admin-навигация. Используется и в /admin/* (через app/admin/layout.tsx),
// и в /archive (т.к. /archive не лежит под /admin layout).
// Client component — usePathname() для подсветки активной вкладки.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/costs', label: 'Стоимости' },
  { href: '/admin/usage', label: 'Использование' },
  { href: '/admin/leads', label: 'Лиды' },
  { href: '/archive', label: 'Архив отчётов' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="border-b border-[#e5e5e5] bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-medium text-[#525252] hover:text-[#0a0a0a] flex items-center gap-1 border border-[#e5e5e5] rounded px-2 py-1 hover:border-[#0a0a0a] transition-colors"
            title="Вернуться на основной сайт"
          >
            <span aria-hidden>←</span>
            <span>На сайт</span>
          </Link>
          <Link href="/admin/costs" className="text-base font-bold tracking-tight">
            AI-Стратег · admin
          </Link>
        </div>
        <div className="flex items-center gap-1 text-sm flex-wrap">
          {TABS.map((tab) => {
            // /archive имеет sub-routes (/archive/[id]) — startsWith ловит и их.
            // /admin/costs точно совпадает чтобы /admin/costs/something не подсвечивало.
            const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  isActive
                    ? 'text-[#1e3a8a] font-bold bg-[#eff6ff] px-3 py-1.5 rounded transition-colors'
                    : 'text-[#525252] hover:text-[#0a0a0a] px-3 py-1.5 rounded hover:bg-[#fafafa] transition-colors'
                }
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
