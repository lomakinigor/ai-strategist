import { describe, it, expect } from 'vitest'
import { parseBriefReport, BriefParseError } from '../brief-parser'
import { buildBriefReportPrompt, type BriefReportBlock } from '../brief'

const VALID_BRIEF: BriefReportBlock = {
  market_position: {
    rows: [
      { metric: 'Скорость сайта', value: '14/100', norm: '70+', status: 'red' },
      { metric: 'Трафик/мес', value: '200 визитов', norm: '5000+', status: 'red' },
      { metric: 'SEO-позиции', value: '15–40', norm: 'Топ-5', status: 'red' },
    ],
  },
  critical_bottlenecks: [
    { problem: 'Скорость сайта 27 сек', metric: 'PageSpeed 14/100', consequence: 'Потеря 70% мобильного трафика' },
    { problem: 'Нет контекстной рекламы', metric: '0 ₽/мес', consequence: 'Конкуренты занимают платный спрос' },
    { problem: 'SEO в хвосте', metric: 'Позиции 15–40', consequence: 'CTR < 1%' },
  ],
  growth_potential: {
    rows: [
      { direction: 'SEO-оптимизация', potential_pct: '+300%', deadline: '3 месяца', priority: 'high' },
      { direction: 'Контекстная реклама', potential_pct: '+150%', deadline: '2 недели', priority: 'high' },
    ],
  },
  ai_levers: [
    { tool: 'ChatGPT API', automates: 'Типовые документы', effect: '-80% времени', launch_deadline: '2 недели' },
    { tool: 'Jivosite AI', automates: 'Квалификация лидов', effect: '+40% конверсия', launch_deadline: '1 неделя' },
    { tool: 'Dify.ai', automates: 'Анализ практики', effect: '-60% времени', launch_deadline: '1 месяц' },
  ],
  next_actions: [
    { action: 'Исправить Core Web Vitals', deadline: '3 дня', owner: 'разработчик', kpi: 'PageSpeed > 50' },
    { action: 'Запустить Яндекс.Директ', deadline: '1 неделя', owner: 'маркетолог', kpi: '50+ заявок/мес' },
    { action: 'Установить AI чат-бот', deadline: '2 недели', owner: 'собственник', kpi: '+30% конверсия' },
  ],
  ab_hypotheses: [
    { id: 'H1', hypothesis: 'Калькулятор повысит конверсию', metric: 'Конверсия', test_method: 'A/B тест', deadline: '30 дней' },
    { id: 'H2', hypothesis: 'Кейсы повысят доверие', metric: 'CTR кнопки', test_method: 'A/B страниц', deadline: '45 дней' },
  ],
}

describe('parseBriefReport', () => {
  it('парсит валидный JSON без обёртки', () => {
    const result = parseBriefReport(JSON.stringify(VALID_BRIEF))
    expect(result.market_position.rows).toHaveLength(3)
    expect(result.critical_bottlenecks).toHaveLength(3)
    expect(result.ai_levers).toHaveLength(3)
    expect(result.next_actions).toHaveLength(3)
    expect(result.ab_hypotheses).toHaveLength(2)
  })

  it('парсит JSON в markdown-обёртке ```json```', () => {
    const raw = '```json\n' + JSON.stringify(VALID_BRIEF) + '\n```'
    const result = parseBriefReport(raw)
    expect(result.market_position.rows[0].status).toBe('red')
  })

  it('извлекает JSON из текста с преамбулой модели', () => {
    const raw = 'Вот ваш отчёт:\n' + JSON.stringify(VALID_BRIEF) + '\nГотово.'
    const result = parseBriefReport(raw)
    expect(result.critical_bottlenecks).toHaveLength(3)
  })

  it('нормализует невалидный status → yellow', () => {
    const bad = { market_position: { rows: [{ metric: 'X', value: 'Y', norm: 'Z', status: 'bad' }] } }
    const result = parseBriefReport(JSON.stringify(bad))
    expect(result.market_position.rows[0].status).toBe('yellow')
  })

  it('нормализует невалидный priority → medium', () => {
    const bad = { growth_potential: { rows: [{ direction: 'X', potential_pct: '+10%', deadline: '1 мес', priority: 'ultra' }] } }
    const result = parseBriefReport(JSON.stringify(bad))
    expect(result.growth_potential.rows[0].priority).toBe('medium')
  })

  it('возвращает пустые массивы для отсутствующих блоков', () => {
    const result = parseBriefReport('{}')
    expect(result.critical_bottlenecks).toEqual([])
    expect(result.ai_levers).toEqual([])
    expect(result.ab_hypotheses).toEqual([])
    expect(result.market_position.rows).toEqual([])
  })

  it('ограничивает critical_bottlenecks/ai_levers/next_actions тремя элементами', () => {
    const many = {
      critical_bottlenecks: Array.from({ length: 6 }, (_, i) => ({ problem: `p${i}`, metric: 'm', consequence: 'c' })),
      ai_levers: Array.from({ length: 6 }, (_, i) => ({ tool: `t${i}`, automates: 'a', effect: 'e', launch_deadline: 'd' })),
    }
    const result = parseBriefReport(JSON.stringify(many))
    expect(result.critical_bottlenecks).toHaveLength(3)
    expect(result.ai_levers).toHaveLength(3)
  })

  it('бросает BriefParseError для невалидного JSON', () => {
    expect(() => parseBriefReport('not valid json {{{')).toThrow(BriefParseError)
  })
})

describe('buildBriefReportPrompt', () => {
  it('включает имя компании и нишу', () => {
    const prompt = buildBriefReportPrompt('ГЛК Репутация', 'Юридические услуги', 'full report', 'kb text')
    expect(prompt).toContain('ГЛК Репутация')
    expect(prompt).toContain('Юридические услуги')
  })

  it('включает требования базы знаний и полный отчёт', () => {
    const prompt = buildBriefReportPrompt('X', 'legal', 'ТЕКСТ ОТЧЁТА', 'ОБЯЗАТЕЛЬНЫЕ БЛОКИ')
    expect(prompt).toContain('ОБЯЗАТЕЛЬНЫЕ БЛОКИ')
    expect(prompt).toContain('ТЕКСТ ОТЧЁТА')
  })

  it('содержит все 6 ключей JSON-структуры', () => {
    const prompt = buildBriefReportPrompt('X', 'legal', 'report', 'kb')
    expect(prompt).toContain('market_position')
    expect(prompt).toContain('critical_bottlenecks')
    expect(prompt).toContain('growth_potential')
    expect(prompt).toContain('ai_levers')
    expect(prompt).toContain('next_actions')
    expect(prompt).toContain('ab_hypotheses')
  })

  it('задаёт объём 600–900 слов', () => {
    const prompt = buildBriefReportPrompt('X', 'legal', 'report', 'kb')
    expect(prompt).toMatch(/600.*900/)
  })
})
