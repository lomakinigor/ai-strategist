import { describe, it, expect } from 'vitest'
import { businessAdapterMock } from '../business-adapter.mock'
import { marketAdapterMock } from '../market-adapter.mock'
import { audienceAdapterMock } from '../audience-adapter.mock'
import { channelsAdapterMock } from '../channels-adapter.mock'
import { classify } from '../../reliability/classify'
import type { ResearchQuery, ResearchAdapter } from '../../types'

const baseQuery: ResearchQuery = {
  companyName: 'Тест-Компания',
  industry: 'IT-услуги',
  description: 'Разработка программного обеспечения',
  website: 'https://test.ru',
}

const queryNoWebsite: ResearchQuery = {
  companyName: 'Малый Бизнес',
  industry: 'Розничная торговля',
}

const queryWithChannels: ResearchQuery = {
  companyName: 'Медиа ООО',
  industry: 'Медиа',
  channels: ['ВКонтакте', 'Telegram'],
}

function assertValidRawDataPoints(adapter: ResearchAdapter, points: Awaited<ReturnType<ResearchAdapter['collect']>>) {
  expect(points.length).toBeGreaterThanOrEqual(2)
  for (const point of points) {
    expect(point.researchType).toBe(adapter.researchType)
    expect(point.data.trim().length).toBeGreaterThan(0)
    expect(point.source.trim().length).toBeGreaterThan(0)
    expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect([1, 2, 3, 4, 5]).toContain(point.rs)
  }
}

describe('businessAdapterMock', () => {
  it('returns correct researchType and valid structure', async () => {
    expect(businessAdapterMock.researchType).toBe('business')
    const points = await businessAdapterMock.collect(baseQuery)
    assertValidRawDataPoints(businessAdapterMock, points)
  })

  it('includes company name in output', async () => {
    const points = await businessAdapterMock.collect(baseQuery)
    const combined = points.map((p) => p.data).join(' ')
    expect(combined).toContain('Тест-Компания')
  })

  it('RS 4 when website provided, RS 2 when not', async () => {
    const withSite = await businessAdapterMock.collect(baseQuery)
    const noSite = await businessAdapterMock.collect(queryNoWebsite)
    expect(withSite.find((p) => p.rs === 4)).toBeDefined()
    expect(noSite.find((p) => p.rs === 4)).toBeUndefined()
  })

  it('all points survive classify() without throwing', async () => {
    const points = await businessAdapterMock.collect(baseQuery)
    for (const point of points) {
      expect(() => classify(point)).not.toThrow()
    }
  })
})

describe('marketAdapterMock', () => {
  it('returns correct researchType and valid structure', async () => {
    expect(marketAdapterMock.researchType).toBe('market')
    const points = await marketAdapterMock.collect(baseQuery)
    assertValidRawDataPoints(marketAdapterMock, points)
  })

  it('includes industry name in output', async () => {
    const points = await marketAdapterMock.collect(baseQuery)
    const combined = points.map((p) => p.data).join(' ')
    expect(combined).toContain('IT-услуги')
  })

  it('all points survive classify()', async () => {
    const points = await marketAdapterMock.collect(baseQuery)
    for (const point of points) {
      expect(() => classify(point)).not.toThrow()
    }
  })
})

describe('audienceAdapterMock', () => {
  it('returns correct researchType and valid structure', async () => {
    expect(audienceAdapterMock.researchType).toBe('audience')
    const points = await audienceAdapterMock.collect(baseQuery)
    assertValidRawDataPoints(audienceAdapterMock, points)
  })

  it('all points have RS <= 2 (indirect signals)', async () => {
    const points = await audienceAdapterMock.collect(baseQuery)
    for (const point of points) {
      expect(point.rs).toBeLessThanOrEqual(2)
    }
  })

  it('all points survive classify()', async () => {
    const points = await audienceAdapterMock.collect(baseQuery)
    for (const point of points) {
      const result = classify(point)
      // RS<=2 → HYPOTHESIS or INSUFFICIENT_DATA, never FACT
      expect(['HYPOTHESIS', 'INSUFFICIENT_DATA']).toContain(result.type)
    }
  })
})

describe('channelsAdapterMock', () => {
  it('returns correct researchType and valid structure', async () => {
    expect(channelsAdapterMock.researchType).toBe('channels')
    const points = await channelsAdapterMock.collect(baseQuery)
    assertValidRawDataPoints(channelsAdapterMock, points)
  })

  it('RS 3 when channels provided in query', async () => {
    const points = await channelsAdapterMock.collect(queryWithChannels)
    expect(points.find((p) => p.rs === 3)).toBeDefined()
  })

  it('no RS 3 when channels not provided', async () => {
    const points = await channelsAdapterMock.collect(queryNoWebsite)
    expect(points.find((p) => p.rs === 3)).toBeUndefined()
  })

  it('channel names appear in output when provided', async () => {
    const points = await channelsAdapterMock.collect(queryWithChannels)
    const combined = points.map((p) => p.data).join(' ')
    expect(combined).toContain('ВКонтакте')
  })

  it('all points survive classify()', async () => {
    const points = await channelsAdapterMock.collect(baseQuery)
    for (const point of points) {
      expect(() => classify(point)).not.toThrow()
    }
  })
})

describe('all adapters', () => {
  const adapters = [businessAdapterMock, marketAdapterMock, audienceAdapterMock, channelsAdapterMock]

  it('each adapter has unique researchType matching its name', () => {
    const types = adapters.map((a) => a.researchType)
    expect(types).toEqual(['business', 'market', 'audience', 'channels'])
    expect(new Set(types).size).toBe(4)
  })

  it('each adapter returns at least 2 points', async () => {
    for (const adapter of adapters) {
      const points = await adapter.collect(baseQuery)
      expect(points.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('all points from all adapters have correct researchType', async () => {
    for (const adapter of adapters) {
      const points = await adapter.collect(baseQuery)
      for (const point of points) {
        expect(point.researchType).toBe(adapter.researchType)
      }
    }
  })
})
