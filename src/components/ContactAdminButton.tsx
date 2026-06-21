'use client'

// Глобальная кнопка «Написать админу» — в правом нижнем углу на всех страницах.
// Кликаем → открывается модалка: контакт (опционально) + сообщение (обязательно).
// Submit → POST /api/contact-admin → пушится в TG-группу админа.
//
// На /admin/* НЕ показывается — там и так навигация админская, кнопки клиента
// не нужны (и могут смутить если админ показывает экран другому человеку).
//
// Класс no-print — кнопка и модалка не попадают в PDF при window.print().

import { useState } from 'react'
import { usePathname } from 'next/navigation'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function ContactAdminButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // На админ-страницах кнопки клиента не показываем (включая 🔐 — там и так нав
  // ведёт в админ-разделы, кнопка избыточна и может смутить если экран показывают
  // другому человеку).
  if (pathname?.startsWith('/admin')) {
    return null
  }

  const close = () => {
    if (status === 'sending') return
    setOpen(false)
    // не сбрасываем поля сразу — даём анимации закончиться
    setTimeout(() => {
      setStatus('idle')
      setErrorMsg(null)
      if (status === 'sent') {
        setContact('')
        setMessage('')
      }
    }, 200)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setErrorMsg('Напишите сообщение')
      return
    }
    setStatus('sending')
    setErrorMsg(null)
    try {
      const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
      const res = await fetch('/api/contact-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, message, pageUrl }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Сетевая ошибка')
    }
  }

  return (
    <>
      {/* Floating button — bottom-right (для клиента) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-6 right-6 z-40 bg-[#1e3a8a] text-white rounded-full shadow-lg hover:bg-[#1e40af] transition-colors px-5 py-3 flex items-center gap-2 text-sm font-medium"
        aria-label="Написать админу"
      >
        <span aria-hidden>💬</span>
        <span className="hidden sm:inline">Написать админу</span>
      </button>

      {/* Скрытая админ-ссылка — bottom-left, неприметная для клиента.
          Архив доступен через скрытую кнопку справа от логотипа или по
          этой ссылке. Не привлекает внимание клиентов, но всегда под рукой
          у админа на любой странице. */}
      <a
        href="/admin/costs"
        className="no-print fixed bottom-6 left-6 z-40 bg-white border border-[#e5e5e5] text-[#525252] hover:text-[#0a0a0a] hover:border-[#0a0a0a] transition-colors rounded-full shadow-sm w-10 h-10 flex items-center justify-center text-base"
        title="Админ-панель"
        aria-label="Админ-панель"
      >
        🔐
      </a>

      {/* Modal */}
      {open && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 py-6"
          onClick={close}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-admin-title"
          >
            {status === 'sent' ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-3" aria-hidden>
                  ✅
                </p>
                <h2 className="text-xl font-bold mb-2 tracking-[-0.01em]">Отправлено</h2>
                <p className="text-sm text-[#525252] leading-[1.6] mb-6">
                  {contact
                    ? 'Ответим в течение часа.'
                    : 'Сообщение получено. Если хотели получить ответ — в следующий раз оставьте контакт 🙂'}
                </p>
                <button type="button" onClick={close} className="lp-btn-primary">
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 id="contact-admin-title" className="text-xl font-bold tracking-[-0.01em]">
                    Написать админу
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
                <p className="text-sm text-[#525252] leading-[1.55] mb-5">
                  Вопрос по отчёту, баг, возврат денег или просто связь — напишите. Чтобы ответить,
                  нам нужен ваш контакт.
                </p>

                <label className="block mb-4">
                  <span className="block text-sm font-medium mb-1.5">
                    Ваш контакт{' '}
                    <span className="text-[#737373] font-normal text-xs">
                      (Telegram, телефон или email) — нужен чтобы ответить
                    </span>
                  </span>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="@username, +7 999 123-45-67 или you@mail.ru"
                    className="w-full px-3 py-2 border border-[#d4d4d4] rounded text-sm focus:outline-none focus:border-[#1e3a8a]"
                    disabled={status === 'sending'}
                  />
                </label>

                <label className="block mb-2">
                  <span className="block text-sm font-medium mb-1.5">
                    Сообщение <span className="text-[#dc2626]">*</span>
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                    placeholder="Что хотите сказать или спросить?"
                    className="w-full px-3 py-2 border border-[#d4d4d4] rounded text-sm focus:outline-none focus:border-[#1e3a8a] resize-y"
                    disabled={status === 'sending'}
                  />
                </label>

                {errorMsg && (
                  <p className="text-sm text-[#dc2626] bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
                    {errorMsg}
                  </p>
                )}

                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={close}
                    className="lp-btn-ghost flex-1"
                    disabled={status === 'sending'}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="lp-btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={status === 'sending' || !message.trim()}
                  >
                    {status === 'sending' ? 'Отправляем…' : 'Отправить'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
