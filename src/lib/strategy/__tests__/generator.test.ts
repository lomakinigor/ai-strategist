import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── RAG context mock ─────────────────────────────────────────────────────────

vi.mock('@/lib/rag/context', () => ({
  buildResearchContext: vi.fn(),
  serializeContext: vi.fn(() => 'mock serialized context'),
}))

// ─── Prompts mock ─────────────────────────────────────────────────────────────

vi.mock('../prompts', () => ({
  STRATEGY_SYSTEM_PROMPT: 'mock system prompt',
  buildStrategyUserPrompt: vi.fn(() => 'mock user prompt'),
}))

// ─── Drizzle ORM mock ─────────────────────────────────────────────────────────

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
}))

// ─── Schema mock ──────────────────────────────────────────────────────────────

vi.mock('@/db/schema', () => ({
  reportArtifacts: {
    id: 'report_artifacts.id',
    companyId: 'report_artifacts.company_id',
    researchJobId: 'report_artifacts.research_job_id',
    status: 'report_artifacts.status',
    contentMarkdown: 'report_artifacts.content_markdown',
    updatedAt: 'report_artifacts.updated_at',
  },
  researchJobs: {
    id: 'research_jobs.id',
    companyId: 'research_jobs.company_id',
  },
}))

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockJobLimit = vi.fn()
const mockJobWhere = vi.fn().mockReturnValue({ limit: mockJobLimit })
const mockJobFrom = vi.fn().mockReturnValue({ where: mockJobWhere })

const mockReturning = vi.fn()
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockReturning })

const mockUpdateWhere = vi.fn()
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere })

const mockSelect = vi.fn().mockReturnValue({ from: mockJobFrom })
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet })

const mockDb = { select: mockSelect, insert: mockInsert, update: mockUpdate }

vi.mock('@/db', () => ({ getDb: () => mockDb }))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { parseSections, generateStrategyDraft, callDeepSeekAPI } from '../generator'
import { buildResearchContext } from '@/lib/rag/context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_CONTEXT = {
  jobId: 'job-1',
  companyId: 'company-1',
  blocks: [],
  totalFactCount: 3,
  builtAt: new Date(),
}

function setupDb() {
  mockJobLimit.mockResolvedValue([{ companyId: 'company-1' }])
  mockReturning.mockResolvedValue([{ id: 'artifact-1' }])
  mockUpdateWhere.mockResolvedValue([])
  vi.mocked(buildResearchContext).mockResolvedValue(MOCK_CONTEXT)
}

// ─── parseSections ────────────────────────────────────────────────────────────

describe('parseSections', () => {
  it('parses all 5 standard sections', () => {
    const md = `## 1. Анализ бизнеса
Бизнес [ФАКТ] работает в сфере.

## 2. Анализ рынка
Рынок [ГИПОТЕЗА] растёт.

## 3. Анализ целевой аудитории
Аудитория [ФАКТ] — МСБ.

## 4. Анализ каналов
Каналы [ГИПОТЕЗА] — ВКонтакте.

## 5. Стратегия и рекомендации
Рекомендации [ФАКТ] по AI.`

    const sections = parseSections(md)
    expect(sections).toHaveLength(5)
    expect(sections[0].id).toBe('business')
    expect(sections[1].id).toBe('market')
    expect(sections[2].id).toBe('audience')
    expect(sections[3].id).toBe('channels')
    expect(sections[4].id).toBe('strategy')
  })

  it('assigns correct titles', () => {
    const md = `## 1. Анализ бизнеса\nКонтент.`
    const sections = parseSections(md)
    expect(sections[0].title).toBe('Анализ бизнеса')
  })

  it('trims section content', () => {
    const md = `## 1. Анализ бизнеса\n\n  Контент.  \n`
    const sections = parseSections(md)
    expect(sections[0].content).toBe('Контент.')
  })

  it('returns empty array for markdown without recognized sections', () => {
    expect(parseSections('')).toHaveLength(0)
    expect(parseSections('# Заголовок без разделов')).toHaveLength(0)
  })

  it('ignores sections with unrecognized titles', () => {
    const md = `## 1. Unknown Section\nContent.`
    expect(parseSections(md)).toHaveLength(0)
  })
})

// ─── generateStrategyDraft ────────────────────────────────────────────────────

describe('generateStrategyDraft — mock mode (no API key)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDb()
    delete process.env.ANTHROPIC_API_KEY
  })

  it('returns StrategyDraftResult with mode=mock when no API key', async () => {
    const result = await generateStrategyDraft('job-1')
    expect(result.mode).toBe('mock')
    expect(result.modelId).toBe('mock')
    expect(result.reportArtifactId).toBe('artifact-1')
    expect(result.contextFactCount).toBe(3)
    expect(result.generatedAt).toBeInstanceOf(Date)
  })

  it('sets status=generating then status=done on artifact', async () => {
    await generateStrategyDraft('job-1')
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'generating' }),
    )
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done' }),
    )
  })

  it('returns 5 sections in mock draft', async () => {
    const result = await generateStrategyDraft('job-1')
    expect(result.sections).toHaveLength(5)
    const ids = result.sections.map((s) => s.id)
    expect(ids).toEqual(['business', 'market', 'audience', 'channels', 'strategy'])
  })

  it('throws when job is not found', async () => {
    mockJobLimit.mockResolvedValue([])
    await expect(generateStrategyDraft('bad-id')).rejects.toThrow('Research job not found: bad-id')
  })

  it('marks artifact as error and rethrows when buildResearchContext throws', async () => {
    vi.mocked(buildResearchContext).mockRejectedValue(new Error('RAG failure'))
    await expect(generateStrategyDraft('job-1')).rejects.toThrow('RAG failure')
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' }),
    )
  })
})

describe('generateStrategyDraft — real mode (with API key)', () => {
  const MOCK_MARKDOWN = `## 1. Анализ бизнеса
[ФАКТ] Компания работает в сфере.

## 2. Анализ рынка
[ГИПОТЕЗА] Рынок растёт.

## 3. Анализ целевой аудитории
[ФАКТ] МСБ.

## 4. Анализ каналов
[ГИПОТЕЗА] ВКонтакте.

## 5. Стратегия и рекомендации
[ФАКТ] Внедрить AI.`

  beforeEach(() => {
    vi.clearAllMocks()
    setupDb()
    process.env.ANTHROPIC_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: MOCK_MARKDOWN }],
          }),
      }),
    )
  })

  it('calls Anthropic API with correct endpoint and headers', async () => {
    await generateStrategyDraft('job-1')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        }),
      }),
    )
  })

  it('returns mode=real and model=claude-sonnet-4-6', async () => {
    const result = await generateStrategyDraft('job-1')
    expect(result.mode).toBe('real')
    expect(result.modelId).toBe('claude-sonnet-4-6')
  })

  it('parses 5 sections from API response', async () => {
    const result = await generateStrategyDraft('job-1')
    expect(result.sections).toHaveLength(5)
  })

  it('marks artifact as error when API returns non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      }),
    )
    await expect(generateStrategyDraft('job-1')).rejects.toThrow('Anthropic API error 401')
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' }),
    )
  })
})

// ─── callDeepSeekAPI ─────────────────────────────────────────────────────────

describe('callDeepSeekAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when PERPLEXITY_API_KEY is missing', async () => {
    delete process.env.PERPLEXITY_API_KEY
    await expect(callDeepSeekAPI('sys', 'user')).rejects.toThrow('PERPLEXITY_API_KEY is not configured')
  })

  it('returns content from choices[0].message.content', async () => {
    process.env.PERPLEXITY_API_KEY = 'key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Generated strategy' } }],
          }),
      }),
    )
    const result = await callDeepSeekAPI('sys', 'user')
    expect(result).toBe('Generated strategy')
  })
})
