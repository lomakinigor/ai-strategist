// Парсер списка конкурентов из intake — чистая функция, тестируется отдельно.
// Вход: «Перегонцев и партнёры (gppart.ru), Юском, Генезис (genesis-law.ru)» (или null).
// Выход: ['Перегонцев и партнёры', 'Юском', 'Генезис'] — только имена, без URL-хвостов.

const MAX_COMPETITORS = 6 // кап для fan-out по стоимости

export function parseCompetitorNames(raw: string | null | undefined, cap = MAX_COMPETITORS): string[] {
  if (!raw) return []
  return raw
    .split(/[,;\n]/)
    .map((s) => s
      // убираем хвост в скобках с URL/доменом: «Имя (site.ru)» → «Имя»
      .replace(/\s*\([^)]*\)\s*$/, '')
      // убираем висящие кавычки/спецсимволы
      .replace(/^[«"'\s]+|[»"'\s]+$/g, '')
      .trim(),
    )
    .filter((s) => s.length >= 2)
    .slice(0, cap)
}
