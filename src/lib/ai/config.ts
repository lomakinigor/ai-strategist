import type { AIModelId, AIProviderId } from './types'

export interface ResearchProviderConfig {
  defaultProvider: AIProviderId
  defaultModel: AIModelId
  fallbackProvider: AIProviderId
  // Controls whether research runs against real Perplexity API or uses mock adapters.
  // Set RESEARCH_MODE=real in environment to enable live research.
  mode: 'mock' | 'real'
}

export interface StrategyProviderConfig {
  defaultProvider: AIProviderId
  defaultModel: AIModelId
}

export interface AIConfig {
  research: ResearchProviderConfig
  strategy: StrategyProviderConfig
}

// Perplexity Sonar — research provider (real-time web + citations).
// OpenRouter + DeepSeek V4 Pro — strategy/analytics (low-cost, large context).
export const AI_CONFIG: AIConfig = {
  research: {
    defaultProvider: 'perplexity',
    defaultModel: 'sonar-pro',
    fallbackProvider: 'mock',
    mode: process.env.RESEARCH_MODE === 'real' ? 'real' : 'mock',
  },
  strategy: {
    defaultProvider: 'openrouter',
    // Flash fits in Vercel's 60s function timeout; -pro takes 90+s and triggers 504.
    // Switch back to -pro once strategy generation moves to async/background processing.
    defaultModel: process.env.OPENROUTER_STRATEGY_MODEL ?? 'deepseek/deepseek-v4-flash',
  },
}
