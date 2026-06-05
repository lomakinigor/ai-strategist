// Email sender — заглушка вместо Resend на текущем этапе.
//
// Поведение: логирует subject + URL ссылки + первые 200 символов HTML в
// серверную консоль (Vercel logs / локальный stdout). Возвращает success.
//
// Когда подключим Resend (отдельная задача после открытия юрлица):
//   1. npm i resend
//   2. RESEND_API_KEY в .env.local + Vercel env vars
//   3. В этом файле раскомментировать импорт и блок Resend, удалить console.log
//   4. EMAIL_FROM в env (например, hello@ai-strategist.ru) — нужен верифицированный
//      домен в Resend dashboard
//
// До этого момента — реальные пользователи получат логи в Vercel, и оператор
// может вручную скопировать magic-link из лога и переслать клиенту до запуска
// автоматики.

import type { RenderedEmail } from './email-template'

export interface SendInput extends RenderedEmail {
  to: string
}

export interface SendResult {
  ok: boolean
  provider: 'stub' | 'resend'
  messageId?: string
  error?: string
}

export async function sendEmail(input: SendInput): Promise<SendResult> {
  // ─── STUB: Resend не подключён ────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    console.log(
      '[email:stub] would send email:',
      JSON.stringify(
        {
          to: input.to,
          subject: input.subject,
          // первые 200 символов HTML для проверки шаблона
          htmlPreview: input.html.slice(0, 200) + '...',
          // полный text — короче, влезает целиком
          text: input.text,
        },
        null,
        2,
      ),
    )
    return { ok: true, provider: 'stub' }
  }

  // ─── Real Resend (раскомментировать после установки пакета) ──────────────
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // const from = process.env.EMAIL_FROM ?? 'AI-Стратег <hello@example.com>'
  // try {
  //   const result = await resend.emails.send({
  //     from,
  //     to: input.to,
  //     subject: input.subject,
  //     html: input.html,
  //     text: input.text,
  //   })
  //   if (result.error) {
  //     return { ok: false, provider: 'resend', error: result.error.message }
  //   }
  //   return { ok: true, provider: 'resend', messageId: result.data?.id }
  // } catch (err) {
  //   return {
  //     ok: false,
  //     provider: 'resend',
  //     error: err instanceof Error ? err.message : String(err),
  //   }
  // }

  // Сейчас фолбэк на stub даже если RESEND_API_KEY есть, пока пакет не
  // установлен. Удалить эти три строки после подключения Resend.
  console.warn('[email:stub] RESEND_API_KEY set, но пакет resend не установлен — fallback to stub')
  return { ok: true, provider: 'stub' }
}
