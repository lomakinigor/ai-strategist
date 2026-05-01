import type { RawDataPoint, VerifiedFact } from '../types'
import { rsToConfidence, classifyFactType } from './rules'

export function classify(rawPoint: RawDataPoint): VerifiedFact {
  const hasSource = rawPoint.source.trim().length > 0
  const hasDate = rawPoint.date.trim().length > 0
  const hasData = rawPoint.data.trim().length > 0

  const type = classifyFactType(rawPoint.rs, hasSource, hasDate, hasData)

  return {
    content: rawPoint.data,
    source: rawPoint.source,
    date: rawPoint.date,
    rs: rawPoint.rs,
    type,
    confidence: rsToConfidence(rawPoint.rs),
    researchType: rawPoint.researchType,
    // INSUFFICIENT_DATA never reaches strategy by default — operator can re-enable in validation
    isActive: type !== 'INSUFFICIENT_DATA',
  }
}
