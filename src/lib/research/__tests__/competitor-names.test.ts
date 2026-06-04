import { describe, it, expect } from 'vitest'
import { parseCompetitorNames } from '../competitor-names'

describe('parseCompetitorNames', () => {
  it('null/undefined/пустая строка → []', () => {
    expect(parseCompetitorNames(null)).toEqual([])
    expect(parseCompetitorNames(undefined)).toEqual([])
    expect(parseCompetitorNames('')).toEqual([])
    expect(parseCompetitorNames('   ')).toEqual([])
  })

  it('запятая-разделитель + URL в скобках убирается', () => {
    expect(
      parseCompetitorNames('Перегонцев и партнёры (gppart.ru), Юском, Генезис (genesis-law.ru)'),
    ).toEqual(['Перегонцев и партнёры', 'Юском', 'Генезис'])
  })

  it('точка с запятой и переводы строк тоже работают', () => {
    expect(parseCompetitorNames('Юском; Генезис\nСМ-Практика')).toEqual([
      'Юском',
      'Генезис',
      'СМ-Практика',
    ])
  })

  it('срезает кавычки и лишние пробелы', () => {
    expect(parseCompetitorNames('  «Содби»  ,   "Правовед.ru"  ')).toEqual(['Содби', 'Правовед.ru'])
  })

  it('фильтрует записи короче 2 символов', () => {
    expect(parseCompetitorNames('А, Юском, , X')).toEqual(['Юском'])
  })

  it('кап по умолчанию = 6, явный кап работает', () => {
    const seven = 'A1,A2,A3,A4,A5,A6,A7'
    expect(parseCompetitorNames(seven).length).toBe(6)
    expect(parseCompetitorNames(seven, 3)).toEqual(['A1', 'A2', 'A3'])
  })
})
