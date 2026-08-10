import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const homepage = readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8')

describe('demo CTA на главной', () => {
  it('разделяет бесплатный пробник и публичный пример в hero', () => {
    expect(homepage).toMatch(
      /<CTALink href="\/intake" goal="open_intake" className=\{styles\.secondaryButton\}>\s*Попробовать бесплатный пробник\s*<\/CTALink>/,
    )
    expect(homepage).toMatch(
      /<Link href="\/demo" className=\{styles\.freeLink\}>\s*Посмотреть пример отчёта →\s*<\/Link>/,
    )
  })
})
