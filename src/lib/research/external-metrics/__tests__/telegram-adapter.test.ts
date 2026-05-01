import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchTelegramSnapshot, snapshotToFact } from '../telegram-adapter'

// Минимальный fixture HTML t.me/s/{username}, имитирующий структуру Telegram-превью.
function buildPreviewHtml(opts: {
  title: string
  description: string
  subscribers: string
  posts: Array<{ datetime: string; views: string }>
}): string {
  const postBlocks = opts.posts
    .map(
      (p) => `
<div class="tgme_widget_message_wrap js-widget_message_wrap">
  <div class="tgme_widget_message">
    <div class="tgme_widget_message_text js-message_text">Post body</div>
    <div class="tgme_widget_message_footer">
      <a class="tgme_widget_message_date" href="#"><time datetime="${p.datetime}">date</time></a>
      <span class="tgme_widget_message_views">${p.views}</span>
    </div>
  </div>
</div>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta property="og:title" content="${opts.title}">
<meta property="og:description" content="${opts.description}">
</head>
<body>
<div class="tgme_channel_info_counter">
  <span class="counter_value">${opts.subscribers}</span>
  <span class="counter_type">subscribers</span>
</div>
${postBlocks}
</body>
</html>`
}

describe('fetchTelegramSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('парсит подписчиков, описание и посты', async () => {
    const today = new Date()
    const recent = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const recent2 = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const html = buildPreviewHtml({
      title: 'Честный Знак',
      description: 'Канал про маркировку',
      subscribers: '5 432',
      posts: [
        { datetime: recent, views: '1.2K' },
        { datetime: recent2, views: '800' },
      ],
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      }),
    )

    const snap = await fetchTelegramSnapshot('ChestniyZnak')
    expect(snap).not.toBeNull()
    expect(snap!.username).toBe('ChestniyZnak')
    expect(snap!.title).toBe('Честный Знак')
    expect(snap!.subscribers).toBe(5432)
    expect(snap!.postsLast30Days).toBe(2)
    expect(snap!.avgViewsLast30Days).toBe(1000) // (1200 + 800) / 2
    expect(snap!.engagementRatePct).toBeCloseTo(18.4, 1)
  })

  it('возвращает null если HTTP не 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') }),
    )
    const snap = await fetchTelegramSnapshot('nonexistent')
    expect(snap).toBeNull()
  })

  it('возвращает null если на странице нет блока подписчиков (приватный/удалённый канал)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body>Channel preview</body></html>'),
      }),
    )
    const snap = await fetchTelegramSnapshot('private')
    expect(snap).toBeNull()
  })

  it('игнорирует посты старше 30 дней при подсчёте среднего', async () => {
    const today = new Date()
    const old = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const recent = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const html = buildPreviewHtml({
      title: 'Test',
      description: 'd',
      subscribers: '1000',
      posts: [
        { datetime: old, views: '999' }, // старый, не должен учитываться
        { datetime: recent, views: '500' }, // свежий
      ],
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }),
    )
    const snap = await fetchTelegramSnapshot('test')
    expect(snap!.postsLast30Days).toBe(1)
    expect(snap!.avgViewsLast30Days).toBe(500)
  })

  it('graceful обрабатывает сетевую ошибку', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))
    const snap = await fetchTelegramSnapshot('any')
    expect(snap).toBeNull()
  })
})

describe('snapshotToFact', () => {
  it('форматирует snapshot в человекочитаемый факт', () => {
    const fact = snapshotToFact(
      {
        username: 'ChestniyZnak',
        title: 'Честный Знак',
        description: 'd',
        subscribers: 5432,
        postsLast30Days: 12,
        totalPostsParsed: 20,
        avgViewsLast30Days: 1200,
        engagementRatePct: 22.1,
        topPosts: [],
      },
      'https://t.me/ChestniyZnak',
    )
    expect(fact.data).toContain('@ChestniyZnak')
    expect(fact.data).toContain('Честный Знак')
    // toLocaleString('ru-RU') использует NBSP (U+00A0), нормализуем перед проверкой
    const normalized = fact.data.replace(/\u00A0/g, ' ')
    expect(normalized).toContain('5 432')
    expect(normalized).toContain('12')
    expect(normalized).toContain('1 200')
    expect(fact.data).toContain('22.1%')
    expect(fact.researchType).toBe('channels')
    expect(fact.rs).toBe(4)
    expect(fact.source).toBe('https://t.me/ChestniyZnak')
  })
})
