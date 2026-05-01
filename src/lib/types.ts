// Core domain types — mirrors DB enums and research pipeline contracts

export type ResearchStatus = 'pending' | 'running' | 'done' | 'error'
export type FactType = 'FACT' | 'HYPOTHESIS' | 'INSUFFICIENT_DATA'
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'
export type ReliabilityScore = 1 | 2 | 3 | 4 | 5
export type ResearchType = 'business' | 'market' | 'audience' | 'channels' | 'competitors'
export type SourceType = 'registry' | 'official_site' | 'social' | 'ad' | 'aggregator'
export type SourceRegion = 'RU' | 'GLOBAL'
export type ArtifactStatus = 'pending' | 'generating' | 'done' | 'error'

// Fact verified by Reliability Engine
export interface VerifiedFact {
  content: string
  source: string
  date: string
  rs: ReliabilityScore
  type: FactType
  confidence: ConfidenceLevel
  researchType: ResearchType
  // INSUFFICIENT_DATA facts auto-deactivate so they cannot leak into strategy.
  // Operator can manually reactivate from validation workspace.
  isActive: boolean
}

// Input passed to each research adapter
export interface ResearchQuery {
  companyName: string
  industry: string
  description?: string
  website?: string
  channels?: string[]
}

// Raw output from a research adapter before reliability classification
export interface RawDataPoint {
  data: string
  source: string
  date: string
  rs: ReliabilityScore
  researchType: ResearchType
}

// Unified interface implemented by all 4 research adapters
export interface ResearchAdapter {
  name: string
  researchType: ResearchType
  collect(query: ResearchQuery): Promise<RawDataPoint[]>
}

// Report content structure — MVP format, configurable (see F-010 / T-010)
export interface ReportContent {
  business?: string
  market?: string
  audience?: string
  channels?: string
  competitors?: string
  strategy?: string
}
