// Кеш курса USD→RUB с ЦБ РФ. TTL 6 часов — пересчёт не критичен по реал-тайму.
// Источник: https://www.cbr-xml-daily.ru/daily_json.js (бесплатный, без ключа).
// Fallback при недоступности — последнее известное значение или 95 (грубо).

const TTL_MS = 6 * 60 * 60 * 1000 // 6 часов
const FALLBACK_RATE = 95 // ₽ за $ если всё упало

interface RateCache {
  value: number
  fetchedAt: number
}

let cache: RateCache | null = null

export async function getUsdRubRate(): Promise<number> {
  // Свежий кеш
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.value
  }

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
      // 5-секундный таймаут чтобы не тормозить запись
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`CBR API ${res.status}`)
    const data = (await res.json()) as {
      Valute?: { USD?: { Value?: number } }
    }
    const rate = data.Valute?.USD?.Value
    if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate in response')

    cache = { value: rate, fetchedAt: Date.now() }
    return rate
  } catch (err) {
    console.warn('[cost/rates] CBR rate fetch failed:', err instanceof Error ? err.message : err)
    // Если есть старый кеш — используем даже протухший
    if (cache) return cache.value
    return FALLBACK_RATE
  }
}
