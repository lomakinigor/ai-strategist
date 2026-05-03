import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchVkSnapshot, snapshotToFact } from '../vk-adapter'

const MOCK_GROUP = {
  id: 233306506,
  name: 'РУЗНАК',
  screen_name: 'club233306506',
  members_count: 1234,
  description: 'Маркировка товаров',
  activity: 'Услуги',
}

function mockVk(responses: Array<unknown>) {
  let i = 0
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const r = responses[i++]
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(r),
      })
    }),
  )
}

describe('fetchVkSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VK_SERVICE_TOKEN = 'test-token'
  })

  it('собирает подписчиков и метрики постов (legacy v5.131 формат: response = массив)', async () => {
    const recent = Math.floor(Date.now() / 1000) - 5 * 86400
    const old = Math.floor(Date.now() / 1000) - 60 * 86400

    mockVk([
      { response: [MOCK_GROUP] },
      {
        response: {
          count: 3,
          items: [
            { id: 1, date: recent, text: 't', views: { count: 1000 }, likes: { count: 50 } },
            { id: 2, date: recent, text: 't', views: { count: 800 }, likes: { count: 40 } },
            { id: 3, date: old, text: 't', views: { count: 9999 }, likes: { count: 999 } }, // старый, не учитывается
          ],
        },
      },
    ])

    const snap = await fetchVkSnapshot('club233306506')
    expect(snap).not.toBeNull()
    expect(snap!.subscribers).toBe(1234)
    expect(snap!.name).toBe('РУЗНАК')
    expect(snap!.postsLast30Days).toBe(2)
    expect(snap!.avgViewsLast30Days).toBe(900)
    expect(snap!.avgLikesLast30Days).toBe(45)
    expect(snap!.engagementRatePct).toBeCloseTo(72.9, 1)
  })

  it('собирает данные в новом формате v5.199 (response = { groups, profiles })', async () => {
    mockVk([
      { response: { groups: [MOCK_GROUP], profiles: [] } },
      { response: { count: 0, items: [] } },
    ])
    const snap = await fetchVkSnapshot('club233306506')
    expect(snap).not.toBeNull()
    expect(snap!.subscribers).toBe(1234)
    expect(snap!.name).toBe('РУЗНАК')
  })

  it('возвращает null если токен не задан', async () => {
    delete process.env.VK_SERVICE_TOKEN
    const snap = await fetchVkSnapshot('any')
    expect(snap).toBeNull()
  })

  it('возвращает null если groups.getById отдаёт ошибку API', async () => {
    mockVk([{ error: { error_code: 100, error_msg: 'invalid group' } }])
    const snap = await fetchVkSnapshot('nonexistent')
    expect(snap).toBeNull()
  })

  it('обрабатывает пустую wall (нет постов)', async () => {
    mockVk([
      { response: [MOCK_GROUP] },
      { response: { count: 0, items: [] } },
    ])
    const snap = await fetchVkSnapshot('club233306506')
    expect(snap).not.toBeNull()
    expect(snap!.postsLast30Days).toBe(0)
    expect(snap!.avgViewsLast30Days).toBeNull()
    expect(snap!.engagementRatePct).toBeNull()
  })

  it('graceful обрабатывает HTTP ошибку', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    )
    const snap = await fetchVkSnapshot('any')
    expect(snap).toBeNull()
  })
})

describe('snapshotToFact', () => {
  it('форматирует snapshot в RawDataPoint', () => {
    const fact = snapshotToFact(
      {
        groupId: 1,
        screenName: 'club1',
        name: 'Test',
        subscribers: 1000,
        description: null,
        activity: 'Услуги',
        postsLast30Days: 5,
        totalPostsParsed: 10,
        avgViewsLast30Days: 500,
        avgLikesLast30Days: 25,
        engagementRatePct: 50,
      },
      'https://vk.com/club1',
    )
    expect(fact.researchType).toBe('channels')
    expect(fact.rs).toBe(4)
    expect(fact.source).toBe('https://vk.com/club1')
    expect(fact.data).toContain('Test')
    expect(fact.data).toContain('vk.com/club1')
    expect(fact.data).toContain('Услуги')
  })
})
