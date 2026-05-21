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
  // Lightweight parallel tasks: Stage-1 section drafts, brief reformatting.
  defaultModel: AIModelId
  // Heavy synthesis of the full strategy (the product's main deliverable).
  // Quality matters more here, so we spend a stronger model on a single call.
  synthesisModel: AIModelId
  // Two-stage review mode: Stage 1 generates 5 parallel section drafts (status='partial'),
  // user reviews them on the report page, then explicitly triggers Stage 2 synthesis.
  // Disable to fall back to single-call generation (one LLM round-trip).
  twoStageReview: boolean
}

export interface AIConfig {
  research: ResearchProviderConfig
  strategy: StrategyProviderConfig
}

// OpenAI gpt-4o-mini + web_search_preview — research provider (real-time web + citations).
// OpenRouter + DeepSeek V4 Pro — strategy/analytics (low-cost, large context).
export const AI_CONFIG: AIConfig = {
  research: {
    defaultProvider: 'openai',
    defaultModel: process.env.OPENAI_RESEARCH_MODEL ?? 'gpt-4o-mini',
    fallbackProvider: 'mock',
    mode: process.env.RESEARCH_MODE === 'real' ? 'real' : 'mock',
  },
  strategy: {
    defaultProvider: 'openrouter',
    // Vercel Fluid Compute (default since Apr 2025) lifts maxDuration to 300s on Hobby /
    // 800s on Pro, so the old "Flash only, -pro 504s" constraint no longer applies.
    // Flash stays for lightweight parallel work (5 section drafts, brief reformatting).
    defaultModel: process.env.OPENROUTER_STRATEGY_MODEL ?? 'deepseek/deepseek-v4-flash',
    // Claude Sonnet 4.6 for the full-strategy synthesis — the main client deliverable.
    // ~$0.05/report (one call). Override via OPENROUTER_SYNTHESIS_MODEL.
    synthesisModel: process.env.OPENROUTER_SYNTHESIS_MODEL ?? 'anthropic/claude-sonnet-4.6',
    twoStageReview: process.env.STRATEGY_TWO_STAGE_REVIEW === 'true',
  },
}
