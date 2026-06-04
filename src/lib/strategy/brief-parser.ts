import type { BriefReportBlock } from './brief'

export class BriefParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message)
    this.name = 'BriefParseError'
  }
}

// Извлекает JSON из ответа модели: снимает ```json ... ``` обёртку либо берёт
// фрагмент от первой { до последней }.
function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenceMatch) return fenceMatch[1]

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1)
  }

  return raw
}

function validateStatus(status: unknown): 'red' | 'yellow' | 'green' {
  if (status === 'red' || status === 'yellow' || status === 'green') return status
  return 'yellow'
}

function validatePriority(priority: unknown): 'high' | 'medium' | 'low' {
  if (priority === 'high' || priority === 'medium' || priority === 'low') return priority
  return 'medium'
}

function rowsOf(block: unknown): Record<string, unknown>[] {
  const rows = (block as { rows?: unknown })?.rows
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
}

function parseStringArray(input: unknown, maxLen: number): string[] {
  if (!Array.isArray(input)) return []
  return (input as unknown[])
    .map((s) => String(s ?? '').trim())
    .filter((s) => s.length > 0)
    .slice(0, maxLen)
}

function parseCompetitorLandscape(input: unknown): {
  competitors: Array<{ name: string; focus: string; strength: string; weakness: string }>
  patterns: string[]
  white_spots: string[]
} {
  const obj = (input ?? {}) as Record<string, unknown>
  const competitors = Array.isArray(obj.competitors)
    ? (obj.competitors as Record<string, unknown>[]).slice(0, 6).map((c) => ({
        name: String(c.name ?? '').trim(),
        focus: String(c.focus ?? '').trim(),
        strength: String(c.strength ?? '').trim(),
        weakness: String(c.weakness ?? '').trim(),
      })).filter((c) => c.name.length > 0)
    : []
  return {
    competitors,
    patterns: parseStringArray(obj.patterns, 3),
    white_spots: parseStringArray(obj.white_spots, 3),
  }
}

export function parseBriefReport(raw: string): BriefReportBlock {
  const jsonStr = extractJSON(raw)

  let data: Record<string, unknown>
  try {
    data = JSON.parse(jsonStr) as Record<string, unknown>
  } catch (e) {
    throw new BriefParseError(`Не удалось распарсить JSON краткого отчёта: ${String(e)}`, raw)
  }

  return {
    market_position: {
      rows: rowsOf(data.market_position).map((row) => ({
        metric: String(row.metric ?? ''),
        value: String(row.value ?? ''),
        norm: String(row.norm ?? ''),
        status: validateStatus(row.status),
      })),
    },

    critical_bottlenecks: Array.isArray(data.critical_bottlenecks)
      ? (data.critical_bottlenecks as Record<string, unknown>[]).slice(0, 3).map((b) => ({
          problem: String(b.problem ?? ''),
          metric: String(b.metric ?? ''),
          consequence: String(b.consequence ?? ''),
        }))
      : [],

    competitor_landscape: parseCompetitorLandscape(data.competitor_landscape),

    growth_potential: {
      rows: rowsOf(data.growth_potential).map((row) => ({
        direction: String(row.direction ?? ''),
        potential_pct: String(row.potential_pct ?? ''),
        deadline: String(row.deadline ?? ''),
        priority: validatePriority(row.priority),
      })),
    },

    ai_levers: Array.isArray(data.ai_levers)
      ? (data.ai_levers as Record<string, unknown>[]).slice(0, 3).map((l) => ({
          tool: String(l.tool ?? ''),
          automates: String(l.automates ?? ''),
          effect: String(l.effect ?? ''),
          launch_deadline: String(l.launch_deadline ?? ''),
        }))
      : [],

    next_actions: Array.isArray(data.next_actions)
      ? (data.next_actions as Record<string, unknown>[]).slice(0, 3).map((a) => ({
          action: String(a.action ?? ''),
          deadline: String(a.deadline ?? ''),
          owner: String(a.owner ?? ''),
          kpi: String(a.kpi ?? ''),
        }))
      : [],
  }
}
