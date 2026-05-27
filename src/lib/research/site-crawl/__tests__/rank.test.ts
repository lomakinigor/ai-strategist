import { describe, it, expect } from 'vitest'
import { rankAndCap } from '../rank'

const ORIGIN = 'https://glc-reputation.ru'

describe('rankAndCap', () => {
  it('главная всегда первая, релевантные страницы выше служебных', () => {
    const urls = [
      `${ORIGIN}/politika-konfidencialnosti`,
      `${ORIGIN}/uslugi`,
      `${ORIGIN}/`,
      `${ORIGIN}/otzyvy`,
      `${ORIGIN}/cases`,
    ]
    const ranked = rankAndCap(urls, ORIGIN, 12)
    expect(ranked[0]).toBe(`${ORIGIN}/`)
    expect(ranked).toContain(`${ORIGIN}/uslugi`)
    expect(ranked).toContain(`${ORIGIN}/otzyvy`)
    expect(ranked).toContain(`${ORIGIN}/cases`)
    // приватность сильно штрафуется — ниже релевантных
    expect(ranked.indexOf(`${ORIGIN}/uslugi`)).toBeLessThan(ranked.indexOf(`${ORIGIN}/politika-konfidencialnosti`))
  })

  it('дедуп (хвостовой слэш) и отсев чужого домена/не-HTML', () => {
    const urls = [
      `${ORIGIN}/uslugi`,
      `${ORIGIN}/uslugi/`,
      'https://other.ru/uslugi',
      `${ORIGIN}/file.pdf`,
      `${ORIGIN}/logo.png`,
    ]
    const ranked = rankAndCap(urls, ORIGIN, 12)
    expect(ranked.filter((u) => u.endsWith('/uslugi')).length).toBe(1)
    expect(ranked.some((u) => u.includes('other.ru'))).toBe(false)
    expect(ranked.some((u) => u.endsWith('.pdf') || u.endsWith('.png'))).toBe(false)
  })

  it('соблюдает кап', () => {
    const urls = Array.from({ length: 40 }, (_, i) => `${ORIGIN}/uslugi/p${i}`)
    expect(rankAndCap(urls, ORIGIN, 12).length).toBeLessThanOrEqual(12)
  })

  it('режет служебные login/cart/?query', () => {
    const ranked = rankAndCap(
      [`${ORIGIN}/`, `${ORIGIN}/cart`, `${ORIGIN}/search?q=x`, `${ORIGIN}/login`],
      ORIGIN,
      12,
    )
    expect(ranked.some((u) => /cart|login|search/.test(u))).toBe(false)
  })
})
