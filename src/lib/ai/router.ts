import type { AIProviderId, ResearchProvider } from './types'
import { AI_CONFIG } from './config'
import { PerplexityResearchProvider } from './providers/perplexity-research-provider'
import { MockResearchProvider } from './providers/mock-research-provider'

const RESEARCH_PROVIDERS: Record<string, ResearchProvider> = {
  perplexity: new PerplexityResearchProvider(),
  mock: new MockResearchProvider(),
}

// Returns the research provider for a given task.
// Defaults to AI_CONFIG.research.defaultProvider (perplexity).
// Falls back to AI_CONFIG.research.fallbackProvider (mock) if requested provider is unknown.
export function getResearchProvider(providerId?: AIProviderId): ResearchProvider {
  const id = providerId ?? AI_CONFIG.research.defaultProvider
  return RESEARCH_PROVIDERS[id] ?? RESEARCH_PROVIDERS[AI_CONFIG.research.fallbackProvider]
}

export function getDefaultResearchProviderId(): AIProviderId {
  return AI_CONFIG.research.defaultProvider
}
