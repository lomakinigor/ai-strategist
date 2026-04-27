import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PerplexityResearchProvider } from '../providers/perplexity-research-provider'
import type { ResearchRequest } from '../types'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const MOCK_PERPLEXITY_RESPONSE = {
  choices: [
    {
      message: {
        content:
          'Компания работает в IT-секторе России с 2015 года.\n\n' +
          'Основные продукты: SaaS-решения для автоматизации бизнеса.\n\n' +
          'Позиционирование: B2B сегмент, малый и средний бизнес.',
      },
    },
  ],
  citations: ['https://example.ru/about', 'https://rbc.ru/article/123', 'https://vedomosti.ru/tech'],
}

const baseRequest: ResearchRequest = {
  query: { companyName: 'Тест ООО', industry: 'IT-услуги' },
  researchType: 'business',
}

describe('PerplexityResearchProvider', () => {
  beforeEach(() => {
    process.env.PERPLEXITY_API_KEY = 'test-key-abc'
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_PERPLEXITY_RESPONSE,
    })
  })

  afterEach(() => {
    delete process.env.PERPLEXITY_API_KEY
    vi.clearAllMocks()
  })

  it('throws when PERPLEXITY_API_KEY is not set', async () => {
    delete process.env.PERPLEXITY_API_KEY
    const provider = new PerplexityResearchProvider()
    await expect(provider.research(baseRequest)).rejects.toThrow('PERPLEXITY_API_KEY')
  })

  it('calls Perplexity endpoint with correct method and URL', async () => {
    const provider = new PerplexityResearchProvider()
    await provider.research(baseRequest)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.perplexity.ai/chat/completions')
    expect(opts.method).toBe('POST')
  })

  it('sends Authorization header with Bearer token', async () => {
    const provider = new PerplexityResearchProvider()
    await provider.research(baseRequest)

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = opts.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-key-abc')
  })

  it('does not log or expose the API key in request body', async () => {
    const provider = new PerplexityResearchProvider()
    await provider.research(baseRequest)

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(JSON.stringify(body)).not.toContain('test-key-abc')
  })

  it('sends return_citations: true in request body', async () => {
    const provider = new PerplexityResearchProvider()
    await provider.research(baseRequest)

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.return_citations).toBe(true)
  })

  it('returns RawDataPoints with correct researchType', async () => {
    const provider = new PerplexityResearchProvider()
    const result = await provider.research(baseRequest)

    expect(result.points.length).toBeGreaterThan(0)
    for (const point of result.points) {
      expect(point.researchType).toBe('business')
    }
  })

  it('returns providerId=perplexity', async () => {
    const provider = new PerplexityResearchProvider()
    const result = await provider.research(baseRequest)
    expect(result.providerId).toBe('perplexity')
  })

  it('maps citations to source field in RawDataPoints', async () => {
    const provider = new PerplexityResearchProvider()
    const result = await provider.research(baseRequest)

    const hasAnyCitation = result.points.some(
      (p) => p.source.startsWith('http') || p.source.includes('Perplexity'),
    )
    expect(hasAnyCitation).toBe(true)
  })

  it('assigns RS:3 when citations are present', async () => {
    const provider = new PerplexityResearchProvider()
    const result = await provider.research(baseRequest)

    for (const point of result.points) {
      expect(point.rs).toBe(3)
    }
  })

  it('assigns RS:2 when no citations returned', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Краткий ответ без источников.' } }],
        citations: [],
      }),
    })

    const provider = new PerplexityResearchProvider()
    const result = await provider.research(baseRequest)

    for (const point of result.points) {
      expect(point.rs).toBe(2)
    }
  })

  it('throws on non-OK HTTP response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' })
    const provider = new PerplexityResearchProvider()
    await expect(provider.research(baseRequest)).rejects.toThrow('Perplexity API error: 429')
  })

  it('includes company name in prompt sent to API', async () => {
    const provider = new PerplexityResearchProvider()
    await provider.research({ ...baseRequest, query: { companyName: 'Уникальное Название', industry: 'Финансы' } })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    const userMessage = body.messages.find((m: { role: string }) => m.role === 'user')
    expect(userMessage?.content).toContain('Уникальное Название')
  })

  it('works for all 4 research types', async () => {
    const types = ['business', 'market', 'audience', 'channels'] as const
    const provider = new PerplexityResearchProvider()

    for (const type of types) {
      mockFetch.mockClear()
      const result = await provider.research({ ...baseRequest, researchType: type })
      expect(result.points.every((p) => p.researchType === type)).toBe(true)
    }
  })

  it('returns durationMs as a non-negative number', async () => {
    const provider = new PerplexityResearchProvider()
    const result = await provider.research(baseRequest)
    expect(typeof result.durationMs).toBe('number')
    expect(result.durationMs!).toBeGreaterThanOrEqual(0)
  })
})
