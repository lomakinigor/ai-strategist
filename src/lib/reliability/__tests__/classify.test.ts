import { describe, it, expect } from 'vitest'
import { classify } from '../classify'
import { rsToConfidence, classifyFactType } from '../rules'
import type { RawDataPoint } from '../../types'

const base: RawDataPoint = {
  data: 'Компания основана в 2010 году',
  source: 'https://company.ru/about',
  date: '2024-01-15',
  rs: 4,
  researchType: 'business',
}

describe('classify', () => {
  it('RS 5 + all fields → FACT + HIGH', () => {
    const result = classify({ ...base, rs: 5 })
    expect(result.type).toBe('FACT')
    expect(result.confidence).toBe('HIGH')
  })

  it('RS 4 + all fields → FACT + HIGH', () => {
    const result = classify(base)
    expect(result.type).toBe('FACT')
    expect(result.confidence).toBe('HIGH')
  })

  it('RS 3 + all fields → FACT + MEDIUM', () => {
    const result = classify({ ...base, rs: 3 })
    expect(result.type).toBe('FACT')
    expect(result.confidence).toBe('MEDIUM')
  })

  it('RS 3 + missing date → HYPOTHESIS + MEDIUM', () => {
    const result = classify({ ...base, rs: 3, date: '' })
    expect(result.type).toBe('HYPOTHESIS')
    expect(result.confidence).toBe('MEDIUM')
  })

  it('RS 2 + has data and source → HYPOTHESIS + LOW', () => {
    const result = classify({ ...base, rs: 2 })
    expect(result.type).toBe('HYPOTHESIS')
    expect(result.confidence).toBe('LOW')
  })

  it('RS 1 → INSUFFICIENT_DATA + LOW', () => {
    const result = classify({ ...base, rs: 1 })
    expect(result.type).toBe('INSUFFICIENT_DATA')
    expect(result.confidence).toBe('LOW')
  })

  it('missing source → INSUFFICIENT_DATA', () => {
    const result = classify({ ...base, source: '' })
    expect(result.type).toBe('INSUFFICIENT_DATA')
  })

  it('empty data → INSUFFICIENT_DATA', () => {
    const result = classify({ ...base, data: '' })
    expect(result.type).toBe('INSUFFICIENT_DATA')
  })

  it('RS 4 + strong source but whitespace-only data → INSUFFICIENT_DATA (boundary case)', () => {
    const result = classify({ ...base, rs: 4, data: '   ' })
    expect(result.type).toBe('INSUFFICIENT_DATA')
  })

  it('preserves researchType from input', () => {
    const result = classify({ ...base, researchType: 'market' })
    expect(result.researchType).toBe('market')
  })
})

describe('rsToConfidence', () => {
  it('RS 5 → HIGH', () => expect(rsToConfidence(5)).toBe('HIGH'))
  it('RS 4 → HIGH', () => expect(rsToConfidence(4)).toBe('HIGH'))
  it('RS 3 → MEDIUM', () => expect(rsToConfidence(3)).toBe('MEDIUM'))
  it('RS 2 → LOW', () => expect(rsToConfidence(2)).toBe('LOW'))
  it('RS 1 → LOW', () => expect(rsToConfidence(1)).toBe('LOW'))
})

describe('classifyFactType edge cases', () => {
  it('RS 3 + no source → INSUFFICIENT_DATA despite strong score', () => {
    expect(classifyFactType(3, false, true, true)).toBe('INSUFFICIENT_DATA')
  })

  it('RS 4 + no date → HYPOTHESIS (date required for FACT)', () => {
    expect(classifyFactType(4, true, false, true)).toBe('HYPOTHESIS')
  })
})
