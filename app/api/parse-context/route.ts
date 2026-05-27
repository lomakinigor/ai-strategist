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

// Pro variant for intake parsing — stronger extraction quality on messy free-text input.
// (Fluid Compute lifted the 300s limit, so Pro's longer latency is no longer a 504 risk.)
const PARSE_MODEL = process.env.OPENROUTER_PARSE_MODEL ?? 'deepseek/deepseek-v4-pro'

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>
}

// Use json_object mode (universally supported) instead of json_schema:
// some OpenRouter providers translate json_schema into a non-standard shape that
// then fails their own validators. We describe the expected fields in the prompt.
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
      provider: { allow_fallbacks: true, sort: 'throughput' },
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты извлекаешь структурированные данные о компании из произвольного текста и возвращаешь СТРОГО один JSON-объект без префиксов и пояснений.

Обязательные поля (заполняй ВСЕ, даже пустыми строками или пустыми массивами):
- company_name: string — название компании
- industry: string — отрасль/ниша
- description: string — краткое описание бизнеса
- website: string — основной сайт компании (URL или пустая строка)
- goals: string — цель исследования или стратегии
- competitors: string — список конкурентов через запятую
- channel_urls: string[] — ВСЕ ссылки на каналы присутствия
- channels: string[] — названия каналов из заданного списка
- directions: string[] — направления деятельности компании (разные продукты/услуги/ниши). Если их несколько и они РАЗНЫЕ — каждое отдельным элементом, НЕ склеивай в одно.
- ad_channels: string[] — рекламные каналы, которые компания УЖЕ использует ИЛИ планирует использовать для продвижения. ТОЛЬКО канонические названия из списка ниже; синонимы приводи к ним (Директ → Яндекс.Директ; 2GIS / 2ГИС / карты → 2ГИС/Карты; Телеграм → Telegram; почтовая рассылка → Email-рассылка; тендеры → Выставки/тендеры). Канал, которого нет в тексте, НЕ добавляй.

Правила для channel_urls:
- Включай: https://t.me/..., https://vk.com/..., https://linku.su/..., https://youtube.com/... и любые другие ссылки на каналы/боты/чаты/агрегаторы
- Telegram-хендлы вида @имя_бота или @канал — преобразуй в полный URL https://t.me/имя_бота (без @)
- НЕ включай основной сайт компании (он идёт в поле website)`,
        },
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

    const data = (await response.json()) as OpenRouterResponse & { error?: { message?: string; code?: number } }

    if (!data.choices || data.choices.length === 0) {
      console.error('[parse-context] no choices in response. body:', JSON.stringify(data).slice(0, 1000))
      const detail = data.error?.message ?? 'OpenRouter не вернул ответа (возможно фильтр контента или таймаут провайдера).'
      return NextResponse.json({ error: 'no_choices', detail }, { status: 500 })
    }

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
