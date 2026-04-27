import { describe, it, expect } from 'vitest'
import { getResearchProvider, getDefaultResearchProviderId } from '../router'
import { AI_CONFIG } from '../config'

describe('AI config', () => {
  it('default research provider is perplexity', () => {
    expect(AI_CONFIG.research.defaultProvider).toBe('perplexity')
  })

  it('fallback research provider is mock', () => {
    expect(AI_CONFIG.research.fallbackProvider).toBe('mock')
  })

  it('default research model is sonar-pro', () => {
    expect(AI_CONFIG.research.defaultModel).toBe('sonar-pro')
  })

  it('strategy provider is anthropic', () => {
    expect(AI_CONFIG.strategy.defaultProvider).toBe('anthropic')
  })
})

describe('getResearchProvider', () => {
  it('returns perplexity provider by default', () => {
    const provider = getResearchProvider()
    expect(provider.id).toBe('perplexity')
  })

  it('returns mock provider when explicitly requested', () => {
    const provider = getResearchProvider('mock')
    expect(provider.id).toBe('mock')
  })

  it('falls back to mock for unknown provider id', () => {
    // Cast to bypass type check — simulates misconfiguration
    const provider = getResearchProvider('openai' as never)
    expect(provider.id).toBe('mock')
  })
})

describe('getDefaultResearchProviderId', () => {
  it('returns perplexity', () => {
    expect(getDefaultResearchProviderId()).toBe('perplexity')
  })
})
