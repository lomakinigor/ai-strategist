import { NextRequest, NextResponse } from 'next/server'

const RF_CHANNELS = [
  'ВКонтакте', 'Telegram', 'YouTube', 'Instagram',
  'TikTok', 'Одноклассники', 'Яндекс.Дзен', 'Авито', 'MAX',
]

// Flash variant has much higher throughput limits and is more than enough for JSON extraction.
const PARSE_MODEL = process.env.OPENROUTER_PARSE_MODEL ?? 'deepseek/deepseek-v4-flash'

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>
}

const PARSE_SCHEMA = {
  type: 'object',
  properties: {
    company_name: { type: 'string' },
    industry: { type: 'string' },
    description: { type: 'string' },
    website: { type: 'string' },
    goals: { type: 'string' },
    competitors: { type: 'string' },
    channel_urls: { type: 'array', items: { type: 'string' } },
    channels: { type: 'array', items: { type: 'string' } },
  },
  required: ['company_name', 'industry', 'description', 'website', 'goals', 'competitors', 'channel_urls', 'channels'],
  additionalProperties: false,
} as const

async function callOpenRouterParse(text: string, attempt = 1): Promise<Response> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://ai-strategist-bice.vercel.app',
      'X-Title': 'ai-strategist',
    },
    body: JSON.stringify({
      model: PARSE_MODEL,
      max_tokens: 4096,
      // Allow OpenRouter to fall back across providers (Together, DeepSeek-direct, Fireworks, etc.)
      provider: { allow_fallbacks: true, sort: 'throughput' },
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'company_data', strict: true, schema: PARSE_SCHEMA },
      },
      messages: [
        {
          role: 'system',
          content: `Ты извлекаешь структурированные данные о компании из произвольного текста. Заполняй ВСЕ поля схемы, даже если ставишь пустую строку или пустой массив.

Правила для channel_urls:
- Извлекай ВСЕ ссылки на каналы присутствия: https://t.me/..., https://vk.com/..., https://linku.su/..., https://youtube.com/... и подобные
- Telegram-хендлы вида @имя_бота или @канал — преобразуй в полный URL https://t.me/имя_бота (без @)
- Включай и каналы, и боты, и чаты, и агрегаторы ссылок
- НЕ включай основной сайт компании (он идёт в поле website)`,
        },
        {
          role: 'user',
          content: `Извлеки информацию о компании. channel_urls — ВСЕ ссылки на каналы (Telegram-каналы, боты, чаты, ВКонтакте, YouTube, агрегаторы), включая Telegram-хендлы вида @имя (преобразуй их в https://t.me/имя). channels — только названия из списка: ${RF_CHANNELS.join(', ')}.

Текст:
${text}`,
        },
      ],
    }),
  })

  // Retry on 503 / 429 with exponential backoff (max 3 attempts total)
  if ((response.status === 503 || response.status === 429) && attempt < 3) {
    const delay = 1500 * attempt
    await new Promise((r) => setTimeout(r, delay))
    return callOpenRouterParse(text, attempt + 1)
  }
  return response
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'no_key' }, { status: 503 })
  }

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({})

  try {
    const response = await callOpenRouterParse(text)

    if (!response.ok) {
      const errText = await response.text()
      console.error('[parse-context] OpenRouter error', response.status, errText)
      const code = response.status === 503 || response.status === 429 ? 'provider_unavailable' : 'api_error'
      return NextResponse.json({ error: code, detail: errText, status: response.status }, { status: 500 })
    }

    const data = (await response.json()) as OpenRouterResponse
    const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
    console.log('[parse-context] raw response (first 800):', raw.slice(0, 800))

    // Strip reasoning wrappers some models emit (<think>…</think>) and markdown fences
    const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    const noFence = noThink.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

    // Extract JSON object between first { and last } — robust to surrounding prose
    const firstBrace = noFence.indexOf('{')
    const lastBrace = noFence.lastIndexOf('}')
    const jsonStr = firstBrace >= 0 && lastBrace > firstBrace ? noFence.slice(firstBrace, lastBrace + 1) : '{}'

    try {
      const parsed = JSON.parse(jsonStr)
      return NextResponse.json(parsed)
    } catch (parseErr) {
      console.error('[parse-context] JSON parse failed. raw:', raw.slice(0, 500))
      return NextResponse.json({ error: 'parse_failed', raw: raw.slice(0, 200) }, { status: 500 })
    }
  } catch (err) {
    console.error('[parse-context] unexpected error', err)
    return NextResponse.json({ error: true }, { status: 500 })
  }
}
