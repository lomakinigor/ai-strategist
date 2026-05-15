'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ArchiveHotkey() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        router.push('/archive')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
