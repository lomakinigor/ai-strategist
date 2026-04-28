import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Drizzle ORM mock ────────────────────────────────────────────────────────

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
  and: vi.fn((...conds: unknown[]) => ({ type: 'and', conds })),
}))

// ─── Schema mock ─────────────────────────────────────────────────────────────

vi.mock('@/db/schema', () => ({
  facts: {
    researchJobId: 'facts.research_job_id',
    researchType: 'facts.research_type',
    factType: 'facts.fact_type',
    confidence: 'facts.confidence',
    reliabilityScore: 'facts.reliability_score',
    content: 'facts.content',
    sourceId: 'facts.source_id',
    isActive: 'facts.is_active',
    createdAt: 'facts.created_at',
  },
  sources: {
    id: 'sources.id',
    sourceUrl: 'sources.source_url',
    sourceName: 'sources.source_name',
  },
  researchJobs: {
    id: 'research_jobs.id',
    companyId: 'research_jobs.company_id',
  },
  intakeSubmissions: {
    companyId: 'intake_submissions.company_id',
    inputPayload: 'intake_submissions.input_payload',
  },
}))

// ─── DB mock (three separate select chains) ──────────────────────────────────

// Chain 1: select({ companyId }).from(researchJobs).where().limit()
const mockJobLimit = vi.fn()
const mockJobWhere = vi.fn().mockReturnValue({ limit: mockJobLimit })
const mockJobFrom = vi.fn().mockReturnValue({ where: mockJobWhere })

// Chain 2: select({ inputPayload }).from(intakeSubmissions).where().limit()
const mockIntakeLimit = vi.fn()
const mockIntakeWhere = vi.fn().mockReturnValue({ limit: mockIntakeLimit })
const mockIntakeFrom = vi.fn().mockReturnValue({ where: mockIntakeWhere })

// Chain 3: select({...}).from(facts).leftJoin().where().orderBy()
const mockOrderBy = vi.fn()
const mockFactsWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockLeftJoin = vi.fn().mockReturnValue({ where: mockFactsWhere })
const mockFactsFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin })

// getDb().select() returns different chains per call
const mockSelect = vi.fn()
const mockDb = { select: mockSelect }

vi.mock('@/db', () => ({ getDb: () => mockDb }))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { buildResearchContext, getBlockByType, serializeContext } from '../context'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupDb(jobRows: unknown[], factRows: unknown[], intakeRows: unknown[] = []) {
  mockSelect.mockReset()
  mockSelect
    .mockReturnValueOnce({ from: mockJobFrom })      // call 1: researchJobs
    .mockReturnValueOnce({ from: mockIntakeFrom })   // call 2: intakeSubmissions
    .mockReturnValueOnce({ from: mockFactsFrom })    // call 3: facts
  mockJobLimit.mockResolvedValue(jobRows)
  mockIntakeLimit.mockResolvedValue(intakeRows)
  mockOrderBy.mockResolvedValue(factRows)
}

const JOB_ROW = [{ companyId: 'company-1' }]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildResearchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ResearchContext with correct shape', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    expect(ctx.jobId).toBe('job-1')
    expect(ctx.companyId).toBe('company-1')
    expect(ctx.blocks).toHaveLength(4)
    expect(ctx.totalFactCount).toBe(0)
    expect(ctx.builtAt).toBeInstanceOf(Date)
  })

  it('returns all 4 research type blocks even with no facts', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    const types = ctx.blocks.map((b) => b.researchType)
    expect(types).toEqual(['business', 'market', 'audience', 'channels'])
  })

  it('shows "Данных нет." when a stream has no facts', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    for (const block of ctx.blocks) {
      expect(block.contextText).toContain('Данных нет.')
      expect(block.factCount).toBe(0)
    }
  })

  it('formats a FACT row correctly', async () => {
    const factRow = {
      researchType: 'business',
      factType: 'FACT',
      confidence: 'HIGH',
      rs: 4,
      content: 'Компания занимается промышленным оборудованием.',
      sourceUrl: 'https://example.com',
      sourceName: 'example.com',
    }
    setupDb(JOB_ROW, [factRow])
    const ctx = await buildResearchContext('job-1')
    const block = ctx.blocks.find((b) => b.researchType === 'business')!
    expect(block.factCount).toBe(1)
    expect(block.contextText).toContain('[ФАКТ][HIGH][RS:4]')
    expect(block.contextText).toContain('Компания занимается промышленным оборудованием.')
    expect(block.contextText).toContain('Источник: example.com')
  })

  it('formats HYPOTHESIS and INSUFFICIENT_DATA labels in Russian', async () => {
    const rows = [
      { researchType: 'market', factType: 'HYPOTHESIS', confidence: 'MEDIUM', rs: 3, content: 'Гипотеза о рынке.', sourceUrl: null, sourceName: null },
      { researchType: 'audience', factType: 'INSUFFICIENT_DATA', confidence: 'LOW', rs: 2, content: 'Данных нет по аудитории.', sourceUrl: null, sourceName: null },
    ]
    setupDb(JOB_ROW, rows)
    const ctx = await buildResearchContext('job-1')
    const market = ctx.blocks.find((b) => b.researchType === 'market')!
    expect(market.contextText).toContain('[ГИПОТЕЗА]')
    const audience = ctx.blocks.find((b) => b.researchType === 'audience')!
    expect(audience.contextText).toContain('[НЕДОСТАТОЧНО ДАННЫХ]')
  })

  it('skips "Источник:" line when sourceName and sourceUrl are null', async () => {
    const factRow = {
      researchType: 'channels',
      factType: 'FACT',
      confidence: 'LOW',
      rs: 2,
      content: 'Нет данных по каналу.',
      sourceUrl: null,
      sourceName: null,
    }
    setupDb(JOB_ROW, [factRow])
    const ctx = await buildResearchContext('job-1')
    const block = ctx.blocks.find((b) => b.researchType === 'channels')!
    expect(block.contextText).not.toContain('Источник:')
  })

  it('counts totalFactCount across all streams', async () => {
    const rows = [
      { researchType: 'business', factType: 'FACT', confidence: 'HIGH', rs: 4, content: 'A', sourceUrl: null, sourceName: null },
      { researchType: 'market', factType: 'FACT', confidence: 'HIGH', rs: 4, content: 'B', sourceUrl: null, sourceName: null },
      { researchType: 'audience', factType: 'FACT', confidence: 'HIGH', rs: 4, content: 'C', sourceUrl: null, sourceName: null },
    ]
    setupDb(JOB_ROW, rows)
    const ctx = await buildResearchContext('job-1')
    expect(ctx.totalFactCount).toBe(3)
  })

  it('handles missing job gracefully (empty companyId)', async () => {
    setupDb([], [])
    const ctx = await buildResearchContext('nonexistent-job')
    expect(ctx.companyId).toBe('')
    expect(ctx.totalFactCount).toBe(0)
  })

  it('includes stream header label in contextText', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    expect(ctx.blocks[0].contextText).toContain('=== Анализ бизнеса ===')
    expect(ctx.blocks[1].contextText).toContain('=== Анализ рынка ===')
    expect(ctx.blocks[2].contextText).toContain('=== Анализ аудитории ===')
    expect(ctx.blocks[3].contextText).toContain('=== Анализ каналов ===')
  })
})

describe('getBlockByType', () => {
  it('returns block for given research type', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    const block = getBlockByType(ctx, 'market')
    expect(block?.researchType).toBe('market')
    expect(block?.label).toBe('Анализ рынка')
  })

  it('returns undefined for unknown type', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    // @ts-expect-error testing invalid type
    expect(getBlockByType(ctx, 'unknown')).toBeUndefined()
  })
})

describe('serializeContext', () => {
  it('joins all blocks with double newline', async () => {
    setupDb(JOB_ROW, [])
    const ctx = await buildResearchContext('job-1')
    const serialized = serializeContext(ctx)
    expect(serialized).toContain('=== Анализ бизнеса ===')
    expect(serialized).toContain('=== Анализ каналов ===')
    // 4 blocks joined by \n\n
    const parts = serialized.split('\n\n')
    expect(parts.length).toBeGreaterThanOrEqual(4)
  })
})
