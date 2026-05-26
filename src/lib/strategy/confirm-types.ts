// Чистые типы/константы гейта «Подтверди и поправь» — без серверных зависимостей,
// поэтому безопасны для импорта в client-компоненты и в generator (без цикла/бандла БД).

// Откуда взято поле (маркер достоверности в UI).
export type Provenance = 'site' | 'brief' | 'research' | 'ai_guess'

export interface ConfirmItem {
  text: string
  provenance: Provenance
}

// unknown = пользователь отметил «не знаю» → [НЕДОСТАТОЧНО ДАННЫХ].
export interface ConfirmBlock {
  items: ConfirmItem[]
  unknown: boolean
}

export interface Confirmation {
  directions: ConfirmBlock // §1 направления бизнеса (раздельно)
  channelsUsed: ConfirmBlock // §2 каналы, которые клиент УЖЕ использует
  clients: ConfirmBlock // §3 ключевые клиенты/кейсы
  reviews: ConfirmBlock // §4 отзывы/рейтинг
  competitors: ConfirmBlock // §5 конкуренты
  confirmedAt?: string
}

export const BLOCK_KEYS = ['directions', 'channelsUsed', 'clients', 'reviews', 'competitors'] as const
export type BlockKey = (typeof BLOCK_KEYS)[number]

export const BLOCK_LABELS: Record<BlockKey, string> = {
  directions: 'Направления бизнеса',
  channelsUsed: 'Каналы, которые компания уже использует',
  clients: 'Ключевые клиенты и кейсы',
  reviews: 'Отзывы и рейтинг',
  competitors: 'Конкуренты',
}

export const BLOCK_HINTS: Record<BlockKey, string> = {
  directions: 'Если направлений несколько — каждое отдельной строкой, не объединять.',
  channelsUsed: 'Отметьте только те каналы, что РЕАЛЬНО используете. Не уверены — «не знаю».',
  clients: 'Крупные клиенты, референсы, реализованные проекты.',
  reviews: 'Ссылки/площадки с отзывами, рейтинг.',
  competitors: 'AI-найденных проверьте; уберите лишних, добавьте недостающих.',
}

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  site: 'найдено на сайте',
  brief: 'из брифа',
  research: 'из research',
  ai_guess: 'предположение AI — проверьте',
}

// Блоки 1 (направления) и 2 (каналы) обязательны перед генерацией.
export const REQUIRED_BLOCKS: BlockKey[] = ['directions', 'channelsUsed']

function emptyBlock(): ConfirmBlock {
  return { items: [], unknown: false }
}

// Подмешать подтверждённые клиентом значения (intake) в начало блока — они авторитетнее AI-догадок.
// AI-найденные элементы остаются ниже, без дублей (сравнение по lower-case тексту).
export function seedBlock(block: ConfirmBlock, intakeItems: string[]): ConfirmBlock {
  const items = intakeItems.map((t) => t.trim()).filter(Boolean)
  if (items.length === 0) return block
  const seeded: ConfirmItem[] = items.map((text) => ({ text, provenance: 'brief' }))
  const seen = new Set(items.map((t) => t.toLowerCase()))
  const rest = block.items.filter((i) => !seen.has(i.text.toLowerCase()))
  return { items: [...seeded, ...rest], unknown: false }
}

export function emptyConfirmation(): Confirmation {
  return {
    directions: emptyBlock(),
    channelsUsed: emptyBlock(),
    clients: emptyBlock(),
    reviews: emptyBlock(),
    competitors: emptyBlock(),
  }
}

function blockToLine(label: string, block: ConfirmBlock, unknownNote: string): string {
  if (block.unknown) return `${label}: [НЕДОСТАТОЧНО ДАННЫХ — ${unknownNote}]`
  if (block.items.length === 0) return `${label}: [НЕДОСТАТОЧНО ДАННЫХ — не подтверждено]`
  return `${label}: ${block.items.map((i) => i.text).join('; ')}`
}

// Авторитетный блок для инъекции в начало контекста генерации.
// Перекрывает домыслы research; «не знаю»/пусто → явное [НЕДОСТАТОЧНО ДАННЫХ].
export function serializeConfirmation(c: Confirmation): string {
  const lines = [
    '=== ПОДТВЕРЖДЕНО КЛИЕНТОМ (наивысший приоритет — перекрывает любые выводы research) ===',
    blockToLine('Направления бизнеса (описывать РАЗДЕЛЬНО, не склеивать)', c.directions, 'клиент не уточнил'),
    blockToLine(
      'Каналы, которые клиент УЖЕ использует (факт)',
      c.channelsUsed,
      'клиент не уверен — НЕ утверждать использование/неиспользование каналов',
    ),
    blockToLine('Ключевые клиенты/кейсы', c.clients, 'клиент не уточнил'),
    blockToLine('Отзывы/рейтинг', c.reviews, 'клиент не уточнил'),
    blockToLine('Конкуренты (подтверждены клиентом)', c.competitors, 'клиент не уточнил'),
    'ВАЖНО: данные выше — авторитетны. Не противоречь им и не выводи отрицаний из их отсутствия.',
  ]
  return lines.join('\n')
}
