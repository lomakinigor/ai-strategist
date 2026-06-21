'use client'

// Хоткей Ctrl+Shift+A — открывает admin-панель (/admin/costs).
// Имя файла осталось ArchiveHotkey по историческим причинам — раньше
// вёл на /archive, теперь на admin-панель (откуда есть таб «Архив отчётов»).

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ArchiveHotkey() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        router.push('/admin/costs')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
