import type { AIModelId, AIProviderId } from './types'

export interface ResearchProviderConfig {
  defaultProvider: AIProviderId
  defaultModel: AIModelId
  fallbackProvider: AIProviderId
}

export interface StrategyProviderConfig {
  defaultProvider: AIProviderId
  defaultModel: AIModelId
}

export interface AIConfig {
  research: ResearchProviderConfig
  strategy: StrategyProviderConfig
}

// Perplexity Sonar is the default research provider — real-time web search
// optimised for factual retrieval, which aligns with the reliability-first principle.
// Strategy generation uses Anthropic Claude (already integrated via Vercel AI SDK).
export const AI_CONFIG: AIConfig = {
  research: {
    defaultProvider: 'perplexity',
    defaultModel: 'sonar-pro',
    fallbackProvider: 'mock',
  },
  strategy: {
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
  },
}
