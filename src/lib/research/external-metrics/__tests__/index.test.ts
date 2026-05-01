import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../telegram-adapter', () => ({
  fetchTelegramSnapshot: vi.fn(),
  snapshotToFact: vi.fn((s: { username: string }, url: string) => ({
    data: `tg:${s.username}`,
    source: url,
    date: '2026-05-01',
    rs: 4,
    researchType: 'channels',
  })),
  buildSkippedFact: vi.fn((url: string, reason: string) => ({
    data: `skipped:${reason}`,
    source: url,
    date: '2026-05-01',
    rs: 1,
    researchType: 'channels',
  })),
}))

vi.mock('../vk-adapter', () => ({
  fetchVkSnapshot: vi.fn(),
  snapshotToFact: vi.fn((s: { name: string }, url: string) => ({
    data: `vk:${s.name}`,
    source: url,
    date: '2026-05-01',
    rs: 4,
    researchType: 'channels',
  })),
}))

vi.mock('../pagespeed-adapter', () => ({
  fetchPageSpeedSnapshot: vi.fn(),
  snapshotToFact: vi.fn((s: { url: string }) => ({
    data: `ps:${s.url}`,
    source: s.url,
    date: '2026-05-01',
    rs: 4,
    researchType: 'business',
  })),
}))

import { collectExternalMetrics } from '../index'
import { fetchTelegramSnapshot } from '../telegram-adapter'
import { fetchVkSnapshot } from '../vk-adapter'
import { fetchPageSpeedSnapshot } from '../pagespeed-adapter'

describe('collectExternalMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('возвращает пустой результат на пустой входной массив', async () => {
    const r = await collectExternalMetrics([])
    expect(r.points).toHaveLength(0)
    expect(r.stats.requested).toBe(0)
  })

  it('маршрутизирует Telegram URL в TelegramAdapter', async () => {
    vi.mocked(fetchTelegramSnapshot).mockResolvedValue({
      username: 'durov',
      title: 'Pavel',
      description: '',
      subscribers: 1000,
      postsLast30Days: 5,
      totalPostsParsed: 10,
      avgViewsLast30Days: 500,
      engagementRatePct: 50,
      topPosts: [],
    })
    const r = await collectExternalMetrics(['https://t.me/durov'])
    expect(r.points).toHaveLength(1)
    expect(r.points[0].data).toBe('tg:durov')
    expect(r.stats.succeeded).toBe(1)
  })

  it('маршрутизирует VK URL в VkAdapter', async () => {
    vi.mocked(fetchVkSnapshot).mockResolvedValue({
      groupId: 1,
      screenName: 'club1',
      name: 'Test',
      subscribers: 100,
      description: null,
      activity: null,
      postsLast30Days: 0,
      totalPostsParsed: 0,
      avgViewsLast30Days: null,
      avgLikesLast30Days: null,
      engagementRatePct: null,
    })
    const r = await collectExternalMetrics(['https://vk.com/club1'])
    expect(r.points).toHaveLength(1)
    expect(r.points[0].data).toBe('vk:Test')
  })

  it('маршрутизирует обычный сайт в PageSpeedAdapter', async () => {
    vi.mocked(fetchPageSpeedSnapshot).mockResolvedValue({
      url: 'https://ru-znak.ru',
      strategy: 'mobile',
      performanceScore: 50,
      seoScore: 90,
      accessibilityScore: 80,
      bestPracticesScore: 85,
      lcpSec: 2.5,
      clsScore: 0.05,
      fcpSec: 1.5,
    })
    const r = await collectExternalMetrics(['https://ru-znak.ru'])
    expect(r.points).toHaveLength(1)
    expect(r.points[0].data).toBe('ps:https://ru-znak.ru')
  })

  it('пропускает Telegram-боты с пометкой skip', async () => {
    const r = await collectExternalMetrics(['https://t.me/RuZnak_markirovka_bot'])
    expect(r.points).toHaveLength(1)
    expect(r.points[0].rs).toBe(1)
    expect(r.points[0].data).toContain('Telegram-бот')
    expect(r.stats.skipped).toBe(1)
  })

  it('пропускает агрегаторы ссылок', async () => {
    const r = await collectExternalMetrics(['https://linku.su/abc'])
    expect(r.points).toHaveLength(1)
    expect(r.points[0].rs).toBe(1)
    expect(r.stats.skipped).toBe(1)
  })

  it('обрабатывает несколько каналов параллельно', async () => {
    vi.mocked(fetchTelegramSnapshot).mockResolvedValue({
      username: 'durov',
      title: 'P',
      description: '',
      subscribers: 1,
      postsLast30Days: 0,
      totalPostsParsed: 0,
      avgViewsLast30Days: null,
      engagementRatePct: null,
      topPosts: [],
    })
    vi.mocked(fetchVkSnapshot).mockResolvedValue({
      groupId: 1,
      screenName: 'c',
      name: 'C',
      subscribers: 1,
      description: null,
      activity: null,
      postsLast30Days: 0,
      totalPostsParsed: 0,
      avgViewsLast30Days: null,
      avgLikesLast30Days: null,
      engagementRatePct: null,
    })

    const r = await collectExternalMetrics([
      'https://t.me/durov',
      'https://vk.com/club1',
      '@RuZnak_markirovka_bot',
    ])

    expect(r.stats.requested).toBe(3)
    expect(r.stats.succeeded).toBe(2)
    expect(r.stats.skipped).toBe(1)
  })

  it('graceful обрабатывает сбой одного адаптера', async () => {
    vi.mocked(fetchTelegramSnapshot).mockRejectedValue(new Error('boom'))
    vi.mocked(fetchVkSnapshot).mockResolvedValue({
      groupId: 1,
      screenName: 'c',
      name: 'C',
      subscribers: 1,
      description: null,
      activity: null,
      postsLast30Days: 0,
      totalPostsParsed: 0,
      avgViewsLast30Days: null,
      avgLikesLast30Days: null,
      engagementRatePct: null,
    })

    const r = await collectExternalMetrics([
      'https://t.me/durov',
      'https://vk.com/club1',
    ])

    expect(r.stats.requested).toBe(2)
    expect(r.stats.failed).toBe(1)
    expect(r.stats.succeeded).toBe(1)
    // upstream call upstream сбой → buildSkippedFact с reason
    expect(r.points.find((p) => p.data.includes('сбой адаптера'))).toBeDefined()
  })

  it('null/undefined элементы игнорируются', async () => {
    const r = await collectExternalMetrics([null, undefined, ''])
    expect(r.stats.requested).toBe(0)
  })
})
