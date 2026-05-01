import type { ResearchProvider, ResearchRequest, ResearchResult } from '../types'
import type { RawDataPoint, ResearchType } from '../../types'
import { AI_CONFIG } from '../config'

// Perplexity Sonar API response shape (relevant fields only)
interface PerplexityResponse {
  choices: Array<{ message: { content: string } }>
  citations?: string[]
}

// Verifiability rule appended to every research prompt — keeps Sonar honest.
// Without this, the model speculates from training data when web search returns thin.
const VERIFIABILITY_RULE =
  ' КРИТИЧНО: каждое утверждение должно подтверждаться публичным URL из результатов поиска.' +
  ' Если для пункта нет конкретного источника — ПРОПУСТИ его, не выдумывай.' +
  ' Лучше короткий ответ на 2 пункта с ссылками, чем длинный без подтверждений.'

// Prompt templates per research stream — Russian-market focused
const RESEARCH_PROMPTS: Record<ResearchType, (q: ResearchRequest['query']) => string> = {
  business: (q) =>
    `Найди актуальную информацию о компании «${q.companyName}» в отрасли «${q.industry}» на российском рынке.` +
    (q.website ? ` Сайт компании: ${q.website}.` : '') +
    (q.description ? ` Описание: ${q.description}.` : '') +
    ` Нужно: описание бизнес-модели и основных продуктов/услуг, позиционирование, упоминания в деловых СМИ РФ.` +
    ` Приоритет источникам: официальный сайт компании, ЕГРЮЛ, РБК, Ведомости, Коммерсант.` +
    VERIFIABILITY_RULE,

  market: (q) =>
    `Анализ рынка отрасли «${q.industry}» в России, актуальные данные за 2024–2026 год.` +
    ` Нужно: объём рынка и динамика в рублях, ключевые тренды, доли основных игроков, прогнозы роста.` +
    ` Источники: Росстат, РБК, Ведомости, отраслевые ассоциации РФ, аналитические агентства.` +
    VERIFIABILITY_RULE,

  audience: (q) =>
    `Целевая аудитория компаний в сфере «${q.industry}» в России.` +
    (q.description ? ` Контекст компании: ${q.description}.` : '') +
    ` Нужно: ключевые сегменты и их демография, основные «боли» и потребности, поведенческие паттерны,` +
    ` как принимают решения о покупке, возражения. Фокус на российский рынок.` +
    VERIFIABILITY_RULE,

  channels: (q) =>
    `Маркетинговые каналы и продажи для компаний в отрасли «${q.industry}» в России.` +
    (q.channels?.length ? ` Известные каналы компании «${q.companyName}»: ${q.channels.join(', ')}.` : '') +
    ` Нужно: наиболее эффективные каналы привлечения (ВКонтакте, Telegram, SEO, контекст Яндекс.Директ, email),` +
    ` активность конкурентов в каналах, ориентировочные бюджеты в рублях.` +
    VERIFIABILITY_RULE,

  competitors: (q) =>
    `Прямые конкуренты компании «${q.companyName}» в отрасли «${q.industry}» на российском рынке.` +
    (q.description ? ` Контекст компании: ${q.description}.` : '') +
    ` Найди 4–8 прямых конкурентов. Для каждого: название, URL сайта, продукт/услуга, ценовой сегмент (если публичен),` +
    ` сильные стороны (что делают хорошо), слабые стороны (что делают плохо или не делают), уязвимости.` +
    ` Источники: официальные сайты конкурентов, отраслевые рейтинги (РБК, vc.ru), отзывы клиентов (Otzovik, Yandex Maps), карточки на маркетплейсах.` +
    VERIFIABILITY_RULE,
}

function inferSourceType(url: string): 'registry' | 'official_site' | 'social' | 'ad' | 'aggregator' {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('rosstat') || host.includes('egrul') || host.endsWith('.gov.ru')) return 'registry'
    if (host.includes('vk.com') || host.includes('t.me') || host.includes('telegram.org')) return 'social'
    if (host.includes('avito') || host.includes('ozon') || host.includes('wildberries') || host.includes('otzovik')) return 'aggregator'
    return 'official_site'
  } catch {
    return 'aggregator'
  }
}

function parseInsights(content: string, citations: string[], researchType: ResearchType): RawDataPoint[] {
  const today = new Date().toISOString().split('T')[0]
  const hasCitations = citations.length > 0

  // Split on double newlines; remove inline citation markers like [1]
  const paragraphs = content
    .split(/\n\n+/)
    .map((s) => s.replace(/\[\d+\]/g, '').trim())
    .filter((s) => s.length > 15)
    .slice(0, 5)

  if (paragraphs.length === 0) {
    const fallback = content.replace(/\[\d+\]/g, '').trim().slice(0, 600)
    if (!fallback) return []
    return [
      {
        data: fallback,
        source: citations[0] ?? 'Perplexity Sonar (web search)',
        date: today,
        rs: hasCitations ? 3 : 2,
        researchType,
      },
    ]
  }

  return paragraphs.map((para, i) => ({
    data: para,
    source: citations[i] ?? citations[0] ?? 'Perplexity Sonar (web search)',
    date: today,
    rs: hasCitations ? 3 : 2,
    researchType,
  }))
}

export { inferSourceType }

// Perplexity Sonar — live web search provider for ai-strategist research pipeline.
// API reference: https://docs.perplexity.ai/api-reference/chat-completions
// Requires PERPLEXITY_API_KEY environment variable.
export class PerplexityResearchProvider implements ResearchProvider {
  readonly id = 'perplexity' as const
  readonly name = 'Perplexity Sonar'

  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions'

  async research(request: ResearchRequest): Promise<ResearchResult> {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      throw new Error(
        'PERPLEXITY_API_KEY не задан. Установите переменную окружения или переключитесь в режим mock (RESEARCH_MODE=mock).',
      )
    }

    const modelId = request.modelId ?? AI_CONFIG.research.defaultModel
    const prompt = RESEARCH_PROMPTS[request.researchType](request.query)
    const start = Date.now()

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content:
              'Ты аналитический ассистент для российского бизнеса. Отвечай на русском языке. ' +
              'Используй только верифицированные источники. Структурируй ответ абзацами, без лишних заголовков.',
          },
          { role: 'user', content: prompt },
        ],
        return_citations: true,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText}`,
      )
    }

    const json = (await response.json()) as PerplexityResponse
    const content = json.choices[0]?.message?.content ?? ''
    const citations = json.citations ?? []

    const points = parseInsights(content, citations, request.researchType)

    return {
      points,
      providerId: 'perplexity',
      modelId,
      durationMs: Date.now() - start,
    }
  }
}
