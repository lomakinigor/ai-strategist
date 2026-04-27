import type { ResearchProvider, ResearchRequest, ResearchResult } from '../types'

// Used in tests and as router fallback when no real provider is configured.
export class MockResearchProvider implements ResearchProvider {
  readonly id = 'mock' as const
  readonly name = 'Mock Research Provider'

  async research(_request: ResearchRequest): Promise<ResearchResult> {
    return {
      points: [],
      providerId: 'mock',
      modelId: 'mock-v1',
      durationMs: 0,
    }
  }
}
