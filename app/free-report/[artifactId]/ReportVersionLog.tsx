'use client'

import { useEffect } from 'react'

// Лог версии отчёта в консоль — для отладки. Только в DevTools, не в UI.
export function ReportVersionLog({ version }: { version: 'v1' | 'v2' }) {
  useEffect(() => {
    console.log(`Report version: ${version}`)
  }, [version])
  return null
}
