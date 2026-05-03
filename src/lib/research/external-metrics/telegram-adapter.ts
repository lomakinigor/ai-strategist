// Telegram public preview parser — без API ключа.
// Источник: https://t.me/s/{username} — публичный HTML-вьюер канала, отдаёт
// последние ~20 постов с просмотрами и метаданные (название, описание, подписчики).

import type { RawDataPoint } from '@/lib/types'

const PREVIEW_URL = (username: string) => `https://t.me/s/${username}`

interface TelegramSnapshot {
  username: string
  title: string | null
  description: string | null
  subscribers: number | null
  postsLast30Days: number
  totalPostsParsed: number
  avgViewsLast30Days: number | null
  engagementRatePct: number | null // (avg views / subscribers) * 100
  topPosts: Array<{ views: number; date: Date }>
}

// Парсим HTML вручную через regex, не таща jsdom — на серверлесе он тяжёлый.

const RX_TITLE = /<meta\s+property="og:title"\s+content="([^"]+)"/i
const RX_DESCRIPTION = /<meta\s+property="og:description"\s+content="([^"]+)"/i
// counter_value contains compact numbers like "6.95K" — accept any non-tag content
const RX_SUBSCRIBERS_BLOCK =
  /<div\s+class="tgme_channel_info_counter">\s*<span\s+class="counter_value">([^<]+)<\/span>\s*<span\s+class="counter_type">subscribers<\/span>/i
// Posts: each message has data-post and a `.tgme_widget_message_views` element + datetime
const RX_POSTS = /<div\s+class="tgme_widget_message_wrap[^"]*"[\s\S]*?<\/div>\s*<\/div>/g
const RX_VIEWS = /class="tgme_widget_message_views">([^<]+)</i
const RX_DATETIME = /<time[^>]+datetime="([^"]+)"/i

// "1.2K" → 1200, "5M" → 5_000_000, "742" → 742, "5 432" → 5432
function parseCompactNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lastChar = trimmed.slice(-1).toUpperCase()
  if (lastChar === 'K') {
    const n = parseFloat(trimmed.slice(0, -1))
    return Number.isFinite(n) ? Math.round(n * 1_000) : null
  }
  if (lastChar === 'M') {
    const n = parseFloat(trimmed.slice(0, -1))
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : null
  }
  const n = parseInt(trimmed.replace(/[\s,\u00A0]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function parseSubscribers(html: string): number | null {
  const m = html.match(RX_SUBSCRIBERS_BLOCK)
  if (!m) return null
  return parseCompactNumber(m[1])
}

// Backward-compatible alias used in posts parsing path
function parseViewsCompact(raw: string): number {
  return parseCompactNumber(raw) ?? 0
}

function parsePosts(html: string): Array<{ views: number; date: Date }> {
  const posts: Array<{ views: number; date: Date }> = []
  const matches = html.match(RX_POSTS) ?? []
  for (const block of matches) {
    const viewsM = block.match(RX_VIEWS)
    const dateM = block.match(RX_DATETIME)
    if (!viewsM || !dateM) continue
    const views = parseViewsCompact(viewsM[1])
    const date = new Date(dateM[1])
    if (Number.isNaN(date.getTime())) continue
    posts.push({ views, date })
  }
  return posts
}

export async function fetchTelegramSnapshot(username: string): Promise<TelegramSnapshot | null> {
  const url = PREVIEW_URL(username)
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        // Без UA Telegram возвращает заглушку для ботов
        'User-Agent':
          'Mozilla/5.0 (compatible; ai-strategist/1.0; +https://ai-strategist-bice.vercel.app)',
      },
    })
    if (!res.ok) return null
    html = await res.text()
  } catch {
    return null
  }

  // На страницы приватных/несуществующих каналов Telegram отдаёт generic HTML
  // без блока tgme_channel_info — в таком случае возвращаем null
  const subscribers = parseSubscribers(html)
  if (subscribers === null) return null

  const titleM = html.match(RX_TITLE)
  const descM = html.match(RX_DESCRIPTION)
  const allPosts = parsePosts(html)

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = allPosts.filter((p) => p.date.getTime() >= cutoff)
  const avgViews =
    recent.length > 0 ? Math.round(recent.reduce((s, p) => s + p.views, 0) / recent.length) : null
  const er = avgViews && subscribers ? Math.round((avgViews / subscribers) * 1000) / 10 : null

  return {
    username,
    title: titleM ? titleM[1] : null,
    description: descM ? descM[1] : null,
    subscribers,
    postsLast30Days: recent.length,
    totalPostsParsed: allPosts.length,
    avgViewsLast30Days: avgViews,
    engagementRatePct: er,
    topPosts: recent,
  }
}

// Превращаем snapshot в один человекочитаемый RawDataPoint для RAG.
export function snapshotToFact(snapshot: TelegramSnapshot, originalUrl: string): RawDataPoint {
  const lines = [
    `Telegram-канал @${snapshot.username}${snapshot.title ? ` («${snapshot.title}»)` : ''}`,
    snapshot.subscribers !== null
      ? `Подписчиков: ${snapshot.subscribers.toLocaleString('ru-RU')}`
      : 'Подписчиков: не определено',
    `Постов за 30 дней: ${snapshot.postsLast30Days}`,
    snapshot.avgViewsLast30Days !== null
      ? `Средний охват поста (30 дней): ${snapshot.avgViewsLast30Days.toLocaleString('ru-RU')}`
      : 'Средний охват: данных нет',
    snapshot.engagementRatePct !== null
      ? `ER (среднее охватов / подписчиков): ${snapshot.engagementRatePct}%`
      : 'ER: не рассчитан',
  ]

  return {
    data: lines.join('. '),
    source: originalUrl,
    date: new Date().toISOString().slice(0, 10),
    rs: 4, // публичный t.me-превью официально предоставлен Telegram
    researchType: 'channels',
  }
}

// Помечаем что канал/бот пропущен (для логов и диагностики)
export function buildSkippedFact(originalUrl: string, reason: string): RawDataPoint {
  return {
    data: `Канал ${originalUrl}: внешние метрики не собраны — ${reason}`,
    source: originalUrl,
    date: new Date().toISOString().slice(0, 10),
    rs: 1,
    researchType: 'channels',
  }
}
