// UTM helpers — общие для всех форм/страниц.
//
// Стратегия: при первом заходе на любую страницу с utm_*-параметрами в URL,
// сохраняем их в sessionStorage. Дальше любые формы (lead, intake) читают
// оттуда и прокидывают в API. Так атрибуция переживает навигацию между
// страницами в рамках одной сессии браузера.
//
// SessionStorage (не localStorage) — чтобы не «пачкать» атрибуцию между
// разными визитами: каждый новый заход с UTM-меткой создаёт новую сессию.

export interface UtmFields {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

const STORAGE_KEY = 'ai_strategist_utm_v1'
const UTM_KEYS: (keyof UtmFields)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]

// Парсит UTM из URL и сохраняет в sessionStorage. Если в URL нет UTM —
// ничего не делает (сохранённая ранее метка остаётся в силе на сессию).
export function captureUtmFromUrl(): UtmFields | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const fields: UtmFields = {}
    let found = false
    for (const key of UTM_KEYS) {
      const value = params.get(key)
      if (value && value.length > 0) {
        fields[key] = value.slice(0, 100)
        found = true
      }
    }
    if (!found) return null
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
    return fields
  } catch {
    return null
  }
}

// Читает сохранённые UTM из sessionStorage. Используется формами при submit.
export function readUtm(): UtmFields {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as UtmFields
  } catch {
    return {}
  }
}
