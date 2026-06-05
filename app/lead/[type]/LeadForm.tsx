'use client'

import { useState } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LeadFormProps {
  type: 'paid' | 'retainer'
  successTitle: string
  successBody: string
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function LeadForm({ type, successTitle, successBody }: LeadFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canSubmit =
    status !== 'submitting' &&
    name.trim().length >= 2 &&
    EMAIL_REGEX.test(email.trim()) &&
    consent

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setStatus('submitting')

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          message: message.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'unknown_error')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'unknown_error')
    }
  }

  if (status === 'success') {
    return (
      <div className="lp-card p-8 border-2 border-[#1e3a8a]">
        <p className="lp-eyebrow mb-3">Готово</p>
        <h2 className="text-2xl font-bold tracking-[-0.02em] mb-4">{successTitle}</h2>
        <p className="text-[15px] text-[#525252] leading-[1.65]">{successBody}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        label="Ваше имя"
        required
        type="text"
        value={name}
        onChange={setName}
        placeholder="Иван Иванов"
      />
      <Field
        label="Email"
        required
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@company.ru"
      />
      <Field
        label="Телефон"
        type="tel"
        value={phone}
        onChange={setPhone}
        placeholder="+7 ..."
      />
      <Field
        label="Компания"
        type="text"
        value={company}
        onChange={setCompany}
        placeholder={type === 'retainer' ? 'Обязательно для собеседования' : 'Необязательно'}
      />

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          {type === 'retainer' ? 'Кратко о бизнесе и целях' : 'Комментарий (необязательно)'}
        </label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === 'retainer'
              ? 'Чем занимаетесь, ключевые цели на ближайшие 6 месяцев, что уже пробовали'
              : 'Если есть вопросы или особые условия'
          }
          className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
        />
      </div>

      {/* 152-ФЗ согласие — обязательно */}
      <div className="rounded-md border border-[#e5e5e5] bg-[#fafafa] px-4 py-3">
        <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a] mt-0.5 cursor-pointer shrink-0"
          />
          <span className="text-[#374151] leading-snug">
            Согласен на обработку персональных данных в соответствии с{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1e3a8a] underline"
            >
              Политикой
            </a>{' '}
            и принимаю условия{' '}
            <a
              href="/offer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1e3a8a] underline"
            >
              публичной оферты
            </a>
            .
          </span>
        </label>
      </div>

      {/* Turnstile placeholder — рендерится только когда задан site-key */}
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <div className="text-xs text-[#6b7280]">
          Антибот-защита Cloudflare Turnstile (в разработке).
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="lp-btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Отправляю…' : 'Отправить заявку'}
        <span aria-hidden>→</span>
      </button>

      {status === 'error' && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          Не удалось отправить: {errorMsg}. Попробуйте ещё раз или напишите нам напрямую.
        </p>
      )}
    </form>
  )
}

function Field({
  label,
  required,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string
  required?: boolean
  type: 'text' | 'email' | 'tel'
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#374151] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
      />
    </div>
  )
}
