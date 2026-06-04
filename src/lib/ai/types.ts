import type { RawDataPoint, ResearchQuery, ResearchType } from '../types'

export type AIProviderId = 'perplexity' | 'anthropic' | 'openai' | 'deepseek' | 'openrouter' | 'mock'
export type AIModelId = string

// site_marketing — доп. тип только для провайдера, в БД хранится как 'business'.
// competitor_single — fan-out по одному конкуренту, в БД хранится как 'competitors'.
export type ExtendedResearchType = ResearchType | 'site_marketing' | 'competitor_single'

export interface ResearchRequest {
  query: ResearchQuery
  researchType: ExtendedResearchType
  providerId?: AIProviderId
  modelId?: AIModelId
}

export interface ResearchResult {
  points: RawDataPoint[]
  providerId: AIProviderId
  modelId: AIModelId
  durationMs?: number
}

export interface ResearchProvider {
  readonly id: AIProviderId
  readonly name: string
  research(request: ResearchRequest): Promise<ResearchResult>
}

export interface ProviderCapabilities {
  supportsResearch: boolean
  supportsStrategy: boolean
  maxContextTokens?: number
}
