'use client'

// PersonalLinkButton — кнопка, открывающая ссылку на ЛИЧНЫЙ аккаунт провайдера
// (OpenRouter credits, OpenAI usage, YooKassa my, и т.д.) только после ввода
// дополнительного пароля.
//
// Логика:
// 1. Клик → открывается модалка с password input
// 2. Submit → POST /api/admin/personal-link { provider, password }
// 3. Если ok → window.open(data.url, '_blank')
// 4. Если 403 → красное «Неверный код»
// 5. Если 500 → «ADMIN_PERSONAL_LINKS_PASSWORD не выставлен» (помощь админу)
//
// Один и тот же пароль на все провайдеры (ADMIN_PERSONAL_LINKS_PASSWORD на сервере).

import { useState } from 'react'

interface Props {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'yookassa'
  label: string
  className?: string
}

export function PersonalLinkButton({ provider, label, className }: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    if (submitting) return
    setOpen(false)
    setTimeout(() => {
      setPassword('')
      setError(null)
    }, 200)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/personal-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (res.status === 403) {
        setError('Неверный код доступа')
        setSubmitting(false)
        return
      }
      if (!res.ok || !data.url) {
        setError(data.error ?? `HTTP ${res.status}`)
        setSubmitting(false)
        return
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
      setSubmitting(false)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сетевая ошибка')
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'lp-btn-ghost text-xs'}
      >
        🔒 {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={close}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-lg font-bold tracking-[-0.01em]">
                Переход на личный аккаунт
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-[#737373] hover:text-[#0a0a0a] text-xl leading-none shrink-0"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-[#525252] leading-[1.55] mb-4">
              Открыть личный кабинет провайдера{' '}
              <strong className="text-[#0a0a0a]">{provider}</strong>. Введите код доступа.
              <br />
              <span className="text-xs text-[#737373] italic">
                Код — отдельный от пароля админки. Просите у владельца аккаунтов.
              </span>
            </p>

            <form onSubmit={submit}>
              <label className="block mb-3">
                <span className="block text-xs font-medium mb-1.5">Код доступа</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-[#d4d4d4] rounded text-sm focus:outline-none focus:border-[#1e3a8a]"
                  disabled={submitting}
                />
              </label>
              {error && (
                <p className="text-sm text-[#dc2626] bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="lp-btn-ghost flex-1"
                  disabled={submitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="lp-btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting || !password.trim()}
                >
                  {submitting ? 'Проверяем…' : 'Открыть'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
