'use client'

import { useState, useCallback } from 'react'
import type { BriefReportBlock } from '@/lib/strategy/brief'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface State {
  status: Status
  brief: BriefReportBlock | null
  error: string | null
}

export function useGenerateBrief(artifactId: string, initialBrief: BriefReportBlock | null) {
  const [state, setState] = useState<State>({
    status: initialBrief ? 'success' : 'idle',
    brief: initialBrief,
    error: null,
  })

  const generate = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const res = await fetch(`/api/brief/${artifactId}`, { method: 'POST' })
      const data = (await res.json()) as { brief?: BriefReportBlock; error?: string }
      if (!res.ok || !data.brief) {
        setState({ status: 'error', brief: null, error: data.error ?? 'Ошибка генерации' })
        return
      }
      setState({ status: 'success', brief: data.brief, error: null })
    } catch {
      setState({ status: 'error', brief: null, error: 'Сетевая ошибка. Попробуйте ещё раз.' })
    }
  }, [artifactId])

  return { ...state, generate }
}
