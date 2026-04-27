import type { ResearchProvider, ResearchRequest, ResearchResult } from '../types'
import { AI_CONFIG } from '../config'

// Perplexity Sonar — default research provider for ai-strategist.
// Provides real-time web search with citations, which satisfies the RS source requirement.
// Real implementation requires PERPLEXITY_API_KEY in environment variables.
// API reference: https://docs.perplexity.ai/api-reference/chat-completions
export class PerplexityResearchProvider implements ResearchProvider {
  readonly id = 'perplexity' as const
  readonly name = 'Perplexity Sonar'

  async research(request: ResearchRequest): Promise<ResearchResult> {
    const modelId = request.modelId ?? AI_CONFIG.research.defaultModel

    // TODO (T-005): implement real Perplexity API call
    // POST https://api.perplexity.ai/chat/completions
    // Headers: Authorization: Bearer ${process.env.PERPLEXITY_API_KEY}
    // Body: { model: modelId, messages: [...], search_domain_filter: ['.ru'] }
    // Map response citations → RawDataPoint[] with rs assigned per source type
    throw new Error(
      `Perplexity provider not yet connected. Set PERPLEXITY_API_KEY and implement research(). Model target: ${modelId}`,
    )
  }
}
