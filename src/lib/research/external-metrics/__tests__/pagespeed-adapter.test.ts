import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPageSpeedSnapshot, snapshotToFact } from '../pagespeed-adapter'

const MOCK_RESPONSE = {
  lighthouseResult: {
    categories: {
      performance: { score: 0.45 },
      seo: { score: 0.92 },
      accessibility: { score: 0.78 },
      'best-practices': { score: 0.85 },
    },
    audits: {
      'largest-contentful-paint': { numericValue: 3500 },
      'cumulative-layout-shift': { numericValue: 0.123 },
      'first-contentful-paint': { numericValue: 1500 },
    },
  },
}

describe('fetchPageSpeedSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_PAGESPEED_API_KEY = 'test-key'
  })

  it('собирает scores и core web vitals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const snap = await fetchPageSpeedSnapshot('https://ru-znak.ru')
    expect(snap).not.toBeNull()
    expect(snap!.performanceScore).toBe(45)
    expect(snap!.seoScore).toBe(92)
    expect(snap!.accessibilityScore).toBe(78)
    expect(snap!.bestPracticesScore).toBe(85)
    expect(snap!.lcpSec).toBe(3.5)
    expect(snap!.fcpSec).toBe(1.5)
    expect(snap!.clsScore).toBe(0.123)
    expect(snap!.strategy).toBe('mobile')
  })

  it('возвращает null если ключ не задан', async () => {
    delete process.env.GOOGLE_PAGESPEED_API_KEY
    const snap = await fetchPageSpeedSnapshot('https://ru-znak.ru')
    expect(snap).toBeNull()
  })

  it('возвращает null при HTTP ошибке', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) }),
    )
    const snap = await fetchPageSpeedSnapshot('https://example.com')
    expect(snap).toBeNull()
  })

  it('graceful обрабатывает обрыв fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const snap = await fetchPageSpeedSnapshot('https://example.com')
    expect(snap).toBeNull()
  })

  it('обрабатывает частичный ответ (нет audits)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ lighthouseResult: { categories: { performance: { score: 0.5 } } } }),
      }),
    )
    const snap = await fetchPageSpeedSnapshot('https://example.com')
    expect(snap).not.toBeNull()
    expect(snap!.performanceScore).toBe(50)
    expect(snap!.lcpSec).toBeNull()
    expect(snap!.clsScore).toBeNull()
  })
})

describe('snapshotToFact', () => {
  it('форматирует snapshot в RawDataPoint', () => {
    const fact = snapshotToFact({
      url: 'https://ru-znak.ru',
      strategy: 'mobile',
      performanceScore: 45,
      seoScore: 92,
      accessibilityScore: 78,
      bestPracticesScore: 85,
      lcpSec: 3.5,
      clsScore: 0.123,
      fcpSec: 1.5,
    })
    expect(fact.researchType).toBe('business')
    expect(fact.rs).toBe(4)
    expect(fact.source).toBe('https://ru-znak.ru')
    expect(fact.data).toContain('Производительность: 45/100')
    expect(fact.data).toContain('плохо') // 45 < 50
    expect(fact.data).toContain('SEO: 92/100')
    expect(fact.data).toContain('хорошо') // 92 >= 90
    expect(fact.data).toContain('LCP')
    expect(fact.data).toContain('3.5s')
  })
})
