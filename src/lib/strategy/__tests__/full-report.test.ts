import { describe, it, expect } from 'vitest'
import { buildFullReportPrompt, type FullReportPromptContext } from '../prompts'
import { parseSections } from '../generator'

const baseCtx: FullReportPromptContext = {
  companyName: 'ООО Тест',
  companySite: 'https://test.ru',
  niche: { id: 'legal_services', displayName: 'Юридические услуги', file: 'legal_services.md', keywords: [] },
  goal: 'рост заявок',
  factsMarkdown: '=== Анализ бизнеса ===\n[ФАКТ] выручка X',
  kbRequirements: '# Универсальные требования\nМаркировка ФАКТ/ГИПОТЕЗА',
}

describe('buildFullReportPrompt', () => {
  it('содержит все 8 заголовков разделов в формате «## N. ...»', () => {
    const { user } = buildFullReportPrompt(baseCtx)
    expect(user).toContain('## 1. ПРОФИЛЬ БИЗНЕСА')
    expect(user).toContain('## 2. РЫНОЧНАЯ ПОЗИЦИЯ')
    expect(user).toContain('## 3. ЦЕЛЕВАЯ АУДИТОРИЯ')
    expect(user).toContain('## 4. КАНАЛЫ ПРИВЛЕЧЕНИЯ')
    expect(user).toContain('## 5. КОНКУРЕНТНЫЙ ЛАНДШАФТ')
    expect(user).toContain('## 6. AI-АВТОМАТИЗАЦИЯ')
    expect(user).toContain('## 7. СТРАТЕГИЯ РОСТА')
    expect(user).toContain('## 8. ГИПОТЕЗЫ ДЛЯ ПРОВЕРКИ')
  })

  it('задаёт объём 3000–5000 слов', () => {
    const { system, user } = buildFullReportPrompt(baseCtx)
    expect(system).toMatch(/3000.*5000|3000–5000/)
    expect(user).toMatch(/3000.*5000|3000–5000/)
  })

  it('прокидывает требования базы знаний и факты в user-промпт', () => {
    const { user } = buildFullReportPrompt(baseCtx)
    expect(user).toContain('Универсальные требования')
    expect(user).toContain('[ФАКТ] выручка X')
    expect(user).toContain('Юридические услуги')
  })

  it('обрабатывает niche=null как универсальную', () => {
    const { user } = buildFullReportPrompt({ ...baseCtx, niche: null })
    expect(user).toContain('не определена')
    expect(user).not.toContain('undefined')
  })

  it('system-промпт сохраняет ключевые guardrails (маркировка, рубли)', () => {
    const { system } = buildFullReportPrompt(baseCtx)
    expect(system).toContain('[ФАКТ]')
    expect(system).toContain('рубл')
  })
})

describe('parseSections — новые 8 разделов FULL_REPORT', () => {
  it('распознаёт заголовки FULL_REPORT, включая AI-автоматизацию и Гипотезы', () => {
    const md = `## 1. ПРОФИЛЬ БИЗНЕСА
текст
## 2. РЫНОЧНАЯ ПОЗИЦИЯ
текст
## 6. AI-АВТОМАТИЗАЦИЯ
текст
## 8. ГИПОТЕЗЫ ДЛЯ ПРОВЕРКИ (H1–H6)
текст`
    const sections = parseSections(md)
    const ids = sections.map((s) => s.id)
    expect(ids).toContain('business')
    expect(ids).toContain('market')
    expect(ids).toContain('ai_automation')
    expect(ids).toContain('hypotheses')
  })

  it('сохраняет обратную совместимость со старыми заголовками', () => {
    const md = `## 1. Анализ бизнеса
текст
## 5. Стратегия и рекомендации
текст`
    const sections = parseSections(md)
    const ids = sections.map((s) => s.id)
    expect(ids).toContain('business')
    expect(ids).toContain('strategy')
  })
})
