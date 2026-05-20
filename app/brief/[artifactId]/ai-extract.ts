// Extract AI-automation proposals from the full strategy markdown.
//
// The full report contains 🤖 AI-стратег blocks (one per section). Each block describes
// a content/automation idea. We pull the top 3 most distinct proposals for the brief AI section.

export interface AiProposal {
  title: string
  // Plain text with state contrast: "Сейчас: X. После: Y. Эффект: Z."
  description: string
  // Optional structured contrast extracted from text
  before?: string
  after?: string
  effect?: string
}

const STRIP_BOLD = /\*\*/g

function cleanLine(line: string): string {
  return line.replace(STRIP_BOLD, '').replace(/\[(?:ФАКТ|ГИПОТЕЗА|ОЦЕНКА|НЕДОСТАТОЧНО ДАННЫХ)\]/g, '').trim()
}

// Extract sentences after specific markers like "Сейчас:", "После:", "Эффект:"
function extractMarker(text: string, marker: RegExp): string | undefined {
  const match = text.match(marker)
  if (!match) return undefined
  const after = text.slice(match.index! + match[0].length)
  // Take until next double newline or marker
  const stop = after.search(/(?:Сейчас:|После:|После внедрения:|Эффект:|Результат:|Безопасность:|Каналы:|Инструменты:)/i)
  return cleanLine(stop > 0 ? after.slice(0, stop) : after).slice(0, 400)
}

export function extractAiProposals(fullMarkdown: string, maxCount = 3): AiProposal[] {
  if (!fullMarkdown) return []

  // Split into chunks by 🤖 marker
  const robotIdx: number[] = []
  const robotRegex = /🤖/g
  let match: RegExpExecArray | null
  while ((match = robotRegex.exec(fullMarkdown)) !== null) {
    robotIdx.push(match.index)
  }
  if (robotIdx.length === 0) return []

  const proposals: AiProposal[] = []
  const seen = new Set<string>()

  for (let i = 0; i < robotIdx.length; i++) {
    const start = robotIdx[i]
    const end = robotIdx[i + 1] ?? Math.min(start + 1500, fullMarkdown.length)
    const chunk = fullMarkdown.slice(start, end)

    // Skip empty/short chunks
    if (chunk.length < 80) continue

    // Extract title: take first line after 🤖, between ** or until colon
    const firstLine = chunk.split('\n')[0] ?? ''
    const titleMatch =
      firstLine.match(/\*\*([^*]+?)\*\*/) ??
      firstLine.match(/🤖[^:]*:\s*\*?\*?([^*\n.]+)/)
    let title = cleanLine(titleMatch?.[1] ?? '')

    // If still empty or generic, derive from first sentence
    if (!title || title.length < 5) {
      const sentence = chunk.replace(/🤖[^:]*:?\s*/, '').split(/[.\n]/)[0]
      title = cleanLine(sentence).slice(0, 80)
    }

    if (!title || seen.has(title.toLowerCase())) continue
    seen.add(title.toLowerCase())

    const before = extractMarker(chunk, /Сейчас:/i)
    const afterText = extractMarker(chunk, /После(?:\s+внедрения)?:/i)
    const effect = extractMarker(chunk, /(?:Эффект|Результат):/i)

    proposals.push({
      title: title.replace(/^[—\-\s]+|[—\-\s]+$/g, ''),
      description: cleanLine(chunk.replace(/🤖[^:]*:?\s*/, '')).slice(0, 600),
      before,
      after: afterText,
      effect,
    })

    if (proposals.length >= maxCount) break
  }

  return proposals
}
