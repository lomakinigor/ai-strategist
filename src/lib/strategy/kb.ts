// Загрузчик базы знаний report-requirements для двухэтапной методологии отчётов.
//
// Источник: knowledge/report-requirements/{niche_map.json, universal.md, <niche>.md}
// Файлы читаются с диска на серверной стороне (server action / route). Их попадание
// в Vercel serverless-бандл обеспечивает experimental.outputFileTracingIncludes
// в next.config.mjs — иначе fs.readFile упал бы с ENOENT в проде.

import fs from 'node:fs/promises'
import path from 'node:path'

export type NicheId = 'legal_services' | 'marketing' | 'ecommerce' | 'b2b_saas' | 'consulting'

interface NicheMapEntry {
  display_name: string
  file: string
  keywords: string[]
}

export interface NicheConfig {
  id: NicheId
  displayName: string
  file: string
  keywords: string[]
}

export interface ReportRequirements {
  // null — ниша не определена либо файл ниши отсутствует; работаем по universal.
  niche: NicheConfig | null
  universalMarkdown: string
  nicheMarkdown: string
  // То, что подставляется в промпт как {kb_requirements}.
  combinedMarkdown: string
}

const KB_DIR = path.join(process.cwd(), 'knowledge', 'report-requirements')

async function readKbFile(name: string): Promise<string> {
  return fs.readFile(path.join(KB_DIR, name), 'utf8')
}

async function loadNicheMap(): Promise<Record<string, NicheMapEntry>> {
  const raw = await readKbFile('niche_map.json')
  return JSON.parse(raw) as Record<string, NicheMapEntry>
}

// Определяет нишу по свободному тексту (industry + description + name компании)
// через подсчёт совпадений keywords из niche_map.json. Возвращает null, если
// ни одного совпадения — тогда отчёт строится только по universal-требованиям.
export async function detectNiche(text: string): Promise<NicheId | null> {
  const map = await loadNicheMap()
  const haystack = text.toLowerCase()

  let best: { id: NicheId; hits: number } | null = null
  for (const [id, cfg] of Object.entries(map)) {
    const hits = cfg.keywords.reduce(
      (n, kw) => (haystack.includes(kw.toLowerCase()) ? n + 1 : n),
      0,
    )
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { id: id as NicheId, hits }
    }
  }
  return best?.id ?? null
}

// Загружает требования базы знаний: universal + (опционально) файл ниши.
// Устойчиво к отсутствию файла ниши: niche_map может содержать нишу, для которой
// .md ещё не создан (marketing/ecommerce/b2b_saas/consulting) — в этом случае
// возвращаем только universal, не падая.
export async function loadReportRequirements(
  nicheId: NicheId | null,
): Promise<ReportRequirements> {
  const universalMarkdown = await readKbFile('universal.md')

  if (!nicheId) {
    return { niche: null, universalMarkdown, nicheMarkdown: '', combinedMarkdown: universalMarkdown }
  }

  const map = await loadNicheMap()
  const entry = map[nicheId]
  if (!entry) {
    return { niche: null, universalMarkdown, nicheMarkdown: '', combinedMarkdown: universalMarkdown }
  }

  let nicheMarkdown = ''
  try {
    nicheMarkdown = await readKbFile(entry.file)
  } catch {
    // Файл ниши заявлен в niche_map.json, но ещё не создан — работаем по universal.
    nicheMarkdown = ''
  }

  const niche: NicheConfig = {
    id: nicheId,
    displayName: entry.display_name,
    file: entry.file,
    keywords: entry.keywords,
  }

  const combinedMarkdown = nicheMarkdown
    ? `${universalMarkdown}\n\n---\n\n${nicheMarkdown}`
    : universalMarkdown

  return { niche, universalMarkdown, nicheMarkdown, combinedMarkdown }
}

// Удобный композит: по свободному тексту компании сразу вернуть требования.
export async function loadRequirementsForText(text: string): Promise<ReportRequirements> {
  const nicheId = await detectNiche(text)
  return loadReportRequirements(nicheId)
}
