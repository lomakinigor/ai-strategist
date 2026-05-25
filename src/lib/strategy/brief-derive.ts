// Чистые помощники-деривации для визуализации краткого отчёта (KPI, графики).
// Без React и DOM — только разбор строковых значений из BriefReportBlock в числа
// и датасеты. Покрыто unit-тестами (brief-derive.test.ts).

import type { MarketPositionTable, GrowthPotentialTable } from './brief'

export interface NumericParse {
  /** Числовая величина (модуль; знак переносится в prefix). null — числа нет. */
  value: number | null
  /** Текст перед числом, включая знак (+/−) и символы вроде «≈ ». */
  prefix: string
  /** Текст после числа: единицы измерения, %, валюта. */
  suffix: string
}

// Знак · группы тысяч (1 200) ИЛИ простое целое · необязательная десятичная часть.
const NUM_RE = /([+\-−])?((?:\d{1,3}(?:[\s ]\d{3})+)|\d+)([.,]\d+)?/

/**
 * Извлекает первое число из строки с сохранением окружающего текста,
 * чтобы count-up мог анимировать цифру, а единицы измерения остались на месте.
 *   "+40%"      → { value: 40,   prefix: "+",  suffix: "%" }
 *   "27 сек"    → { value: 27,   prefix: "",   suffix: " сек" }
 *   "1 200 ₽"   → { value: 1200, prefix: "",   suffix: " ₽" }
 *   "нет данных"→ { value: null, prefix: "нет данных", suffix: "" }
 */
export function parseLeadingNumber(raw: string): NumericParse {
  const s = raw ?? ''
  const m = NUM_RE.exec(s)
  if (!m) return { value: null, prefix: s, suffix: '' }

  const sign = m[1] ?? ''
  const intDigits = m[2].replace(/[\s ]/g, '')
  const dec = m[3] ? '.' + m[3].slice(1) : ''
  const num = Number(intDigits + dec)
  const value = Number.isFinite(num) ? num : null

  const start = m.index
  const end = start + m[0].length
  const signGlyph = sign === '+' ? '+' : sign === '-' || sign === '−' ? '−' : ''

  return {
    value,
    prefix: s.slice(0, start) + signGlyph,
    suffix: s.slice(end),
  }
}

export interface Kpi {
  label: string
  value: number | null
  prefix: string
  suffix: string
  rawValue: string
  norm: string
  status: 'red' | 'yellow' | 'green'
}

/** Строит карточки KPI из строк блока «позиция на рынке» (не более max). */
export function deriveKpis(market: MarketPositionTable, max = 6): Kpi[] {
  return market.rows.slice(0, max).map((r) => {
    const p = parseLeadingNumber(r.value)
    return {
      label: r.metric,
      value: p.value,
      prefix: p.prefix,
      suffix: p.suffix,
      rawValue: r.value,
      norm: r.norm,
      status: r.status,
    }
  })
}

export interface StatusCounts {
  red: number
  yellow: number
  green: number
}

/** Распределение метрик по светофору — для doughnut-диаграммы «здоровья». */
export function statusCounts(market: MarketPositionTable): StatusCounts {
  const c: StatusCounts = { red: 0, yellow: 0, green: 0 }
  for (const r of market.rows) {
    if (r.status in c) c[r.status]++
  }
  return c
}

export interface GrowthPoint {
  label: string
  value: number
  priority: 'high' | 'medium' | 'low'
}

/** Точки для bar-диаграммы потенциала; строки без числа отбрасываются. */
export function growthChartData(growth: GrowthPotentialTable): GrowthPoint[] {
  return growth.rows
    .map((r) => ({
      label: r.direction,
      value: parseLeadingNumber(r.potential_pct).value,
      priority: r.priority,
    }))
    .filter((p): p is GrowthPoint => p.value != null)
}
