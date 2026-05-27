// Один дешёвый LLM-проход по тексту страниц сайта → грунтованные ФАКТЫ.
// Только то, что ЯВНО на страницах (анти-домысел). Источник — URL страницы, RS:4.

import { AI_CONFIG } from '@/lib/ai/config'
import type { RawDataPoint } from '@/lib/types'

export interface CrawledPage {
  url: string
  title: string
  text: string
}

const SYSTEM = `Ты извлекаешь ФАКТЫ о компании со страниц её ОФИЦИАЛЬНОГО сайта.
СТРОГО: только то, что ЯВНО написано на страницах. НЕ додумывай, НЕ обобщай сверх текста.
Верни СТРОГО JSON без markdown:
{ "facts": [ { "text": "краткий факт на русском", "source_url": "URL страницы, откуда взято" } ] }
Категории интереса: услуги/продукты; клиенты и референсы (named); кейсы/результаты с цифрами; отзывы/благодарности; опыт/стаж/награды/лицензии/членства; направления деятельности (если их несколько и они РАЗНЫЕ — раздельно, не склеивать).
source_url бери ТОЛЬКО из заголовка «=== СТРАНИЦА: <url> ===» над соответствующим текстом.
Если фактов нет — верни { "facts": [] }. Максимум 25 фактов.`

interface ORChatResponse {
  choices: Array<{ message: { content: string } }>
}

export async function extractSiteFacts(pages: CrawledPage[]): Promise<RawDataPoint[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || pages.length === 0) return []

  const today = new Date().toISOString().slice(0, 10)
  const validUrls = new Set(pages.map((p) => p.url))
  const corpus = pages
    .map((p) => `=== СТРАНИЦА: ${p.url} ===\n${p.title ? p.title + '\n' : ''}${p.text}`)
    .join('\n\n')

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'ai-strategist-site-crawl',
      },
      body: JSON.stringify({
        model: AI_CONFIG.strategy.defaultModel,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        provider: { allow_fallbacks: true, sort: 'throughput' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Страницы сайта клиента:\n\n${corpus}` },
        ],
      }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as ORChatResponse
    const content = data.choices?.[0]?.message?.content ?? ''
    const parsed = JSON.parse(content) as { facts?: Array<{ text?: unknown; source_url?: unknown }> }
    if (!Array.isArray(parsed.facts)) return []

    const origin = pages[0] ? new URL(pages[0].url).origin : ''
    return parsed.facts
      .map((f) => {
        const text = typeof f.text === 'string' ? f.text.trim() : ''
        const src = typeof f.source_url === 'string' ? f.source_url.trim() : ''
        // Источник принимаем только если это реальный URL одной из обойдённых страниц.
        const source = validUrls.has(src) ? src : origin
        return { text, source }
      })
      .filter((f) => f.text.length > 0 && f.source.startsWith('http'))
      .slice(0, 25)
      .map(
        (f): RawDataPoint => ({
          data: f.text,
          source: f.source,
          date: today,
          rs: 4, // официальный сайт компании
          researchType: 'business',
        }),
      )
  } catch {
    return []
  }
}
