import { describe, it, expect } from 'vitest'
import { normalizeAdChannel } from '../normalize'

describe('normalizeAdChannel — синонимы рекламных каналов → канон', () => {
  it('кейс Репутация: Директ / 2GIS / Телеграм / Авито', () => {
    expect(normalizeAdChannel('Яндекс.Директ')).toBe('Яндекс.Директ')
    expect(normalizeAdChannel('Директ')).toBe('Яндекс.Директ')
    expect(normalizeAdChannel('реклама с платформы 2GIS')).toBe('2ГИС/Карты')
    expect(normalizeAdChannel('Телеграм-каналы компании')).toBe('Telegram')
    expect(normalizeAdChannel('реклама с Авито')).toBe('Авито')
  })

  it('прочие синонимы', () => {
    expect(normalizeAdChannel('SEO')).toBe('SEO')
    expect(normalizeAdChannel('сео-продвижение')).toBe('SEO')
    expect(normalizeAdChannel('ВК')).toBe('ВКонтакте')
    expect(normalizeAdChannel('почтовая рассылка')).toBe('Email-рассылка')
    expect(normalizeAdChannel('участие в тендерах')).toBe('Выставки/тендеры')
    expect(normalizeAdChannel('Яндекс.Карты')).toBe('2ГИС/Карты')
  })

  it('канал не из списка → null (уйдёт в «Другое»)', () => {
    expect(normalizeAdChannel('наружная реклама')).toBeNull()
    expect(normalizeAdChannel('радио')).toBeNull()
    expect(normalizeAdChannel('')).toBeNull()
  })
})
