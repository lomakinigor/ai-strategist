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

describe('buildFullReportPrompt — decision-driven форма §0–8', () => {
  it('содержит все 9 заголовков новой формы в формате «## N. ...»', () => {
    const { user } = buildFullReportPrompt(baseCtx)
    expect(user).toContain('## 0. РЕЗЮМЕ ДЛЯ СОБСТВЕННИКА')
    expect(user).toContain('## 1. ДИАГНОЗ РОСТА')
    expect(user).toContain('## 2. ПОЗИЦИОНИРОВАНИЕ И АУДИТОРИЯ')
    expect(user).toContain('## 3. МАРКЕТИНГОВЫЙ МИКС')
    expect(user).toContain('## 4. AI-АВТОМАТИЗАЦИЯ')
    expect(user).toContain('## 5. ПЛАН ДЕЙСТВИЙ')
    expect(user).toContain('## 6. ПРОГРАММА ТЕСТОВ')
    expect(user).toContain('## 7. РИСКИ И МЕРЫ')
    expect(user).toContain('## 8. ИСТОЧНИКИ')
  })

  it('кодирует ключевые принципы формы: факт один раз, привязка к узкому месту, два исхода теста', () => {
    const { user } = buildFullReportPrompt(baseCtx)
    // §1 — факты заявляются один раз
    expect(user).toMatch(/один раз|дальше.*используются/i)
    // §4 — каждый AI-рычаг ссылается на узкое место (\S, т.к. \w не матчит кириллицу)
    expect(user).toMatch(/узк\S* мест/i)
    // §6 — у теста два исхода
    expect(user).toMatch(/при провале|два исхода/i)
  })

  it('задаёт компактный объём (не 3000–5000, а ~1500–2500 слов)', () => {
    const { system, user } = buildFullReportPrompt(baseCtx)
    const both = system + user
    expect(both).toMatch(/1500.*2500|1500–2500/)
    expect(both).not.toMatch(/3000.*5000|3000–5000/)
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

  it('требует приложение «Источники» с источником, датой и RS', () => {
    const { user } = buildFullReportPrompt(baseCtx)
    expect(user).toMatch(/источник/i)
    expect(user).toMatch(/RS/)
    expect(user).toMatch(/дат/i)
  })

  it('кодирует анти-домысел гарды: нет-вывода-из-отсутствия, раздельные направления, named-конкуренты, полнота каналов', () => {
    const { system, user } = buildFullReportPrompt(baseCtx)
    const both = system + user
    // запрет вывода из отсутствия данных
    expect(both).toMatch(/ЗАПРЕТ ВЫВОДА ИЗ ОТСУТСТВИЯ|не выводи отрицание/i)
    // ≥2 направления — раздельно, без склейки
    expect(user).toMatch(/РАЗДЕЛЬНО|СКЛЕЙКИ/i)
    // конкуренты названы конкретно, с пометкой найден AI
    expect(user).toMatch(/найден AI/i)
    // все перспективные каналы ниши, каждый рекомендуем/не сейчас
    expect(user).toMatch(/ВСЕ перспективные|не сейчас/i)
  })
})

describe('parseSections — новая форма §0–8', () => {
  it('распознаёт заголовки decision-driven формы в новые id', () => {
    const md = `## 0. РЕЗЮМЕ ДЛЯ СОБСТВЕННИКА
текст
## 1. ДИАГНОЗ РОСТА — УЗКИЕ МЕСТА
текст
## 2. ПОЗИЦИОНИРОВАНИЕ И АУДИТОРИЯ
текст
## 3. МАРКЕТИНГОВЫЙ МИКС ПОД НИШУ
текст
## 4. AI-АВТОМАТИЗАЦИЯ
текст
## 5. ПЛАН ДЕЙСТВИЙ ПО ГОРИЗОНТАМ
текст
## 6. ПРОГРАММА ТЕСТОВ ПРОДВИЖЕНИЯ
текст
## 7. РИСКИ И МЕРЫ
текст
## 8. ИСТОЧНИКИ
текст`
    const ids = parseSections(md).map((s) => s.id)
    expect(ids).toEqual([
      'summary',
      'diagnosis',
      'positioning',
      'channel_mix',
      'ai_automation',
      'action_plan',
      'tests',
      'risks',
      'sources',
    ])
  })

  it('сохраняет обратную совместимость со старой тематической формой', () => {
    const md = `## 1. ПРОФИЛЬ БИЗНЕСА
текст
## 2. РЫНОЧНАЯ ПОЗИЦИЯ
текст
## 4. КАНАЛЫ ПРИВЛЕЧЕНИЯ
текст
## 7. СТРАТЕГИЯ РОСТА
текст
## 8. ГИПОТЕЗЫ ДЛЯ ПРОВЕРКИ (H1–H6)
текст`
    const ids = parseSections(md).map((s) => s.id)
    expect(ids).toContain('business')
    expect(ids).toContain('market')
    expect(ids).toContain('channels')
    expect(ids).toContain('strategy')
    expect(ids).toContain('hypotheses')
  })
})
