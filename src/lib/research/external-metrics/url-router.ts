// Маршрутизация публичных URL клиента в правильный adapter.
// Не пытается ничего fetch'ить — только классифицирует строку.

export type ChannelType = 'vk' | 'telegram-channel' | 'telegram-bot' | 'site' | 'skip'

export interface ChannelInfo {
  type: ChannelType
  // identifier нужен адаптеру: для vk — screen_name (например 'club233306506'),
  // для telegram — username без @ ('ChestniyZnak'), для site — полный URL
  identifier: string
  originalUrl: string
}

const TG_BOT_RX = /_bot$/i

// linku.su, taplink.cc, beacons.ai и подобные агрегаторы ссылок — пропускаем,
// у них нет публичной аналитики, а внутри обычно те же каналы которые мы
// и так разбираем отдельно.
const SKIPPED_AGGREGATOR_HOSTS = new Set([
  'linku.su',
  'taplink.cc',
  'beacons.ai',
  'lnk.bio',
  'linktr.ee',
])

function normalize(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Telegram-хендл вида @username — превращаем в URL
  if (trimmed.startsWith('@')) {
    return `https://t.me/${trimmed.slice(1)}`
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

export function detectChannel(rawUrl: string): ChannelInfo | null {
  const normalized = normalize(rawUrl)
  if (!normalized) return null

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
  const path = parsed.pathname

  if (SKIPPED_AGGREGATOR_HOSTS.has(host)) {
    return { type: 'skip', identifier: '', originalUrl: rawUrl }
  }

  if (host === 'vk.com' || host === 'vkontakte.ru') {
    // /club123 /public123 /id123 /custom_screen_name
    const screenName = path.replace(/^\//, '').split('/')[0]
    if (!screenName) return null
    return { type: 'vk', identifier: screenName, originalUrl: rawUrl }
  }

  if (host === 't.me' || host === 'telegram.me' || host === 'telegram.org') {
    // /username | /s/username | /joinchat/... (skip private)
    const seg = path.replace(/^\//, '').split('/')
    let username = seg[0]
    if (username === 's' && seg.length > 1) username = seg[1]
    if (!username) return null
    if (username === 'joinchat' || username === '+' || username.startsWith('+')) {
      return { type: 'skip', identifier: '', originalUrl: rawUrl }
    }
    if (TG_BOT_RX.test(username)) {
      return { type: 'telegram-bot', identifier: username, originalUrl: rawUrl }
    }
    return { type: 'telegram-channel', identifier: username, originalUrl: rawUrl }
  }

  // Всё остальное — обычный сайт
  return { type: 'site', identifier: normalized, originalUrl: rawUrl }
}

export function detectChannels(urls: Array<string | null | undefined>): ChannelInfo[] {
  const seen = new Set<string>()
  const out: ChannelInfo[] = []
  for (const u of urls) {
    if (!u) continue
    const info = detectChannel(u)
    if (!info) continue
    const key = `${info.type}:${info.identifier}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(info)
  }
  return out
}
