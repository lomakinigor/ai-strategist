import { describe, it, expect } from 'vitest'
import { RESEARCH_PROMPTS } from '../openai-research-provider'
import type { ResearchQuery } from '@/lib/types'

const base: ResearchQuery = {
  companyName: 'БЕЛФИН',
  industry: 'промышленное оборудование',
}

describe('RESEARCH_PROMPTS — direction threading (business)', () => {
  it('перечисляет подтверждённые направления и требует раздельного анализа при independent=true', () => {
    const q: ResearchQuery = {
      ...base,
      directions: { items: ['производство дробемётов', 'цифровизация производств'], independent: true },
    }
    const prompt = RESEARCH_PROMPTS.business(q)
    expect(prompt).toContain('производство дробемётов')
    expect(prompt).toContain('цифровизация производств')
    expect(prompt).toMatch(/ОТДЕЛЬНО|раздельно/i)
  })

  it('при independent=false помечает направления как одно связанное предложение', () => {
    const q: ResearchQuery = {
      ...base,
      directions: { items: ['монтаж', 'обслуживание'], independent: false },
    }
    const prompt = RESEARCH_PROMPTS.business(q)
    expect(prompt).toMatch(/связанное предложение/i)
  })

  it('без directions не добавляет блок подтверждённых направлений', () => {
    const prompt = RESEARCH_PROMPTS.business(base)
    expect(prompt).not.toContain('Клиент подтвердил направления')
  })
})

describe('RESEARCH_PROMPTS — used-channels threading (channels)', () => {
  it('перечисляет подтверждённые клиентом каналы и запрещает вывод «не использует»', () => {
    const q: ResearchQuery = { ...base, adChannels: ['Яндекс.Директ', 'Авито'] }
    const prompt = RESEARCH_PROMPTS.channels(q)
    expect(prompt).toContain('Яндекс.Директ')
    expect(prompt).toContain('Авито')
    expect(prompt).toMatch(/НЕ пиши, что клиент их не использует/i)
  })

  it('без adChannels не добавляет блок подтверждённых каналов', () => {
    const prompt = RESEARCH_PROMPTS.channels(base)
    expect(prompt).not.toContain('Клиент ПОДТВЕРДИЛ')
  })
})
