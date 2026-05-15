import type { ResearchProvider, ResearchRequest, ResearchResult, ExtendedResearchType } from '../types'
import type { RawDataPoint, ResearchType } from '../../types'
import { AI_CONFIG } from '../config'

// Perplexity Sonar API response shape (relevant fields only)
interface PerplexityResponse {
  choices: Array<{ message: { content: string } }>
  citations?: string[]
}

// Verifiability rule appended to every research prompt — keeps Sonar honest.
const VERIFIABILITY_RULE =
  ' КРИТИЧНО: каждое утверждение должно подтверждаться публичным URL из результатов поиска.' +
  ' Если для пункта нет конкретного источника — ПРОПУСТИ его, не выдумывай.' +
  ' Лучше короткий ответ на 2 пункта с ссылками, чем длинный без подтверждений.'

// Prompt templates per research stream — методология на основе Котлер, Портер, Ries/Trout, Кrug, Эш, Мур, Гилад
const RESEARCH_PROMPTS: Record<ExtendedResearchType, (q: ResearchRequest['query']) => string> = {
  business: (q) =>
    `Найди актуальную информацию о компании «${q.companyName}» в нише «${q.industry}» на российском рынке.` +
    (q.website ? ` Сайт компании: ${q.website}.` : '') +
    (q.description ? ` Описание: ${q.description}.` : '') +
    ` Нужно: описание бизнес-модели и основных продуктов/услуг, позиционирование (STP по Котлеру),` +
    ` уникальное торговое предложение (USP), упоминания в деловых СМИ РФ.` +
    ` Приоритет источникам: официальный сайт компании, ЕГРЮЛ, РБК, Ведомости, Коммерсант.` +
    VERIFIABILITY_RULE,

  market: (q) =>
    // СТРОГОЕ СООТВЕТСТВИЕ: анализировать именно тот рынок, что указан — не смежный, не broader.
    `Проведи анализ рынка ИМЕННО «${q.industry}» в России (2024–2026).` +
    ` ВАЖНО: анализируй строго рынок «${q.industry}» — не смежные или родственные рынки.` +
    (q.description ? ` Дополнительный контекст о компании: ${q.description}.` : '') +
    ` Структура анализа по методологии Майкла Портера (Конкурентная стратегия) и Голубого океана:` +
    ` 1) Объём рынка в рублях (TAM/SAM) и динамика (CAGR) с источником и годом.` +
    ` 2) Пять сил Портера: угроза новых игроков, власть покупателей, власть поставщиков, субституты, конкуренция.` +
    ` 3) Стадия зрелости рынка (по Джеффри Муру): innovators / early majority / late majority / зрелый.` +
    ` 4) Ключевые тренды и драйверы роста.` +
    ` 5) Топ-5 поисковых запросов ниши «${q.industry}» в России (Яндекс.Вордстат или аналог).` +
    ` Источники: Росстат, РБК, Ведомости, отраслевые ассоциации РФ, аналитические агентства.` +
    VERIFIABILITY_RULE,

  audience: (q) =>
    `Целевая аудитория в нише «${q.industry}» в России.` +
    (q.description ? ` Контекст компании: ${q.description}.` : '') +
    ` Нужно: ключевые сегменты (демография, психография), основные «боли» и потребности по методу Jobs-to-be-Done,` +
    ` поведенческие паттерны (как ищут, как принимают решения), главные возражения при покупке.` +
    ` Фокус на российский рынок, реальные данные — не абстракции.` +
    VERIFIABILITY_RULE,

  channels: (q) =>
    `Наиболее эффективные маркетинговые каналы для компаний в нише «${q.industry}» в России.` +
    (q.description ? ` Контекст компании: ${q.description}.` : '') +
    ` Нужно: топ-5 каналов с конкретными показателями эффективности (CPL, конверсия, ROI в ₽),` +
    ` активность конкурентов в каждом канале, ориентировочные бюджеты в рублях.` +
    ` Каналы: SEO, Яндекс.Директ, ВКонтакте, Telegram, email, контент-маркетинг, маркетплейсы.` +
    VERIFIABILITY_RULE,

  competitors: (q) => {
    const clientCompetitors = q.competitors
      ? ` Конкуренты, указанные клиентом: ${q.competitors}.`
      : ''
    return (
      `Исследуй конкурентов компании «${q.companyName}» в нише «${q.industry}» на российском рынке.` +
      (q.description ? ` Контекст компании: ${q.description}.` : '') +
      clientCompetitors +
      ` ПРАВИЛА:` +
      ` 1) Обязательно исследуй ВСЕХ конкурентов, указанных клиентом выше.` +
      ` 2) Если указанных конкурентов меньше трёх — добавь своих до минимума 3 штук, пометь «[добавлен AI]».` +
      ` 3) ВСЕГДА добавляй одного конкурента, которого ты считаешь наиболее релевантным и сопоставимым с клиентом по параметрам, пометь «[выбор AI: наиболее релевантный]». Если он уже указан клиентом — подтверди: «[подтверждено AI как наиболее сопоставимый]».` +
      ` Для каждого конкурента (методология Гилада — Business War Games + Портер):` +
      ` - Название, URL сайта` +
      ` - Позиция на рынке: лидер / претендент / нишевик / следующий (по Ries & Trout — Маркетинговые войны)` +
      ` - Ценовой сегмент (если публичен)` +
      ` - Сильные стороны (источники конкурентного преимущества по Портеру)` +
      ` - Слабые стороны и уязвимости (слепые пятна по Гиладу)` +
      ` - Цифровое присутствие: сайт, SEO, реклама, контент` +
      ` Источники: официальные сайты, отраслевые рейтинги (РБК, vc.ru), отзывы (Otzovik, Яндекс.Карты).` +
      VERIFIABILITY_RULE
    )
  },

  site_marketing: (q) =>
    // Маркетинговый аудит сайта — по методологии Стива Круга (Don't Make Me Think) и Тима Эша (Landing Page Optimization)
    `Проведи маркетинговый аудит сайта «${q.website}» компании «${q.companyName}» в нише «${q.industry}».` +
    (q.competitors ? ` Конкуренты для сравнения: ${q.competitors}.` : '') +
    ` Структура аудита:` +
    ` 1) Тест пяти секунд (Стив Круг): понятно ли с первого экрана — что это за продукт, для кого, в чём выгода? Есть ли явный CTA?` +
    ` 2) Иерархия конверсии AIDA (Тим Эш): насколько реализована цепочка Attention → Interest → Desire → Action?` +
    `    Оффер: конкретный или размытый? Социальные доказательства: наличие, качество, расположение.` +
    `    Устранены ли «тревоги» пользователя (гарантии, контакты, отзывы)?` +
    ` 3) Позиционирование (Ries & Trout): читается ли уникальная позиция бренда из первого экрана?` +
    ` 4) SEO и поисковый спрос: по каким запросам ниши «${q.industry}» сайт ранжируется? Соответствие топ-запросам.` +
    ` 5) Сравнение с сайтами конкурентов: что лучше / хуже у клиента по каждому параметру.` +
    ` Источники: контент самого сайта, Google/Яндекс, SEO-сервисы.` +
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

    // site_marketing results are tagged as 'business' for DB storage (no separate enum value)
    const dbResearchType: ResearchType =
      request.researchType === 'site_marketing' ? 'business' : request.researchType

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
              'Используй только верифицированные источники. Структурируй ответ абзацами, без лишних заголовков. ' +
              'Все денежные суммы — только в рублях (₽).',
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

    const points = parseInsights(content, citations, dbResearchType)

    return {
      points,
      providerId: 'perplexity',
      modelId,
      durationMs: Date.now() - start,
    }
  }
}
