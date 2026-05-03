import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/rag/context', () => ({
  buildResearchContext: vi.fn(),
  serializeContext: vi.fn(() => 'mock serialized'),
  getBlockByType: vi.fn((_ctx: unknown, t: string) => ({
    researchType: t,
    label: t,
    factCount: 1,
    contextText: `block ${t}`,
  })),
}))

vi.mock('../prompts', () => ({
  STRATEGY_SYSTEM_PROMPT: 'mock system prompt',
  STRATEGY_SYNTHESIS_SYSTEM_PROMPT: 'mock synthesis system',
  SECTION_TITLES: {
    business: 'Анализ бизнеса',
    market: 'Анализ рынка',
    audience: 'Анализ целевой аудитории',
    channels: 'Анализ каналов',
    competitors: 'Анализ конкурентов',
  },
  buildStrategyUserPrompt: vi.fn(() => 'mock user prompt'),
  buildSectionSystemPrompt: vi.fn((t: string) => `system for ${t}`),
  buildSectionUserPrompt: vi.fn((t: string) => `user for ${t}`),
  buildSynthesisUserPrompt: vi.fn(() => 'synthesis user prompt'),
}))

vi.mock('@/lib/ai/config', () => ({
  AI_CONFIG: {
    strategy: {
      defaultProvider: 'openrouter',
      defaultModel: 'deepseek/deepseek-v4-flash',
      twoStageReview: true,
    },
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
}))

vi.mock('@/db/schema', () => ({
  reportArtifacts: {
    id: 'report_artifacts.id',
    companyId: 'report_artifacts.company_id',
    researchJobId: 'report_artifacts.research_job_id',
    status: 'report_artifacts.status',
    contentJson: 'report_artifacts.content_json',
    contentMarkdown: 'report_artifacts.content_markdown',
    updatedAt: 'report_artifacts.updated_at',
  },
  researchJobs: {
    id: 'research_jobs.id',
    companyId: 'research_jobs.company_id',
  },
}))

const mockJobLimit = vi.fn()
const mockJobWhere = vi.fn().mockReturnValue({ limit: mockJobLimit })
const mockJobFrom = vi.fn().mockReturnValue({ where: mockJobWhere })

const mockArtifactLimit = vi.fn()
const mockArtifactWhere = vi.fn().mockReturnValue({ limit: mockArtifactLimit })
const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere })

const mockReturning = vi.fn()
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockReturning })

const mockUpdateWhere = vi.fn()
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })

const mockSelect = vi.fn()
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet })

const mockDb = { select: mockSelect, insert: mockInsert, update: mockUpdate }
vi.mock('@/db', () => ({ getDb: () => mockDb }))

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  generateStrategyDraft,
  generateSectionDraft,
  generateAllSectionsParallel,
  synthesizeStrategy,
} from '../generator'
import { buildResearchContext } from '@/lib/rag/context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_CONTEXT = {
  jobId: 'job-1',
  companyId: 'company-1',
  blocks: [],
  totalFactCount: 5,
  builtAt: new Date(),
}

function makeFetchMock(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
      }),
  })
}

function setupDbForGenerate() {
  mockSelect.mockReset()
  mockSelect
    .mockReturnValueOnce({ from: mockJobFrom }) // researchJobs lookup
  mockJobLimit.mockResolvedValue([{ companyId: 'company-1' }])
  mockReturning.mockResolvedValue([{ id: 'artifact-1' }])
  mockUpdateWhere.mockResolvedValue([])
  vi.mocked(buildResearchContext).mockResolvedValue(MOCK_CONTEXT)
}

// ─── generateSectionDraft ─────────────────────────────────────────────────────

describe('generateSectionDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'
    vi.stubGlobal('fetch', makeFetchMock('Карточка про бизнес [ФАКТ]'))
  })

  it('returns StrategySection with content from LLM response', async () => {
    const section = await generateSectionDraft('business', MOCK_CONTEXT)
    expect(section.id).toBe('business')
    expect(section.title).toBe('Анализ бизнеса')
    expect(section.content).toBe('Карточка про бизнес [ФАКТ]')
    expect(section.error).toBeNull()
    expect(section.modelId).toContain('deepseek')
    expect(section.generatedAt).toBeTruthy()
  })

  it('catches LLM errors and returns section with error field set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('overloaded'),
      }),
    )
    const section = await generateSectionDraft('market', MOCK_CONTEXT)
    expect(section.id).toBe('market')
    expect(section.error).toContain('503')
    expect(section.content).toBe('')
  })

  it('uses correct system + user prompts per section type', async () => {
    await generateSectionDraft('competitors', MOCK_CONTEXT)
    const fetchMock = fetch as unknown as { mock: { calls: Array<[string, { body: string }]> } }
    const calledBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(calledBody.messages[0].content).toBe('system for competitors')
    expect(calledBody.messages[1].content).toBe('user for competitors')
  })

  it('treats empty LLM response (200 OK with content="") as error so UI can retry', async () => {
    vi.stubGlobal('fetch', makeFetchMock('   \n  '))
    const section = await generateSectionDraft('market', MOCK_CONTEXT)
    expect(section.error).toMatch(/пустой ответ/i)
    expect(section.content).toBe('')
  })
})

// ─── generateAllSectionsParallel ──────────────────────────────────────────────

describe('generateAllSectionsParallel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('returns 5 sections (business, market, audience, channels, competitors)', async () => {
    vi.stubGlobal('fetch', makeFetchMock('Section content [ФАКТ]'))
    const sections = await generateAllSectionsParallel(MOCK_CONTEXT)
    expect(sections).toHaveLength(5)
    const ids = sections.map((s) => s.id)
    expect(ids).toEqual(['business', 'market', 'audience', 'channels', 'competitors'])
  })

  it('runs all 5 fetches in parallel (Promise.all semantics)', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetchSpy = vi.fn().mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return {
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'x' } }] }),
      }
    })
    vi.stubGlobal('fetch', fetchSpy)

    await generateAllSectionsParallel(MOCK_CONTEXT)
    expect(maxInFlight).toBe(5)
    expect(fetchSpy).toHaveBeenCalledTimes(5)
  })

  it('returns partial results when one section fails (other 4 succeed)', async () => {
    let callIdx = 0
    const fetchSpy = vi.fn().mockImplementation(async () => {
      const idx = callIdx++
      if (idx === 1) {
        return { ok: false, status: 503, text: () => Promise.resolve('overloaded') }
      }
      return {
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: `section ${idx}` } }] }),
      }
    })
    vi.stubGlobal('fetch', fetchSpy)

    const sections = await generateAllSectionsParallel(MOCK_CONTEXT)
    expect(sections).toHaveLength(5)
    const failed = sections.filter((s) => s.error !== null)
    const ok = sections.filter((s) => s.error === null)
    expect(failed).toHaveLength(1)
    expect(ok).toHaveLength(4)
  })
})

// ─── generateStrategyDraft (two-stage path) ───────────────────────────────────

describe('generateStrategyDraft — twoStageReview=true', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDbForGenerate()
    process.env.OPENROUTER_API_KEY = 'test-key'
    vi.stubGlobal('fetch', makeFetchMock('Section content [ФАКТ]'))
  })

  it('saves artifact with status=partial and contentJson with 5 sections', async () => {
    const result = await generateStrategyDraft('job-1')
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'partial',
        contentJson: expect.objectContaining({
          stage: 1,
          sections: expect.arrayContaining([
            expect.objectContaining({ id: 'business' }),
            expect.objectContaining({ id: 'competitors' }),
          ]),
        }),
      }),
    )
    expect(result.mode).toBe('real')
  })

  it('does NOT call synthesis fetch in stage 1', async () => {
    await generateStrategyDraft('job-1')
    // 5 fetches for 5 sections, no 6th
    expect(fetch).toHaveBeenCalledTimes(5)
  })
})

// ─── synthesizeStrategy ───────────────────────────────────────────────────────

describe('synthesizeStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'

    // Setup: synthesizeStrategy reads artifact, then updates it.
    mockSelect.mockReset()
    mockSelect.mockReturnValue({ from: mockArtifactFrom })
    mockArtifactLimit.mockResolvedValue([
      {
        id: 'artifact-1',
        status: 'partial',
        contentJson: {
          stage: 1,
          sections: [
            { id: 'business', title: 'Анализ бизнеса', content: 'B [ФАКТ]', generatedAt: '2026-05-01T00:00:00Z', modelId: 'deepseek/deepseek-v4-flash', error: null },
            { id: 'market', title: 'Анализ рынка', content: 'M [ФАКТ]', generatedAt: '2026-05-01T00:00:00Z', modelId: 'deepseek/deepseek-v4-flash', error: null },
            { id: 'audience', title: 'Анализ целевой аудитории', content: 'A [ФАКТ]', generatedAt: '2026-05-01T00:00:00Z', modelId: 'deepseek/deepseek-v4-flash', error: null },
            { id: 'channels', title: 'Анализ каналов', content: 'C [ФАКТ]', generatedAt: '2026-05-01T00:00:00Z', modelId: 'deepseek/deepseek-v4-flash', error: null },
            { id: 'competitors', title: 'Анализ конкурентов', content: 'X [ФАКТ]', generatedAt: '2026-05-01T00:00:00Z', modelId: 'deepseek/deepseek-v4-flash', error: null },
          ],
        },
      },
    ])
    mockUpdateWhere.mockResolvedValue([])
    vi.stubGlobal('fetch', makeFetchMock('Стратегия и рекомендации [ФАКТ]'))
  })

  it('updates artifact with status=done and full markdown including synthesis section', async () => {
    await synthesizeStrategy('artifact-1')
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'done',
        contentMarkdown: expect.stringContaining('## 6. Стратегия и рекомендации'),
      }),
    )
    const callArg = mockUpdateSet.mock.calls.at(-1)![0] as { contentMarkdown: string }
    expect(callArg.contentMarkdown).toContain('## 1. Анализ бизнеса')
    expect(callArg.contentMarkdown).toContain('## 2. Анализ рынка')
    expect(callArg.contentMarkdown).toContain('## 3. Анализ целевой аудитории')
    expect(callArg.contentMarkdown).toContain('## 4. Анализ каналов')
    expect(callArg.contentMarkdown).toContain('## 5. Анализ конкурентов')
    expect(callArg.contentMarkdown).toContain('## 6. Стратегия и рекомендации')
  })

  it('rejects synthesis when any section has error', async () => {
    mockArtifactLimit.mockResolvedValue([
      {
        id: 'artifact-1',
        status: 'partial',
        contentJson: {
          stage: 1,
          sections: [
            { id: 'business', title: 'B', content: '', generatedAt: '', modelId: 'm', error: 'failed' },
            { id: 'market', title: 'M', content: 'ok', generatedAt: '', modelId: 'm', error: null },
            { id: 'audience', title: 'A', content: 'ok', generatedAt: '', modelId: 'm', error: null },
            { id: 'channels', title: 'C', content: 'ok', generatedAt: '', modelId: 'm', error: null },
            { id: 'competitors', title: 'X', content: 'ok', generatedAt: '', modelId: 'm', error: null },
          ],
        },
      },
    ])
    await expect(synthesizeStrategy('artifact-1')).rejects.toThrow(
      /failed sections|error|перегенерируй/i,
    )
  })

  it('rejects synthesis when artifact is not in partial status', async () => {
    mockArtifactLimit.mockResolvedValue([
      { id: 'artifact-1', status: 'done', contentJson: null },
    ])
    await expect(synthesizeStrategy('artifact-1')).rejects.toThrow(/partial|status/i)
  })
})
