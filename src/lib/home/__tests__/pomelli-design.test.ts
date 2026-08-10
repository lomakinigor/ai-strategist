import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const homepage = readFileSync(resolve(root, 'app/page.tsx'), 'utf8')
const cssPath = resolve(root, 'app/home.module.css')
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''

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

  it('адаптируется к mobile и reduced motion', () => {
    expect(css).toContain('@media (max-width: 768px)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
