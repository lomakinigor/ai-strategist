import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const css = readFileSync(resolve(root, 'app/demo/demo.module.css'), 'utf8')
const component = readFileSync(resolve(root, 'app/demo/DemoExperience.tsx'), 'utf8')

describe('Innорdor design contract', () => {
  it('использует согласованные токены и размеры Innodor', () => {
    expect(css).toContain('--color-bg: #f8f7f4')
    expect(css).toContain('--color-primary: #1a5c54')
    expect(css).toContain('--sidebar-w: 240px')
    expect(css).toContain('--content-max: 860px')
    expect(css).toContain("[data-theme='dark']")
  })

  it('сохраняет интерактивные функции эталонного отчёта', () => {
    expect(component).toContain('Только действия')
    expect(component).toContain('Прочитано')
    expect(component).toContain('Сменить тему')
    expect(component).toContain('Печать / PDF')
  })

  it('показывает факты до свёрнутого AI-резюме и объясняет методологию', () => {
    expect(component.indexOf('styles.digitalAudit')).toBeLessThan(
      component.indexOf('styles.thesis'),
    )
    expect(component).toContain('<details className={styles.thesis}>')
    expect(component).toContain('Структура отчёта спроектирована по framing-aware принципу')
  })
})
