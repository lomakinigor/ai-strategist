// Parse brief markdown into structured sections.
//
// Expected brief format (from generateBriefReport):
//
//   **Бизнес**
//   ВЫВОД: ...
//   • Факт 1
//   • Факт 2
//   • Факт 3
//   ДЕЙСТВИЕ: ...

export type SectionId =
  | 'snapshot'
  | 'business'
  | 'market'
  | 'audience'
  | 'channels'
  | 'competitors'
  | 'strategy'
  | 'other'

export interface BriefSection {
  id: SectionId
  title: string
  vivod: string | null
  facts: string[]
  action: string | null
}

const TITLE_TO_ID: Record<string, SectionId> = {
  'executive snapshot': 'snapshot',
  'snapshot': 'snapshot',
  'бизнес': 'business',
  'рынок': 'market',
  'аудитория': 'audience',
  'каналы': 'channels',
  'конкуренты': 'competitors',
  'стратегия': 'strategy',
}

function classifyTitle(title: string): SectionId {
  const normalized = title.toLowerCase().trim()
  if (normalized.includes('executive') || normalized.includes('snapshot')) return 'snapshot'
  for (const key in TITLE_TO_ID) {
    if (normalized.includes(key)) return TITLE_TO_ID[key]
  }
  return 'other'
}

function stripMarkers(text: string): string {
  return text
    .replace(/\[ФАКТ\]/g, '')
    .replace(/\[ГИПОТЕЗА\]/g, '')
    .replace(/\[НЕДОСТАТОЧНО ДАННЫХ\]/g, '')
    .replace(/\[ОЦЕНКА\]/g, '')
    .replace(/\*\*/g, '')
    .trim()
}

export function parseBriefMarkdown(markdown: string): BriefSection[] {
  const sections: BriefSection[] = []
  const lines = markdown.split('\n')

  let current: BriefSection | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Section heading: **Title** or ## Title or # Title
    const boldMatch = line.match(/^\*\*(.+?)\*\*:?\s*$/)
    const headerMatch = line.match(/^#{1,3}\s+(.+?)$/)
    const titleText = boldMatch?.[1] ?? headerMatch?.[1]

    if (titleText && !line.toLowerCase().startsWith('**вывод') && !line.toLowerCase().startsWith('**действие')) {
      if (current) sections.push(current)
      const cleanTitle = stripMarkers(titleText)
      current = {
        id: classifyTitle(cleanTitle),
        title: cleanTitle,
        vivod: null,
        facts: [],
        action: null,
      }
      continue
    }

    if (!current) continue

    // ВЫВОД:
    const vivodMatch = line.match(/^(?:\*\*)?ВЫВОД:?\*?\*?\s*(.+)$/i)
    if (vivodMatch) {
      current.vivod = stripMarkers(vivodMatch[1])
      continue
    }

    // ДЕЙСТВИЕ:
    const actionMatch = line.match(/^(?:\*\*)?ДЕЙСТВИЕ:?\*?\*?\s*(.+)$/i)
    if (actionMatch) {
      current.action = stripMarkers(actionMatch[1])
      continue
    }

    // Bullet facts
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      const fact = stripMarkers(line.replace(/^[•\-*]\s*/, ''))
      if (fact) current.facts.push(fact)
      continue
    }

    // Multi-line ВЫВОД or ДЕЙСТВИЕ continuation
    if (current.action && !line.startsWith('**') && current.facts.length === 0) {
      current.action += ' ' + stripMarkers(line)
    } else if (current.vivod && current.facts.length === 0 && !current.action) {
      current.vivod += ' ' + stripMarkers(line)
    }
  }

  if (current) sections.push(current)

  return sections.filter((s) => s.vivod || s.facts.length > 0 || s.action)
}
