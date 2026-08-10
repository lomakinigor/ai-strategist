import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const css = readFileSync(resolve(root, 'app/demo/demo.module.css'), 'utf8')
const component = readFileSync(resolve(root, 'app/demo/DemoExperience.tsx'), 'utf8')
const contactAdmin = readFileSync(resolve(root, 'src/components/ContactAdminButton.tsx'), 'utf8')

describe('Demo report design contract', () => {
  it('keeps technical audit values readable in light and dark themes', () => {
    expect(css).toMatch(/\.auditMetrics strong\s*\{[\s\S]*?color:\s*var\(--color-text\)/)
  })

  it('aligns metric titles, values and notes on shared visual rows', () => {
    expect(css).toMatch(/\.metric\s*\{[\s\S]*?grid-template-rows:\s*64px auto 1fr/)
    expect(css).toMatch(/\.metric strong\s*\{[\s\S]*?margin:\s*0/)
  })

  it('uses sentence case in the report name and no question mark in the contact button', () => {
    expect(css).toMatch(/\.demoBadge\s*\{[\s\S]*?text-transform:\s*none/)
    expect(contactAdmin).not.toContain('<span aria-hidden>?</span>')
    expect(contactAdmin).toContain('<span>Написать админу</span>')
  })

  it('keeps the demo hero in one upright type style', () => {
    expect(css).toMatch(/\.stageIntro h1 em\s*\{[\s\S]*?font-style:\s*normal/)
  })

  it('использует Pomelli tokens и сохраняет размеры рабочего отчёта', () => {
    expect(css).toContain('--color-bg: #fafafa')
    expect(css).toContain('--color-primary: #1e3a8a')
    expect(css).toContain('font-family: var(--font-inter)')
    expect(css).toContain('--sidebar-w: 240px')
    expect(css).toContain('--content-max: 860px')
    expect(css).toContain("[data-theme='dark']")
  })

  it('оставляет в правой части header только название отчёта', () => {
    expect(component).toContain('<div className={styles.demoBadge}>Обезличенный рабочий отчёт</div>')
    expect(component).not.toContain('styles.topActions')
    expect(component).not.toContain('Только действия')
    expect(component).not.toContain('Сменить тему')
    expect(component).not.toContain('Печать / PDF')
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*?grid-template-columns:\s*240px 1fr/)
    expect(css).toMatch(/\.demoBadge\s*\{[\s\S]*?justify-self:\s*end/)
    expect(css).toMatch(/\.demoBadge\s*\{[\s\S]*?font-size:\s*13px/)
  })

  it('сохраняет навигацию и прогресс эталонного отчёта', () => {
    expect(component).toContain('Прочитано')
    expect(component).toContain('Этапы демонстрации')
  })

  it('показывает факты до свёрнутого AI-резюме и объясняет методологию', () => {
    expect(component.indexOf('styles.digitalAudit')).toBeLessThan(
      component.indexOf('styles.thesis'),
    )
    expect(component).toContain('<details className={styles.thesis}>')
    expect(component).toContain('Структура отчёта спроектирована по framing-aware принципу')
  })
})
