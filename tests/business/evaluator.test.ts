import { describe, it, expect } from 'vitest'
import { mapRiskLevel } from '@/lib/business/evaluator'

describe('mapRiskLevel', () => {
  it('T1 — critical (catastrophic)', () => {
    const result = mapRiskLevel('team', 'catastrophic', 'limited', 'short_term')
    expect(result.level).toBe('critical')
  })

  it('T2 — critical (national + major)', () => {
    const result = mapRiskLevel('national', 'major', 'limited', 'short_term')
    expect(result.level).toBe('critical')
  })

  it('T3 — high (org + major + immediate)', () => {
    const result = mapRiskLevel('organization', 'major', 'significant', 'immediate')
    expect(result.level).toBe('high')
  })

  it('T4 — org-cap to medium (the RTO/DEI case)', () => {
    const result = mapRiskLevel('organization', 'major', 'limited', 'short_term')
    expect(result.level).toBe('medium')
    expect(result.orgCapTriggered).toBe(true)
  })

  it('T5 — single-scope cap to medium', () => {
    const result = mapRiskLevel('single', 'major', 'limited', 'immediate')
    expect(result.level).toBe('medium')
  })

  it('T6 — single-scope low when mild factors', () => {
    const result = mapRiskLevel('single', 'moderate', 'none', 'short_term')
    expect(result.level).toBe('low')
  })

  it('T7 — national scope escalates to high', () => {
    const result = mapRiskLevel('national', 'moderate', 'limited', 'short_term')
    expect(result.level).toBe('high')
  })
})
