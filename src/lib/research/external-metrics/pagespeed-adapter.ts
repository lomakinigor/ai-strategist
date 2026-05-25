// Google PageSpeed Insights API adapter — техническое качество сайта.
// Использует API key из GOOGLE_PAGESPEED_API_KEY.
// Один запрос ~15-30 секунд, поэтому вызываем только для приоритетных URL.

import type { RawDataPoint } from '@/lib/types'

const API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export interface PageSpeedSnapshot {
  url: string
  performanceScore: number | null // 0..100
  seoScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  lcpSec: number | null // Largest Contentful Paint
  clsScore: number | null // Cumulative Layout Shift
  fcpSec: number | null // First Contentful Paint
  strategy: 'mobile' | 'desktop'
}

interface PageSpeedApiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number | null }
      seo?: { score: number | null }
      accessibility?: { score: number | null }
      'best-practices'?: { score: number | null }
    }
    audits?: {
      'largest-contentful-paint'?: { numericValue?: number }
      'cumulative-layout-shift'?: { numericValue?: number }
      'first-contentful-paint'?: { numericValue?: number }
    }
  }
}

function pctScore(score: number | null | undefined): number | null {
  if (typeof score !== 'number') return null
  return Math.round(score * 100)
}

export async function fetchPageSpeedSnapshot(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PageSpeedSnapshot | null> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY
  if (!key) return null

  const apiUrl = new URL(API_BASE)
  apiUrl.searchParams.set('url', url)
  apiUrl.searchParams.set('strategy', strategy)
  apiUrl.searchParams.append('category', 'performance')
  apiUrl.searchParams.append('category', 'seo')
  apiUrl.searchParams.append('category', 'accessibility')
  apiUrl.searchParams.append('category', 'best-practices')
  apiUrl.searchParams.set('key', key)

  try {
    // PageSpeed может занимать до 60 сек на медленных сайтах
    const res = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(45_000),
    })
    if (!res.ok) {
      console.warn(`[pagespeed-adapter] HTTP ${res.status} for ${url}`)
      return null
    }
    const data = (await res.json()) as PageSpeedApiResponse
    const cats = data.lighthouseResult?.categories ?? {}
    const audits = data.lighthouseResult?.audits ?? {}

    return {
      url,
      strategy,
      performanceScore: pctScore(cats.performance?.score),
      seoScore: pctScore(cats.seo?.score),
      accessibilityScore: pctScore(cats.accessibility?.score),
      bestPracticesScore: pctScore(cats['best-practices']?.score),
      lcpSec: audits['largest-contentful-paint']?.numericValue
        ? Math.round((audits['largest-contentful-paint'].numericValue / 1000) * 10) / 10
        : null,
      clsScore: audits['cumulative-layout-shift']?.numericValue
        ? Math.round(audits['cumulative-layout-shift'].numericValue * 1000) / 1000
        : null,
      fcpSec: audits['first-contentful-paint']?.numericValue
        ? Math.round((audits['first-contentful-paint'].numericValue / 1000) * 10) / 10
        : null,
    }
  } catch (err) {
    console.warn(`[pagespeed-adapter] failed for ${url}:`, err)
    return null
  }
}

export function snapshotToFact(snapshot: PageSpeedSnapshot): RawDataPoint {
  const lines = [
    `Сайт ${snapshot.url} — Lighthouse (${snapshot.strategy})`,
    snapshot.performanceScore !== null
      ? `Производительность: ${snapshot.performanceScore}/100${rate(snapshot.performanceScore)}`
      : '',
    snapshot.seoScore !== null
      ? `SEO: ${snapshot.seoScore}/100${rate(snapshot.seoScore)}`
      : '',
    snapshot.accessibilityScore !== null
      ? `Доступность: ${snapshot.accessibilityScore}/100`
      : '',
    snapshot.bestPracticesScore !== null
      ? `Best practices: ${snapshot.bestPracticesScore}/100`
      : '',
    snapshot.lcpSec !== null ? `LCP (главный контент): ${snapshot.lcpSec}s` : '',
    snapshot.fcpSec !== null ? `FCP (первый контент): ${snapshot.fcpSec}s` : '',
    snapshot.clsScore !== null ? `CLS (смещение макета): ${snapshot.clsScore}` : '',
  ].filter(Boolean)

  return {
    data: lines.join('. '),
    source: snapshot.url,
    date: new Date().toISOString().slice(0, 10),
    rs: 4, // официальный API Google
    researchType: 'business',
  }
}

function rate(score: number): string {
  if (score >= 90) return ' (хорошо)'
  if (score >= 50) return ' (требует доработки)'
  return ' (плохо)'
}
