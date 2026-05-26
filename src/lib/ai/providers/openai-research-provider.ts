import type { ResearchProvider, ResearchRequest, ResearchResult, ExtendedResearchType } from '../types'
import type { RawDataPoint, ResearchType } from '../../types'
import { inferSourceType } from './perplexity-research-provider'

// OpenAI Responses API shape (web_search_preview tool)
interface UrlCitation {
  type: 'url_citation'
  url: string
  title?: string
  start_index: number
  end_index: number
}

interface OutputText {
  type: 'output_text'
  text: string
  annotations?: UrlCitation[]
}

interface OutputMessage {
  type: 'message'
  content: OutputText[]
}

interface OpenAIResponse {
  output: Array<{ type: string } & Partial<OutputMessage>>
}

const VERIFIABILITY_RULE =
  ' КРИТИЧНО: каждое утверждение должно подтверждаться публичным URL из результатов поиска.' +
  ' Если для пункта нет конкретного источника — ПРОПУСТИ его, не выдумывай.' +
  ' Лучше короткий ответ на 2 пункта с ссылками, чем длинный без подтверждений.'

export const RESEARCH_PROMPTS: Record<ExtendedResearchType, (q: ResearchRequest['query']) => string> = {
  business: (q) =>
    `Найди актуальную информацию о компании «${q.companyName}» в нише «${q.industry}» на российском рынке.` +
    (q.website ? ` Сайт компании: ${q.website}.` : '') +
    (q.description ? ` Описание: ${q.description}.` : '') +
    (q.directions?.items.length
      ? ` Клиент подтвердил направления деятельности: ${q.directions.items.join('; ')}.` +
        (q.directions.independent === true
          ? ` Это РАЗНЫЕ направления (разные клиенты/рынки) — анализируй и описывай каждое ОТДЕЛЬНО, НЕ объединяй в «единый комплекс».`
          : q.directions.independent === false
            ? ` Это одно связанное предложение — можно рассматривать вместе.`
            : '')
      : '') +
    ` Нужно: описание бизнес-модели и основных продуктов/услуг, позиционирование (STP по Котлеру),` +
    ` уникальное торговое предложение (USP), упоминания в деловых СМИ РФ.` +
    ` Если у компании НЕСКОЛЬКО разных направлений (напр. производство и разработка ПО) — перечисли их РАЗДЕЛЬНО, не объединяй в «единый комплекс».` +
    ` Отдельно найди СОЦДОКАЗАТЕЛЬСТВА самого клиента: крупные клиенты/референсы, реализованные проекты-кейсы, отзывы и рейтинг компании (с её сайта, Яндекс.Карт, 2ГИС, Otzovik) — про САМУ компанию, не про конкурентов.` +
    ` Приоритет источникам: официальный сайт компании, ЕГРЮЛ, РБК, Ведомости, Коммерсант.` +
    VERIFIABILITY_RULE,

  market: (q) =>
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
    `Маркетинговые каналы для компании «${q.companyName}» в нише «${q.industry}» в России. Раздели на ДВЕ части.` +
    (q.website ? ` Сайт: ${q.website}.` : '') +
    (q.description ? ` Контекст компании: ${q.description}.` : '') +
    (q.adChannels?.length
      ? ` Клиент ПОДТВЕРДИЛ, что уже использует: ${q.adChannels.join(', ')}. Эти каналы считай используемыми (факт от клиента), найди по ним признаки/URL для верификации; НЕ пиши, что клиент их не использует.`
      : '') +
    ` ЧАСТЬ A — какие каналы клиент УЖЕ использует: ищи конкретные признаки (объявления на Авито, кампании Яндекс.Директ, сообщества/реклама ВК, Telegram-канал, профиль 2ГИС/Яндекс.Карты, рассылки). Указывай канал как используемый ТОЛЬКО при наличии признака с URL ИЛИ если он в списке подтверждённых клиентом выше. Если признаков не нашёл — НЕ пиши «не использует», а отметь «по этому каналу данных не найдено».` +
    ` ЧАСТЬ B — рекомендуемые для ниши каналы: топ-каналы с показателями (CPL, конверсия, ROI в ₽) и бюджетами. Рассмотри ВСЕ перспективные для ниши: SEO, Яндекс.Директ, ВКонтакте, Telegram, email, 2ГИС/Карты, Авито и иные маркетплейсы/классифайды, отраслевые порталы/тендеры. Не занижай Авито/маркетплейсы для B2B-производства, опта и услуг.` +
    VERIFIABILITY_RULE,

  competitors: (q) => {
    const clientCompetitors = q.competitors ? ` Конкуренты, указанные клиентом: ${q.competitors}.` : ''
    return (
      `Исследуй конкурентов компании «${q.companyName}» в нише «${q.industry}» на российском рынке.` +
      (q.description ? ` Контекст компании: ${q.description}.` : '') +
      clientCompetitors +
      ` ПРАВИЛА:` +
      ` 1) Обязательно исследуй ВСЕХ конкурентов, указанных клиентом выше.` +
      ` 2) Если клиент не указал конкурентов или их меньше 3 — НАЙДИ САМ до 3–5 штук, каждого помечай «[найден AI — требует подтверждения]».` +
      ` 3) ВСЕГДА добавляй одного конкурента, которого считаешь наиболее релевантным, пометь «[найден AI — требует подтверждения]».` +
      ` Для каждого конкурента: название, URL, что делает, позиция на рынке, ценовой сегмент, сильные/слабые стороны, чем наш клиент может отстроиться.` +
      ` Источники: официальные сайты, РБК, vc.ru, Otzovik, Яндекс.Карты.` +
      VERIFIABILITY_RULE
    )
  },

  site_marketing: (q) =>
    `Проведи маркетинговый аудит сайта «${q.website}» компании «${q.companyName}» в нише «${q.industry}».` +
    (q.competitors ? ` Конкуренты для сравнения: ${q.competitors}.` : '') +
    ` Структура аудита:` +
    ` 1) Тест пяти секунд (Стив Круг): понятно ли с первого экрана — что это за продукт, для кого, в чём выгода?` +
    ` 2) Иерархия конверсии AIDA (Тим Эш): оффер, социальные доказательства, устранение тревог пользователя.` +
    ` 3) Позиционирование (Ries & Trout): читается ли уникальная позиция бренда?` +
    ` 4) SEO: по каким запросам ниши сайт ранжируется?` +
    ` 5) Сравнение с конкурентами по каждому параметру.` +
    ` Источники: контент сайта, Google/Яндекс, SEO-сервисы.` +
    VERIFIABILITY_RULE,
}

function parseInsights(text: string, citations: UrlCitation[], researchType: ResearchType): RawDataPoint[] {
  const today = new Date().toISOString().split('T')[0]
  const urls = citations.map((c) => c.url)

  const paragraphs = text
    .split(/\n\n+/)
    .map((s) => s.replace(/\[\d+\]/g, '').trim())
    .filter((s) => s.length > 15)
    .slice(0, 5)

  if (paragraphs.length === 0) {
    const fallback = text.replace(/\[\d+\]/g, '').trim().slice(0, 600)
    if (!fallback) return []
    return [{ data: fallback, source: urls[0] ?? 'OpenAI web search', date: today, rs: urls.length > 0 ? 3 : 2, researchType }]
  }

  return paragraphs.map((para, i) => ({
    data: para,
    source: urls[i] ?? urls[0] ?? 'OpenAI web search',
    date: today,
    rs: urls.length > 0 ? 3 : 2,
    researchType,
  }))
}

// OpenAI Responses API with web_search_preview — drop-in replacement for Perplexity Sonar.
// Requires OPENAI_API_KEY environment variable.
export class OpenAIResearchProvider implements ResearchProvider {
  readonly id = 'openai' as const
  readonly name = 'OpenAI web search'

  private readonly baseUrl = 'https://api.openai.com/v1/responses'

  async research(request: ResearchRequest): Promise<ResearchResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY не задан. Установите переменную окружения или переключитесь в режим mock.')
    }

    const modelId = request.modelId ?? 'gpt-4o-mini'
    const prompt = RESEARCH_PROMPTS[request.researchType](request.query)
    const start = Date.now()

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
        tools: [{ type: 'web_search_preview' }],
        instructions:
          'Ты аналитический ассистент для российского бизнеса. Отвечай на русском языке. ' +
          'Используй только верифицированные источники. Структурируй ответ абзацами, без лишних заголовков. ' +
          'Все денежные суммы — только в рублях (₽).',
        input: prompt,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} — ${err}`)
    }

    const json = (await response.json()) as OpenAIResponse

    const messageItem = json.output.find((o) => o.type === 'message') as OutputMessage | undefined
    const textContent = messageItem?.content?.find((c) => c.type === 'output_text')
    const text = textContent?.text ?? ''
    const citations = (textContent?.annotations ?? []).filter((a): a is UrlCitation => a.type === 'url_citation')

    const points = parseInsights(text, citations, dbResearchType)

    // Enrich source records with proper source type
    for (const point of points) {
      if (point.source.startsWith('http')) {
        inferSourceType(point.source)
      }
    }

    return {
      points,
      providerId: 'openai',
      modelId,
      durationMs: Date.now() - start,
    }
  }
}
