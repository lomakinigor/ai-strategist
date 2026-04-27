import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Drizzle ORM mock ─────────────────────────────────────────────────────────

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
  and: vi.fn((...conds: unknown[]) => ({ type: 'and', conds })),
  inArray: vi.fn((_col: unknown, _vals: unknown) => ({ type: 'inArray', col: _col, vals: _vals })),
}))

// ─── Schema mock ─────────────────────────────────────────────────────────────

vi.mock('@/db/schema', () => ({
  facts: {
    id: 'facts.id',
    researchJobId: 'facts.research_job_id',
    researchType: 'facts.research_type',
    factType: 'facts.fact_type',
    confidence: 'facts.confidence',
    isActive: 'facts.is_active',
    reliabilityScore: 'facts.reliability_score',
    content: 'facts.content',
    sourceId: 'facts.source_id',
    createdAt: 'facts.created_at',
    updatedAt: 'facts.updated_at',
  },
  sources: {
    id: 'sources.id',
    sourceUrl: 'sources.source_url',
    sourceName: 'sources.source_name',
    sourceType: 'sources.source_type',
  },
}))

// ─── DB mock ─────────────────────────────────────────────────────────────────

const mockOrderBy = vi.fn()
const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockLeftJoin = vi.fn().mockReturnValue({ where: mockSelectWhere })
const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin })
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

const mockUpdateWhere = vi.fn()
const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

const mockDb = { select: mockSelect, update: mockUpdate }

vi.mock('@/db', () => ({ getDb: () => mockDb }))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { getFactsForJob, setFactActive } from '../validation'

// ─── Test data ────────────────────────────────────────────────────────────────

const MOCK_ROW_NO_SOURCE = {
  id: 'fact-1',
  researchType: 'business',
  factType: 'FACT',
  confidence: 'HIGH',
  rs: 4,
  content: 'Тестовый факт о компании',
  isActive: true,
  sourceId: null,
  sourceUrl: null,
  sourceName: null,
  sourceType: null,
}

const MOCK_ROW_WITH_SOURCE = {
  id: 'fact-2',
  researchType: 'market',
  factType: 'HYPOTHESIS',
  confidence: 'MEDIUM',
  rs: 3,
  content: 'Тестовая гипотеза о рынке',
  isActive: false,
  sourceId: 'source-1',
  sourceUrl: 'https://example.ru/about',
  sourceName: 'Example RU',
  sourceType: 'official_site',
}

// ─── setFactActive ────────────────────────────────────────────────────────────

describe('setFactActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateWhere.mockResolvedValue([])
  })

  it('calls db.update with isActive: true', async () => {
    await setFactActive('fact-1', true)
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }))
    expect(mockUpdateWhere).toHaveBeenCalledOnce()
  })

  it('calls db.update with isActive: false', async () => {
    await setFactActive('fact-1', false)
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
  })

  it('includes updatedAt timestamp in set payload', async () => {
    await setFactActive('fact-1', true)
    const setArg = mockSet.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.updatedAt).toBeInstanceOf(Date)
  })
})

// ─── getFactsForJob ───────────────────────────────────────────────────────────

describe('getFactsForJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrderBy.mockResolvedValue([])
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ leftJoin: mockLeftJoin })
    mockLeftJoin.mockReturnValue({ where: mockSelectWhere })
    mockSelectWhere.mockReturnValue({ orderBy: mockOrderBy })
  })

  it('calls db.select and chains from → leftJoin → where → orderBy', async () => {
    await getFactsForJob('job-1')
    expect(mockSelect).toHaveBeenCalledOnce()
    expect(mockFrom).toHaveBeenCalledOnce()
    expect(mockLeftJoin).toHaveBeenCalledOnce()
    expect(mockSelectWhere).toHaveBeenCalledOnce()
    expect(mockOrderBy).toHaveBeenCalledOnce()
  })

  it('returns empty array when no facts found', async () => {
    mockOrderBy.mockResolvedValueOnce([])
    const result = await getFactsForJob('job-1')
    expect(result).toEqual([])
  })

  it('maps row without source to source: null', async () => {
    mockOrderBy.mockResolvedValueOnce([MOCK_ROW_NO_SOURCE])
    const result = await getFactsForJob('job-1')
    expect(result).toHaveLength(1)
    expect(result[0].source).toBeNull()
    expect(result[0].id).toBe('fact-1')
    expect(result[0].researchType).toBe('business')
    expect(result[0].factType).toBe('FACT')
    expect(result[0].confidence).toBe('HIGH')
    expect(result[0].rs).toBe(4)
    expect(result[0].isActive).toBe(true)
  })

  it('maps row with source to source object', async () => {
    mockOrderBy.mockResolvedValueOnce([MOCK_ROW_WITH_SOURCE])
    const result = await getFactsForJob('job-1')
    expect(result[0].source).toEqual({
      id: 'source-1',
      url: 'https://example.ru/about',
      label: 'Example RU',
      type: 'official_site',
    })
  })

  it('maps multiple rows preserving all fields', async () => {
    mockOrderBy.mockResolvedValueOnce([MOCK_ROW_NO_SOURCE, MOCK_ROW_WITH_SOURCE])
    const result = await getFactsForJob('job-1')
    expect(result).toHaveLength(2)
    expect(result[0].isActive).toBe(true)
    expect(result[1].isActive).toBe(false)
  })

  it('applies onlyActive filter by calling eq with isActive=true', async () => {
    const { eq } = await import('drizzle-orm')
    await getFactsForJob('job-1', { onlyActive: true })
    const eqCalls = (eq as ReturnType<typeof vi.fn>).mock.calls
    const hasActiveFilter = eqCalls.some(([, val]) => val === true)
    expect(hasActiveFilter).toBe(true)
  })

  it('applies streams filter by calling inArray', async () => {
    const { inArray } = await import('drizzle-orm')
    await getFactsForJob('job-1', { streams: ['business', 'market'] })
    expect(inArray as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    const inArrayCalls = (inArray as ReturnType<typeof vi.fn>).mock.calls
    const streamsCall = inArrayCalls.find(([, vals]) =>
      Array.isArray(vals) && vals.includes('business'),
    )
    expect(streamsCall).toBeDefined()
  })

  it('applies factTypes filter by calling inArray', async () => {
    const { inArray } = await import('drizzle-orm')
    await getFactsForJob('job-1', { factTypes: ['FACT'] })
    const inArrayCalls = (inArray as ReturnType<typeof vi.fn>).mock.calls
    const typesCall = inArrayCalls.find(([, vals]) =>
      Array.isArray(vals) && vals.includes('FACT'),
    )
    expect(typesCall).toBeDefined()
  })

  it('does not call inArray when no stream filter', async () => {
    const { inArray } = await import('drizzle-orm')
    ;(inArray as ReturnType<typeof vi.fn>).mockClear()
    await getFactsForJob('job-1')
    expect(inArray as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
  })
})
