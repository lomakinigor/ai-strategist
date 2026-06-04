import { NextRequest, NextResponse } from 'next/server'

const RF_CHANNELS = [
  'ВКонтакте', 'Telegram', 'YouTube', 'Instagram',
  'TikTok', 'Одноклассники', 'Яндекс.Дзен', 'Авито', 'MAX',
]

// Канонический список рекламных каналов intake-чеклиста (должен совпадать с AD_CHANNEL_OPTIONS формы).
const AD_CHANNELS = [
  'Яндекс.Директ', 'Авито', 'SEO', 'ВКонтакте',
  'Telegram', '2ГИС/Карты', 'Email-рассылка', 'Выставки/тендеры',
]

// Каскад моделей: дешёвый primary → надёжный fallback на пустой/невалидный результат.
// Primary: DeepSeek V4 Pro — хорош на коротком/чистом вводе.
// Fallback: Claude Sonnet 4.6 — надёжно тащит длинные Q&A-интервью на русском.
const PARSE_MODEL = process.env.OPENROUTER_PARSE_MODEL ?? 'deepseek/deepseek-v4-pro'
const PARSE_FALLBACK_MODEL = process.env.OPENROUTER_PARSE_FALLBACK_MODEL ?? 'anthropic/claude-sonnet-4.6'

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>
}

const SYSTEM_PROMPT = `Ты извлекаешь структурированные данные о компании из произвольного текста и возвращаешь СТРОГО один JSON-объект без префиксов и пояснений.

Текст может быть в любой форме: краткое описание, КП, лендинг, интервью с владельцем в формате «Вопрос-Ответ». В Q&A-интервью извлекай данные ИМЕННО ИЗ ОТВЕТОВ (после слова «Ответ:» или после знака вопроса) — внимательно читай ВСЕ ответы.

Обязательные поля (заполняй ВСЕ, даже пустыми строками или пустыми массивами):
- company_name: string — название компании (часто звучит как «наша компания называется …» / «Группа … "X"» / «ООО …»)
- industry: string — отрасль/ниша (юриспруденция / производство / e-commerce / B2B SaaS и т.п.)
- description: string — краткое описание бизнеса (что делает, для кого; 1–3 предложения)
- website: string — основной сайт компании (URL или пустая строка)
- goals: string — цель исследования или стратегии (для чего нужен сайт/анализ)
- competitors: string — список конкурентов через запятую (имена компаний, упомянутые как конкуренты)
- channel_urls: string[] — ВСЕ ссылки на каналы присутствия
- channels: string[] — названия каналов из заданного списка
- directions: string[] — направления деятельности (разные продукты/услуги/ниши). Если их несколько и они РАЗНЫЕ — каждое отдельным элементом.
- ad_channels: string[] — рекламные каналы, которые компания УЖЕ использует ИЛИ планирует использовать. ТОЛЬКО канонические названия из списка ниже; синонимы приводи к ним (Директ → Яндекс.Директ; 2GIS / 2ГИС / карты → 2ГИС/Карты; Телеграм → Telegram; почтовая рассылка → Email-рассылка; тендеры → Выставки/тендеры). Канал, которого нет в тексте, НЕ добавляй.

Правила для channel_urls:
- Включай: https://t.me/..., https://vk.com/..., https://linku.su/..., https://youtube.com/... и любые ссылки на каналы/боты/чаты/агрегаторы
- Telegram-хендлы вида @имя_бота или @канал — преобразуй в https://t.me/имя_бота (без @)
- НЕ включай основной сайт компании (он идёт в поле website)

Если поля нет в тексте — оставь "" или [], НЕ выдумывай.`

async function callOpenRouterParse(text: string, model: string, attempt = 1): Promise<Response> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://ai-strategist-bice.vercel.app',
      'X-Title': 'ai-strategist',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      provider: { allow_fallbacks: true, sort: 'throughput' },
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Извлеки информацию о компании. channel_urls — ВСЕ ссылки на каналы (Telegram-каналы, боты, чаты, ВКонтакте, YouTube, агрегаторы), включая Telegram-хендлы вида @имя (преобразуй их в https://t.me/имя). channels — только названия из списка: ${RF_CHANNELS.join(', ')}. ad_channels — только канонические названия рекламных каналов из списка: ${AD_CHANNELS.join(', ')}.

Верни ТОЛЬКО JSON-объект, без markdown-обрамления и комментариев.

Текст:
${text}`,
        },
      ],
    }),
  })

  // Retry on 503 / 429 with exponential backoff (max 3 attempts total).
  if ((response.status === 503 || response.status === 429) && attempt < 3) {
    const delay = 1500 * attempt
    await new Promise((r) => setTimeout(r, delay))
    return callOpenRouterParse(text, model, attempt + 1)
  }
  return response
}

// Извлечь JSON-объект из произвольного ответа модели (страхуем от <think>…</think>,
// markdown-обёрток и текстовых пояснений до/после JSON).
function extractJson(raw: string): Record<string, unknown> | null {
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const noFence = noThink.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const firstBrace = noFence.indexOf('{')
  const lastBrace = noFence.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace <= firstBrace) return null
  try {
    return JSON.parse(noFence.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

// Количество непустых полей в распарсенном объекте — гейт fallback'а.
function countNonEmpty(parsed: Record<string, unknown>): number {
  return Object.keys(parsed).filter((k) => {
    const v = parsed[k]
    return Array.isArray(v) ? v.length > 0 : Boolean(v)
  }).length
}

interface ParseAttempt {
  parsed: Record<string, unknown> | null
  rawHead: string // первые 300 символов raw-ответа для логов
  errorDetail: string | null
}

async function tryParseOnce(text: string, model: string): Promise<ParseAttempt> {
  const response = await callOpenRouterParse(text, model)
  if (!response.ok) {
    const errText = await response.text()
    return { parsed: null, rawHead: '', errorDetail: `HTTP ${response.status}: ${errText.slice(0, 200)}` }
  }
  const data = (await response.json()) as OpenRouterResponse & { error?: { message?: string } }
  if (!data.choices?.length) {
    return { parsed: null, rawHead: '', errorDetail: data.error?.message ?? 'no_choices' }
  }
  const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
  const parsed = extractJson(raw)
  return { parsed, rawHead: raw.slice(0, 300), errorDetail: parsed ? null : 'json_extract_failed' }
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 })
  }

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({})

  try {
    // Попытка 1: primary (дешёвый).
    const primary = await tryParseOnce(text, PARSE_MODEL)
    const primaryCount = primary.parsed ? countNonEmpty(primary.parsed) : 0
    console.log(
      `[parse-context] primary=${PARSE_MODEL} inputChars=${text.length} fields=${primaryCount} ok=${Boolean(primary.parsed)} err=${primary.errorDetail ?? '-'}`,
    )

    if (primary.parsed && primaryCount > 0) {
      return NextResponse.json(primary.parsed)
    }

    // Попытка 2: fallback (надёжный, для длинных Q&A на русском).
    if (PARSE_FALLBACK_MODEL && PARSE_FALLBACK_MODEL !== PARSE_MODEL) {
      console.warn(
        `[parse-context] primary returned empty/invalid → fallback to ${PARSE_FALLBACK_MODEL}. primary raw head:`,
        primary.rawHead || '(no content)',
      )
      const fb = await tryParseOnce(text, PARSE_FALLBACK_MODEL)
      const fbCount = fb.parsed ? countNonEmpty(fb.parsed) : 0
      console.log(
        `[parse-context] fallback=${PARSE_FALLBACK_MODEL} fields=${fbCount} ok=${Boolean(fb.parsed)} err=${fb.errorDetail ?? '-'}`,
      )
      if (fb.parsed) {
        if (fbCount === 0) {
          console.warn('[parse-context] fallback also empty. fb raw head:', fb.rawHead)
        }
        return NextResponse.json(fb.parsed)
      }
      // Fallback тоже не парсится → отдаём primary (пустой), чтобы клиент показал «AI не нашёл данных»
      return NextResponse.json(primary.parsed ?? {})
    }

    return NextResponse.json(primary.parsed ?? {})
  } catch (err) {
    console.error('[parse-context] unexpected error', err)
    return NextResponse.json({ error: true }, { status: 500 })
  }
}
