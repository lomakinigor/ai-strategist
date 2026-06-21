// Защита переходов на ЛИЧНЫЕ аккаунты провайдеров из админки.
// Админку могут смотреть несколько человек (партнёры, наёмные, временный доступ).
// Любой переход на mybilling/personal-dashboard должен идти через дополнительный код,
// который знает только владелец личных аккаунтов.
//
// Требуется env var ADMIN_PERSONAL_LINKS_PASSWORD на Vercel.
// Если не выставлен — endpoint возвращает 500 с понятной ошибкой.
//
// Также: первая защита — cookie admin_archive_auth (логин в админку). Без неё
// endpoint не виден — отсутствие auth = 401.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Whitelist: только эти провайдеры разрешены к переходу. Защита от подмены URL.
const PROVIDER_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/credits',
  openai: 'https://platform.openai.com/usage',
  anthropic: 'https://console.anthropic.com/settings/billing',
  deepseek: 'https://platform.deepseek.com/usage',
  yookassa: 'https://yookassa.ru/my',
}

interface Body {
  provider?: string
  password?: string
}

export async function POST(req: Request) {
  // Layer 1: должен быть залогинен в админку (cookie стоит).
  // Это уже проверяет /admin layout, но дублируем здесь для прямых API вызовов.
  const cookieStore = cookies()
  const authCookie = cookieStore.get('admin_archive_auth')
  if (!authCookie?.value) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Layer 2: проверка отдельного пароля для personal links.
  const adminPersonalPassword = process.env.ADMIN_PERSONAL_LINKS_PASSWORD
  if (!adminPersonalPassword) {
    return NextResponse.json(
      {
        error: 'ADMIN_PERSONAL_LINKS_PASSWORD не выставлен на сервере. Выставь env переменную на Vercel.',
      },
      { status: 500 },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const provider = (body.provider ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  const url = PROVIDER_URLS[provider]
  if (!url) {
    return NextResponse.json({ error: 'unknown_provider' }, { status: 400 })
  }

  if (password !== adminPersonalPassword) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, url })
}
