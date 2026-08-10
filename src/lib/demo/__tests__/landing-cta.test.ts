import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const homepage = readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8')

describe('demo CTA на главной', () => {
  it('ведёт с hero на публичный пример отчёта', () => {
    expect(homepage).toContain('href="/demo"')
    expect(homepage).toContain('Посмотреть пример отчёта')
  })
})
