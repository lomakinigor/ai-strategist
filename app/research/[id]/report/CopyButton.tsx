'use client'

import { useState } from 'react'

interface CopyButtonProps {
  text: string
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard API unavailable (non-HTTPS or unsupported browser)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
        copied
          ? 'border-green-300 bg-green-50 text-green-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900'
      }`}
    >
      {copied ? '✓ Скопировано' : 'Скопировать стратегию'}
    </button>
  )
}
