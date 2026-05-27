// Чистые парсеры для обхода сайта клиента — без сети, легко тестируются.

// Базовый origin из URL клиента (https://domain.ru/path → https://domain.ru).
export function deriveOrigin(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

// Директивы Sitemap: из robots.txt → массив URL.
export function parseSitemapsFromRobots(robotsTxt: string): string[] {
  const out: string[] = []
  for (const line of robotsTxt.split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap:\s*(\S+)/i)
    if (m) out.push(m[1].trim())
  }
  return out
}

// Это sitemap-index (ссылается на дочерние sitemap), а не список страниц?
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml)
}

// Содержимое всех <loc>…</loc> (и для sitemap, и для sitemap-index).
export function parseLocsFromSitemap(xml: string): string[] {
  const out: string[] = []
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) out.push(decodeEntities(m[1].trim()))
  return out
}

// http(s)-ссылки из llms.txt (markdown) или произвольного текста.
export function parseUrlsFromText(text: string): string[] {
  const out: string[] = []
  const re = /https?:\/\/[^\s)<>"']+/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) out.push(m[0].replace(/[.,;]+$/, ''))
  return out
}

// Same-origin ссылки из HTML главной (fallback, когда sitemap не найден).
export function extractSameOriginLinks(html: string, origin: string): string[] {
  const out = new Set<string>()
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim()
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    try {
      const abs = new URL(href, origin)
      if (abs.origin === origin) out.add(abs.origin + abs.pathname)
    } catch {
      /* пропускаем битые href */
    }
  }
  return Array.from(out)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
}

// HTML → читаемый текст: вырезаем скрипты/стили/комментарии, теги → пробел.
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? htmlToText(m[1]).slice(0, 160) : ''
}
