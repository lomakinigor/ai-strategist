import { describe, it, expect } from 'vitest'
import {
  deriveOrigin,
  parseSitemapsFromRobots,
  isSitemapIndex,
  parseLocsFromSitemap,
  parseUrlsFromText,
  extractSameOriginLinks,
  htmlToText,
  extractTitle,
} from '../parse'

describe('deriveOrigin', () => {
  it('берёт origin из любого пути', () => {
    expect(deriveOrigin('https://glc-reputation.ru/uslugi/vzyskanie')).toBe('https://glc-reputation.ru')
    expect(deriveOrigin('не-url')).toBeNull()
  })
})

describe('parseSitemapsFromRobots', () => {
  it('извлекает Sitemap-директивы (регистронезависимо)', () => {
    const robots = 'User-agent: *\nDisallow: /admin\nSitemap: https://site.ru/sitemap.xml\nSITEMAP: https://site.ru/sitemap2.xml'
    expect(parseSitemapsFromRobots(robots)).toEqual([
      'https://site.ru/sitemap.xml',
      'https://site.ru/sitemap2.xml',
    ])
  })
  it('пусто, если директив нет', () => {
    expect(parseSitemapsFromRobots('User-agent: *\nDisallow:')).toEqual([])
  })
})

describe('sitemap parsing', () => {
  it('различает sitemap-index и обычный sitemap', () => {
    expect(isSitemapIndex('<?xml?><sitemapindex><sitemap><loc>x</loc></sitemap></sitemapindex>')).toBe(true)
    expect(isSitemapIndex('<urlset><url><loc>x</loc></url></urlset>')).toBe(false)
  })
  it('вытаскивает все <loc> и декодит &amp;', () => {
    const xml = '<urlset><url><loc>https://s.ru/a</loc></url><url><loc>https://s.ru/b?x=1&amp;y=2</loc></url></urlset>'
    expect(parseLocsFromSitemap(xml)).toEqual(['https://s.ru/a', 'https://s.ru/b?x=1&y=2'])
  })
})

describe('parseUrlsFromText (llms.txt)', () => {
  it('берёт http(s)-ссылки, обрезая хвостовую пунктуацию', () => {
    expect(parseUrlsFromText('- [Услуги](https://s.ru/uslugi).\nсм. https://s.ru/cases,')).toEqual([
      'https://s.ru/uslugi',
      'https://s.ru/cases',
    ])
  })
})

describe('extractSameOriginLinks', () => {
  it('оставляет только same-origin, нормализует относительные, режет mailto/#', () => {
    const html =
      '<a href="/uslugi">У</a><a href="https://s.ru/cases">К</a>' +
      '<a href="https://other.ru/x">Чужой</a><a href="mailto:a@b.ru">M</a><a href="#top">#</a>'
    const links = extractSameOriginLinks(html, 'https://s.ru')
    expect(links).toContain('https://s.ru/uslugi')
    expect(links).toContain('https://s.ru/cases')
    expect(links).not.toContain('https://other.ru/x')
    expect(links.some((l) => l.includes('mailto'))).toBe(false)
  })
})

describe('htmlToText / extractTitle', () => {
  it('срезает script/style/теги, схлопывает пробелы', () => {
    const html = '<title>Тайтл</title><style>.a{}</style><div>Привет  <script>x()</script> мир</div>'
    expect(htmlToText(html)).toContain('Привет')
    expect(htmlToText(html)).toContain('мир')
    expect(htmlToText(html)).not.toContain('x()')
    expect(extractTitle(html)).toBe('Тайтл')
  })
})
