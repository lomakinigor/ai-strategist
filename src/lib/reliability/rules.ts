import type { ConfidenceLevel, FactType, ReliabilityScore } from '../types'

// RS 4-5 → HIGH, RS 3 → MEDIUM, RS 1-2 → LOW
export function rsToConfidence(rs: ReliabilityScore): ConfidenceLevel {
  if (rs >= 4) return 'HIGH'
  if (rs === 3) return 'MEDIUM'
  return 'LOW'
}

// FACT: RS >= 3, source present, date present, data not empty
// HYPOTHESIS: RS 2 with data+source, or RS 3 missing date
// INSUFFICIENT_DATA: RS <= 1, or no source, or no data
export function classifyFactType(
  rs: ReliabilityScore,
  hasSource: boolean,
  hasDate: boolean,
  hasData: boolean,
): FactType {
  if (!hasData || !hasSource || rs <= 1) return 'INSUFFICIENT_DATA'
  if (rs >= 3 && hasDate) return 'FACT'
  return 'HYPOTHESIS'
}
