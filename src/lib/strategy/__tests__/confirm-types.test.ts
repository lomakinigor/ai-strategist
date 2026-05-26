import { describe, it, expect } from 'vitest'
import { seedBlock, type ConfirmBlock } from '../confirm-types'

const block = (texts: string[]): ConfirmBlock => ({
  items: texts.map((t) => ({ text: t, provenance: 'research' as const })),
  unknown: false,
})

describe('seedBlock — предзаполнение блока из intake', () => {
  it('ставит intake-элементы первыми с провенансом brief', () => {
    const result = seedBlock(block(['AI-найденное']), ['производство', 'цифровизация'])
    expect(result.items.slice(0, 2)).toEqual([
      { text: 'производство', provenance: 'brief' },
      { text: 'цифровизация', provenance: 'brief' },
    ])
    expect(result.items[2]).toEqual({ text: 'AI-найденное', provenance: 'research' })
  })

  it('убирает дубли AI (без учёта регистра)', () => {
    const result = seedBlock(block(['Авито', 'SEO']), ['авито'])
    const texts = result.items.map((i) => i.text)
    expect(texts).toEqual(['авито', 'SEO'])
  })

  it('пустой intake → блок не меняется', () => {
    const original = block(['x'])
    expect(seedBlock(original, [])).toBe(original)
    expect(seedBlock(original, ['  '])).toBe(original)
  })

  it('сбрасывает unknown при наличии intake-данных', () => {
    const result = seedBlock({ items: [], unknown: true }, ['Директ'])
    expect(result.unknown).toBe(false)
    expect(result.items).toEqual([{ text: 'Директ', provenance: 'brief' }])
  })
})
