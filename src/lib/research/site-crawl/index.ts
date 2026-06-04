// Обход сайта клиента (MVP): каскад обнаружения страниц → отбор → fetch →
// извлечение грунтованных фактов (RS:4). Вход — URL главной (origin выводится сам).
// robots.txt читаем ТОЛЬКО ради директив Sitemap; Disallow в MVP не форсим —
// это собственный сайт клиента, объём мал (≤ кап), UA честный.
//
// Любой сбой на любом шаге деградирует тихо (возвращаем что собрали), чтобы
// не валить весь research-джоб из-за одной недоступной страницы.

import type { RawDataPoint } from '@/lib/types'
import {
  deriveOrigin,
  parseSitemapsFromRobots,
  isSitemapIndex,
  parseLocsFromSitemap,
  parseUrlsFromText,
  extractSameOriginLinks,
  htmlToText,
  extractTitle,
} from './parse'
import { rankAndCap } from './rank'
import { extractSiteFacts, type CrawledPage } from './extract'
import { detectAiAgents, type AiAgentDetection } from './ai-agents'

const UA = 'ai-strategist-bot/1.0 (+анализ сайта клиента)'
const PAGE_CHARS = 2800 // кап текста на страницу (токены под контролем)
const PAGE_CAP = 12 // максимум страниц на fetch
const FETCH_TIMEOUT = 8000

export interface SiteCrawlResult {
  points: RawDataPoint[]
  stats: { discovered: number; fetched: number; facts: number }
}

const EMPTY: SiteCrawlResult = { points: [], stats: { discovered: 0, fetched: 0, facts: 0 } }

async function safeFetch(url: string, timeout = FETCH_TIMEOUT): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,text/plain,*/*' },
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

async function discoverUrls(
  origin: string,
  homepageHtml: string | null,
  llmsTxtContent: string | null,
): Promise<string[]> {
  const urls: string[] = [origin + '/']

  // 1. llms.txt — URL уже получен снаружи (используем для discovery; статус — отдельный факт).
  if (llmsTxtContent) urls.push(...parseUrlsFromText(llmsTxtContent))

  // 2. robots.txt → директивы Sitemap.
  const robots = await safeFetch(origin + '/robots.txt')
  let sitemaps = robots ? parseSitemapsFromRobots(robots) : []

  // 3. Прямые пути, если robots не дал sitemap.
  if (sitemaps.length === 0) sitemaps = [origin + '/sitemap.xml', origin + '/sitemap_index.xml']

  // Парсим до 2 sitemap; один уровень вложенности sitemap-index.
  for (const sm of sitemaps.slice(0, 2)) {
    const xml = await safeFetch(sm)
    if (!xml) continue
    if (isSitemapIndex(xml)) {
      const child = parseLocsFromSitemap(xml)[0]
      if (child) {
        const childXml = await safeFetch(child)
        if (childXml) urls.push(...parseLocsFromSitemap(childXml))
      }
    } else {
      urls.push(...parseLocsFromSitemap(xml))
    }
  }

  // 4. Ссылки с главной — fallback, если sitemap ничего не дал.
  if (urls.length <= 1 && homepageHtml) urls.push(...extractSameOriginLinks(homepageHtml, origin))

  return urls
}

// Безусловный факт об AI-агентах / чат-ботах на сайте.
// Эмитится, когда удалось получить HTML главной (иначе нечего анализировать).
function buildAiAgentFact(origin: string, det: AiAgentDetection): RawDataPoint {
  const date = new Date().toISOString().slice(0, 10)
  const url = origin + '/'
  const data = det.present
    ? `На сайте обнаружены чат-виджеты / квалификационные боты: ${det.detected.join(', ')}. ВНИМАНИЕ: присутствие виджета не равно AI-агенту — отдельно уточнить, операторский это чат или AI-powered (автоматическая квалификация лидов 24/7).`
    : `На сайте НЕ обнаружено AI-агентов / чат-ботов / квалификационных ботов. Возможность: разработать и встроить AI-агента для квалификации лидов во все каналы клиента (сайт + указанные клиентом) — снижение CPL, разгрузка менеджеров, ответы 24/7.`
  return { data, source: url, date, rs: 4, researchType: 'business' }
}

// Безусловный факт о llms.txt — стандарт 2024 для AI-агентов.
// Эмитится ВСЕГДА (есть или нет), чтобы синтез и бриф обязательно отразили статус.
function buildLlmsTxtFact(origin: string, present: boolean): RawDataPoint {
  const url = origin + '/llms.txt'
  const date = new Date().toISOString().slice(0, 10)
  const data = present
    ? `На сайте опубликован llms.txt — стандарт 2024 для AI-агентов (структурированное описание сайта для LLM). Положительный сигнал AI-readiness: помогает ChatGPT/Perplexity/Claude корректно цитировать компанию.`
    : `На сайте НЕТ llms.txt — стандарта 2024 для AI-агентов (структурированное описание сайта для LLM, помогает корректному цитированию ChatGPT/Perplexity/Claude). Публикация — быстрая и дешёвая AI-discoverability мера.`
  return { data, source: url, date, rs: 4, researchType: 'business' }
}

export async function crawlClientSite(homepageUrl: string | null | undefined): Promise<SiteCrawlResult> {
  if (!homepageUrl) return EMPTY
  const origin = deriveOrigin(homepageUrl)
  if (!origin) return EMPTY

  try {
    const [homepageHtml, llmsTxtContent] = await Promise.all([
      safeFetch(homepageUrl),
      safeFetch(origin + '/llms.txt'),
    ])
    const llmsTxtFact = buildLlmsTxtFact(origin, llmsTxtContent !== null)
    // AI-агент-факт эмитим только если есть HTML главной — иначе нечего анализировать.
    const aiAgentFact: RawDataPoint | null = homepageHtml
      ? buildAiAgentFact(origin, detectAiAgents(homepageHtml))
      : null
    const baseFacts: RawDataPoint[] = aiAgentFact ? [llmsTxtFact, aiAgentFact] : [llmsTxtFact]

    const discovered = await discoverUrls(origin, homepageHtml, llmsTxtContent)
    const ranked = rankAndCap(discovered, origin, PAGE_CAP)
    if (ranked.length === 0) {
      return { points: baseFacts, stats: { discovered: discovered.length, fetched: 0, facts: baseFacts.length } }
    }

    // Текст главной уже скачан — переиспользуем, остальное тянем параллельно.
    const settled = await Promise.allSettled(
      ranked.map(async (url) => {
        const html = url === origin + '/' && homepageHtml ? homepageHtml : await safeFetch(url)
        if (!html) return null
        const text = htmlToText(html).slice(0, PAGE_CHARS)
        if (text.length < 80) return null // пустая/JS-рендеренная страница
        return { url, title: extractTitle(html), text } satisfies CrawledPage
      }),
    )

    const pages: CrawledPage[] = settled
      .filter((r): r is PromiseFulfilledResult<CrawledPage | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((p): p is CrawledPage => p !== null)

    if (pages.length === 0) {
      return { points: baseFacts, stats: { discovered: discovered.length, fetched: 0, facts: baseFacts.length } }
    }

    const sitePoints = await extractSiteFacts(pages)
    const points = [...baseFacts, ...sitePoints]
    return { points, stats: { discovered: discovered.length, fetched: pages.length, facts: points.length } }
  } catch {
    return EMPTY
  }
}
