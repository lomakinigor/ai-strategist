import { describe, it, expect } from 'vitest'
import {
  parseLeadingNumber,
  deriveKpis,
  statusCounts,
  growthChartData,
} from '../brief-derive'
import type { MarketPositionTable, GrowthPotentialTable } from '../brief'

describe('parseLeadingNumber', () => {
  it('парсит простой процент', () => {
    expect(parseLeadingNumber('42%')).toEqual({ value: 42, prefix: '', suffix: '%' })
  })

  it('сохраняет знак плюс в префиксе', () => {
    expect(parseLeadingNumber('+40%')).toEqual({ value: 40, prefix: '+', suffix: '%' })
  })

  it('нормализует минус в префиксе', () => {
    expect(parseLeadingNumber('-15%')).toEqual({ value: 15, prefix: '−', suffix: '%' })
  })

  it('отделяет число от единицы измерения', () => {
    expect(parseLeadingNumber('27 сек')).toEqual({ value: 27, prefix: '', suffix: ' сек' })
  })

  it('убирает пробел-разделитель тысяч', () => {
    expect(parseLeadingNumber('1 200 ₽')).toEqual({ value: 1200, prefix: '', suffix: ' ₽' })
  })

  it('понимает десятичную запятую', () => {
    expect(parseLeadingNumber('1,5 млн ₽')).toEqual({ value: 1.5, prefix: '', suffix: ' млн ₽' })
  })

  it('сохраняет текстовый префикс перед числом', () => {
    expect(parseLeadingNumber('≈ 2×')).toEqual({ value: 2, prefix: '≈ ', suffix: '×' })
  })

  it('возвращает null для нечисловой строки', () => {
    expect(parseLeadingNumber('нет данных')).toEqual({
      value: null,
      prefix: 'нет данных',
      suffix: '',
    })
  })

  it('не падает на пустой строке', () => {
    expect(parseLeadingNumber('')).toEqual({ value: null, prefix: '', suffix: '' })
  })
})

const market: MarketPositionTable = {
  rows: [
    { metric: 'Конверсия сайта', value: '1,2%', norm: '3%', status: 'red' },
    { metric: 'Скорость ответа', value: '27 сек', norm: '15 сек', status: 'yellow' },
    { metric: 'Средний чек', value: '12 000 ₽', norm: '10 000 ₽', status: 'green' },
    { metric: 'Рейтинг', value: '4,7', norm: '4,5', status: 'green' },
  ],
}

describe('deriveKpis', () => {
  it('строит KPI из строк позиции с разбором значений', () => {
    const kpis = deriveKpis(market)
    expect(kpis).toHaveLength(4)
    expect(kpis[0]).toMatchObject({
      label: 'Конверсия сайта',
      value: 1.2,
      suffix: '%',
      norm: '3%',
      status: 'red',
      rawValue: '1,2%',
    })
    expect(kpis[2]).toMatchObject({ label: 'Средний чек', value: 12000, suffix: ' ₽' })
  })

  it('ограничивает количество KPI параметром max', () => {
    expect(deriveKpis(market, 2)).toHaveLength(2)
  })
})

describe('statusCounts', () => {
  it('считает распределение светофора', () => {
    expect(statusCounts(market)).toEqual({ red: 1, yellow: 1, green: 2 })
  })
})

const growth: GrowthPotentialTable = {
  rows: [
    { direction: 'SEO', potential_pct: '+40%', deadline: '3 мес', priority: 'high' },
    { direction: 'Telegram Ads', potential_pct: '+25%', deadline: '1 мес', priority: 'medium' },
    { direction: 'Сарафан', potential_pct: 'нет данных', deadline: '—', priority: 'low' },
  ],
}

describe('growthChartData', () => {
  it('извлекает числовой потенциал и отбрасывает строки без цифры', () => {
    const data = growthChartData(growth)
    expect(data).toEqual([
      { label: 'SEO', value: 40, priority: 'high' },
      { label: 'Telegram Ads', value: 25, priority: 'medium' },
    ])
  })
})
