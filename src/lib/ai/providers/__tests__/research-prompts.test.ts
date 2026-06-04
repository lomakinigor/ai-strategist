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

describe('RESEARCH_PROMPTS — competitor_single (fan-out, 6 уровней)', () => {
  it('включает имя конкурента, ниши и все 6 уровней с метками', () => {
    const q: ResearchQuery = { ...base, competitorName: 'Юском' }
    const prompt = RESEARCH_PROMPTS.competitor_single(q)
    expect(prompt).toContain('Юском')
    expect(prompt).toContain(base.industry)
    // Все 6 уровней — это и есть жёсткий контракт схемы
    for (const level of ['Offer', 'Audience', 'Pain', 'Proof', 'Creative', 'Landing structure']) {
      expect(prompt).toContain(level)
    }
    // Анти-домысел: если сайт не подтверждён — стоп, не выдумываем
    expect(prompt).toMatch(/НЕ НАЙДЕН|сайт не подтверждён/i)
  })

  it('без competitorName ставит явный «<не указан>», чтобы не молча уйти', () => {
    const prompt = RESEARCH_PROMPTS.competitor_single(base)
    expect(prompt).toContain('<не указан>')
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
