import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const homepage = readFileSync(resolve(root, 'app/page.tsx'), 'utf8')
const cssPath = resolve(root, 'app/home.module.css')
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''
const designPath = resolve(root, 'docs/brand/DESIGN.md')
const design = existsSync(designPath) ? readFileSync(designPath, 'utf8') : ''

describe('Pomelli design contract для главной', () => {
  it('использует scoped дизайн с fixed glass-header и тёмным hero', () => {
    expect(homepage).toContain("import styles from './home.module.css'")
    expect(css).toContain('position: fixed')
    expect(css).toContain('backdrop-filter: blur(8px)')
    expect(css).toContain('/strategist-hero.png')
    expect(css).toContain('#1e3a8a')
    expect(css).toContain('#0a0a0a')
  })

  it('сохраняет ключевые пути и добавляет якорную навигацию', () => {
    expect(homepage).toContain('href="#method"')
    expect(homepage).toContain('href="#pricing"')
    expect(homepage).toContain('href="/intake?tier=paid"')
    expect(homepage).toContain('href="/intake"')
    expect(homepage).toContain('href="/demo"')
  })

  it('разделяет пример, полный и бесплатный краткий отчёты в CTA', () => {
    expect(homepage).toMatch(
      /<Link href="\/demo" className=\{styles\.headerCta\}>\s*Посмотреть пример отчёта/,
    )
    expect(homepage).toMatch(
      /<CTALink href="\/intake\?tier=paid"[\s\S]*?>\s*Получить полный отчёт — 9 999 ₽/,
    )
    expect(homepage).toMatch(
      /<CTALink href="\/intake"[\s\S]*?>\s*Получить краткий отчёт бесплатно/,
    )
    expect(homepage).not.toContain('или попробовать бесплатный пробник')
  })

  it('адаптируется к mobile и reduced motion', () => {
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('не допускает mobile overflow и выравнивает CTA', () => {
    for (const className of [
      'heroKeyword',
      'tariffGrid',
      'tariffCard',
      'tariffCta',
      'tariffCtaLabel',
      'trialCtaArrow',
      'finalActions',
    ]) {
      expect(homepage).toContain(`styles.${className}`)
    }
    expect(homepage).toContain('<span className={styles.heroKeyword}>Стратегический</span>')
    expect(css).toContain('min-width: 0')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toMatch(/\.heroKeyword[\s\S]*white-space: nowrap/)
    expect(css).toMatch(/\.tariffCtaLabel[\s\S]*overflow-wrap: normal/)
    expect(css).toMatch(/\.tariffCtaLabel[\s\S]*word-break: normal/)
    expect(homepage).toContain("t.goal === 'open_intake' ? styles.trialCtaArrow : undefined")
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*\.trialCtaArrow[\s\S]*display: none/)
    expect(css).toContain('font-size: clamp(1.75rem, 8.8vw, 2.25rem)')
    expect(css).toMatch(/\.tariffCta[\s\S]*min-height: 80px/)
    expect(css).toMatch(/\.primaryButton,[\s\S]*\.secondaryButton[\s\S]*min-height: 80px/)
    expect(css).toMatch(/\.finalActions[\s\S]*align-items: stretch/)
  })

  it('следует canonical палитре и brand voice из бренд-бука', () => {
    expect(design).toContain('#FFFFFF')
    expect(design).toContain('#1E3A8A')
    expect(design).toContain('#0A0A0A')
    expect(design).toContain('#525252')
    expect(design).toContain('#FAFAFA')
    expect(design).toContain('Fact-based accuracy')

    expect(homepage).not.toContain('lp-eyebrow-warm')

    const allowedHex = new Set(['#ffffff', '#1e3a8a', '#0a0a0a', '#525252', '#fafafa'])
    const usedHex = Array.from(`${homepage}\n${css}`.matchAll(/#[0-9a-f]{6}/gi)).map(([hex]) =>
      hex.toLowerCase(),
    )
    expect(Array.from(new Set(usedHex)).filter((hex) => !allowedHex.has(hex))).toEqual([])
  })
})
