import type { RawDataPoint, ResearchQuery, ResearchType } from '../types'

export type AIProviderId = 'perplexity' | 'anthropic' | 'openai' | 'deepseek' | 'mock'
export type AIModelId = string

export interface ResearchRequest {
  query: ResearchQuery
  researchType: ResearchType
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
