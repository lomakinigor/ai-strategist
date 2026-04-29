'use client'

import { useState, useTransition } from 'react'
import { updateFactActiveAction } from './actions'

interface Props {
  jobId: string
  factId: string
  isActive: boolean
}

export function FactToggleButton({ jobId, factId, isActive }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(isActive)

  function handleClick() {
    if (isPending) return
    const next = !optimistic
    setOptimistic(next)

    const formData = new FormData()
    formData.set('jobId', jobId)
    formData.set('factId', factId)
    formData.set('isActive', next ? '1' : '0')

    startTransition(async () => {
      try {
        await updateFactActiveAction(formData)
      } catch {
        setOptimistic(!next) // revert on failure
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={optimistic ? 'Отключить факт' : 'Включить факт'}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer disabled:cursor-wait ${
        optimistic
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-300 hover:border-blue-400'
      }`}
    >
      {isPending ? (
        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : optimistic ? (
        '✓'
      ) : (
        ''
      )}
    </button>
  )
}
