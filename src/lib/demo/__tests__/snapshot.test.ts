import { describe, expect, it } from 'vitest'
import { DEMO_SNAPSHOT } from '../snapshot'

describe('DEMO_SNAPSHOT', () => {
  it('описывает весь demo flow и оба формата результата', () => {
    expect(DEMO_SNAPSHOT.company.name).toBe('ООО «Юридическая компания»')
    expect(DEMO_SNAPSHOT.research.streams).toHaveLength(5)
    expect(DEMO_SNAPSHOT.research.factCount).toBe(48)
    expect(DEMO_SNAPSHOT.research.sourceCount).toBe(22)
    expect(DEMO_SNAPSHOT.company.proof).toEqual([
      { value: '20+ лет', label: 'юридической практики' },
      { value: '1+ млрд ₽', label: 'взыскано в интересах клиентов' },
      { value: '5–10', label: 'новых клиентов в месяц' },
    ])

    expect(DEMO_SNAPSHOT.interactive.position.metrics.length).toBeGreaterThanOrEqual(3)
    expect(DEMO_SNAPSHOT.interactive.bottlenecks).toHaveLength(2)
    expect(DEMO_SNAPSHOT.interactive.actions).toHaveLength(3)
    expect(DEMO_SNAPSHOT.interactive.digitalAudit).toEqual({
      measuredAt: '24 июня 2026',
      performance: 42,
      lcpSeconds: 27.3,
      fcpSeconds: 6.1,
      note: 'Контрольный мобильный замер. Более ранние значения в демо не смешиваются с этим срезом.',
    })
    expect(DEMO_SNAPSHOT.fullReport.sections.map((section) => section.id)).toEqual([
      'summary',
      'diagnosis',
      'positioning',
      'channels',
      'automation',
      'roadmap',
      'tests',
      'risks',
      'sources',
    ])
  })

  it('использует согласованный срез фактов без старых конфликтующих замеров', () => {
    const serialized = JSON.stringify(DEMO_SNAPSHOT)
    expect(
      DEMO_SNAPSHOT.research.reliability.reduce((sum, item) => sum + item.count, 0),
    ).toBe(DEMO_SNAPSHOT.research.factCount)
    expect(serialized).not.toContain('16,2')
    expect(serialized).not.toContain('48/100')
  })

  it('содержит безопасные CTA', () => {
    expect(DEMO_SNAPSHOT.cta.paidHref).toBe('/intake?tier=paid')
    expect(DEMO_SNAPSHOT.cta.freeHref).toBe('/intake')
  })

  it('не содержит идентификаторы исходной компании или PII', () => {
    const serialized = JSON.stringify(DEMO_SNAPSHOT)
    const denylist = [
      /репутац/i,
      /glc[-.]?reputation/i,
      /https?:\/\//i,
      /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
      /(?:\+7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/,
      /\b(?:инн|огрн)\s*[:№]?\s*\d+/i,
      /\b(?:ул\.|улица|проспект|пер\.|переулок|офис|дом\s+\d+)/i,
    ]

    for (const pattern of denylist) {
      expect(serialized).not.toMatch(pattern)
    }
  })
})
