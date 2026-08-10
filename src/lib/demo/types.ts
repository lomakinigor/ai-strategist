export type EvidenceKind = 'fact' | 'hypothesis' | 'insufficient'

export interface EvidenceNote {
  kind: EvidenceKind
  label: string
}

export interface DemoMetric {
  label: string
  value: string
  note: string
  tone: 'critical' | 'warning' | 'positive' | 'neutral'
}

export interface DemoFinding {
  title: string
  evidence: string
  consequence: string
  evidenceNote: EvidenceNote
}

export interface DemoAction {
  priority: string
  title: string
  description: string
  horizon: string
  effect: string
}

export interface DemoReportBlock {
  title: string
  text?: string
  items?: string[]
  rows?: Array<Record<string, string>>
}

export interface DemoReportSection {
  id:
    | 'summary'
    | 'diagnosis'
    | 'positioning'
    | 'channels'
    | 'automation'
    | 'roadmap'
    | 'tests'
    | 'risks'
    | 'sources'
  number: string
  title: string
  lead: string
  blocks: DemoReportBlock[]
}

export interface DemoSnapshot {
  notice: string
  company: {
    name: string
    industry: string
    region: string
    goal: string
    description: string
    proof: Array<{
      value: string
      label: string
    }>
    services: string[]
    channels: string[]
    competitors: string[]
  }
  research: {
    factCount: number
    sourceCount: number
    streams: Array<{
      name: string
      detail: string
      factCount: number
    }>
    reliability: Array<{
      label: string
      count: number
      description: string
    }>
  }
  interactive: {
    thesis: string
    digitalAudit: {
      measuredAt: string
      performance: number
      lcpSeconds: number
      fcpSeconds: number
      note: string
    }
    position: {
      title: string
      summary: string
      metrics: DemoMetric[]
    }
    bottlenecks: DemoFinding[]
    competitorPatterns: Array<{
      pattern: string
      market: string
      opportunity: string
    }>
    actions: DemoAction[]
  }
  fullReport: {
    title: string
    subtitle: string
    sections: DemoReportSection[]
  }
  cta: {
    title: string
    text: string
    paidLabel: string
    paidHref: string
    freeLabel: string
    freeHref: string
  }
}
