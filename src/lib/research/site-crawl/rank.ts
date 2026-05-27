// Ранжирование найденных URL по релевантности для стратегического анализа +
// жёсткий кап. Чистая логика, без сети. Цель: 8 правильных страниц
// (услуги/кейсы/отзывы/о компании) важнее, чем 300 случайных.

// Паттерны, повышающие приоритет (RU + EN/translit).
const BOOST: Array<[RegExp, number]> = [
  [/услуг|service|uslugi/i, 6],
  [/кейс|case|portfolio|портфолио|проект|project|praktik|практик/i, 6],
  [/отзыв|review|otziv|otzyv|благодар/i, 6],
  [/клиент|client|partner|партн[её]р/i, 5],
  [/о-?комп|о-?нас|about|o-?kompani|o-?nas|company/i, 5],
  [/команд|team|komanda|sotrudnik|эксперт|expert|specialist|advokat|yurist|юрист/i, 4],
  [/цен|price|tarif|тариф|стоимост|cost/i, 4],
  [/наград|лиценз|license|сертификат|certificate|достижен|achievement/i, 4],
]

// Паттерны, понижающие приоритет (служебные/юридические/контентные).
const PENALTY: Array<[RegExp, number]> = [
  [/blog|новост|news|article|стат[ьъ]я|press/i, 3],
  [/polic|privac|terms|oferta|оферт|политик|soglashen|согласи|cookie|disclaimer/i, 8],
  [/login|signin|регистрац|cart|korzin|basket|search|poisk|\?|tag|metk/i, 8],
]

// Расширения, которые не являются HTML-страницами.
const NON_HTML = /\.(pdf|jpe?g|png|gif|svg|webp|ico|css|js|xml|zip|rar|docx?|xlsx?|pptx?|mp4|mp3|woff2?)$/i

function scoreUrl(url: string, origin: string): number {
  const path = url.slice(origin.length) || '/'
  // Главная — всегда в выборке (контакты, оффер первого экрана).
  if (path === '/' || path === '') return 100
  let score = 1
  for (const [re, w] of BOOST) if (re.test(path)) score += w
  for (const [re, w] of PENALTY) if (re.test(path)) score -= w
  // Короткие пути (разделы первого уровня) обычно важнее глубоких.
  const depth = path.split('/').filter(Boolean).length
  if (depth <= 1) score += 1
  if (depth >= 4) score -= 1
  return score
}

// Дедуп, отсев не-HTML и не-same-origin, скоринг, сортировка, кап.
export function rankAndCap(urls: string[], origin: string, cap = 12): string[] {
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const raw of urls) {
    let norm: string
    try {
      const u = new URL(raw, origin)
      if (u.origin !== origin) continue
      norm = u.origin + u.pathname.replace(/\/+$/, '') // без хвостового слэша
      if (norm === origin) norm = origin + '/'
    } catch {
      continue
    }
    if (NON_HTML.test(norm)) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    candidates.push(norm)
  }
  return candidates
    .map((u) => ({ u, s: scoreUrl(u, origin) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, cap)
    .map((x) => x.u)
}
