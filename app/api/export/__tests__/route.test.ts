import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Drizzle ORM mock ─────────────────────────────────────────────────────────

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
}))

// ─── Schema mock ──────────────────────────────────────────────────────────────

vi.mock('@/db/schema', () => ({
  reportArtifacts: { id: 'report_artifacts.id', status: 'report_artifacts.status', contentMarkdown: 'report_artifacts.content_markdown', researchJobId: 'report_artifacts.research_job_id' },
  researchJobs: { id: 'research_jobs.id', companyId: 'research_jobs.company_id' },
  companies: { id: 'companies.id', name: 'companies.name' },
}))

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockLimit = vi.fn()
const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

const mockDb = { select: mockSelect }

vi.mock('@/db', () => ({ getDb: () => mockDb }))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET } from '../[artifactId]/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(artifactId: string) {
  return new Request(`http://localhost/api/export/${artifactId}`)
}

const ARTIFACT_DONE = {
  id: 'art-abc123',
  status: 'done',
  contentMarkdown: '## 1. Анализ бизнеса\n[ФАКТ] Данные о компании.',
  researchJobId: 'job-1',
}

const ARTIFACT_GENERATING = {
  id: 'art-xyz',
  status: 'generating',
  contentMarkdown: null,
  researchJobId: 'job-1',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/export/[artifactId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockSelect.mockReturnValue({ from: mockFrom })
  })

  it('returns 404 when artifact not found', async () => {
    mockLimit.mockResolvedValueOnce([])

    const response = await GET(makeRequest('missing'), { params: { artifactId: 'missing' } })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 404 when artifact is still generating', async () => {
    mockLimit.mockResolvedValueOnce([ARTIFACT_GENERATING])

    const response = await GET(makeRequest('art-xyz'), { params: { artifactId: 'art-xyz' } })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBeTruthy()
  })

  it('returns markdown file with correct headers for done artifact', async () => {
    // 1st call: artifact, 2nd: job, 3rd: company
    mockLimit
      .mockResolvedValueOnce([ARTIFACT_DONE])
      .mockResolvedValueOnce([{ companyId: 'company-1' }])
      .mockResolvedValueOnce([{ name: 'Test Company' }])

    const response = await GET(makeRequest('art-abc123'), { params: { artifactId: 'art-abc123' } })

    if (response.status !== 200) {
      const body = await response.clone().json().catch(() => null)
      console.error('Unexpected 500, body:', body)
    }
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/markdown')
    const disposition = response.headers.get('Content-Disposition') ?? ''
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('.md')
    const text = await response.text()
    expect(text).toBe(ARTIFACT_DONE.contentMarkdown)
  })

  it('uses ascii fallback filename when company lookup returns empty', async () => {
    mockLimit
      .mockResolvedValueOnce([ARTIFACT_DONE])
      .mockResolvedValueOnce([]) // no job found

    const response = await GET(makeRequest('art-abc123'), { params: { artifactId: 'art-abc123' } })

    expect(response.status).toBe(200)
    const disposition = response.headers.get('Content-Disposition') ?? ''
    expect(disposition).toContain('filename="strategy-art-abc1.md"')
    expect(disposition).toContain("filename*=UTF-8''")
  })
})
