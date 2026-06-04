import { describe, it, expect } from 'vitest'
import { detectAiAgents } from '../ai-agents'

describe('detectAiAgents', () => {
  it('детектит Jivo (типовой РФ-чат)', () => {
    const html = '<script src="//code.jivosite.com/widget/XYZ" async></script>'
    const r = detectAiAgents(html)
    expect(r.present).toBe(true)
    expect(r.detected).toContain('Jivo')
  })

  it('детектит Bitrix24 + Marquiz (несколько одновременно)', () => {
    const html = '<script src="https://cdn-ru.bitrix24.ru/b24-widget.js"></script><script src="//marquiz.ru/s/123.js"></script>'
    const r = detectAiAgents(html)
    expect(r.present).toBe(true)
    expect(r.detected).toEqual(expect.arrayContaining(['Bitrix24', 'Marquiz']))
  })

  it('детектит текстовое упоминание AI-ассистента', () => {
    const html = '<p>Наш ИИ-ассистент ответит за минуту</p>'
    expect(detectAiAgents(html).present).toBe(true)
  })

  it('чистый сайт без виджетов → present=false', () => {
    const html = '<html><body><h1>Услуги</h1><p>Описание</p></body></html>'
    const r = detectAiAgents(html)
    expect(r.present).toBe(false)
    expect(r.detected).toEqual([])
  })

  it('не путает upper/lower case', () => {
    expect(detectAiAgents('<div>JIVOCHAT-widget</div>').present).toBe(true)
  })
})
