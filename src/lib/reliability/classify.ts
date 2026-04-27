import type { RawDataPoint, VerifiedFact } from '../types'
import { rsToConfidence, classifyFactType } from './rules'

export function classify(rawPoint: RawDataPoint): VerifiedFact {
  const hasSource = rawPoint.source.trim().length > 0
  const hasDate = rawPoint.date.trim().length > 0
  const hasData = rawPoint.data.trim().length > 0

  return {
    content: rawPoint.data,
    source: rawPoint.source,
    date: rawPoint.date,
    rs: rawPoint.rs,
    type: classifyFactType(rawPoint.rs, hasSource, hasDate, hasData),
    confidence: rsToConfidence(rawPoint.rs),
    researchType: rawPoint.researchType,
  }
}
