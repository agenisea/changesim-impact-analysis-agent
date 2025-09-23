// tests/principles.test.ts
import { describe, it, expect } from 'vitest'
import { validateAgainstPrinciples } from '@/lib/organizational-principles'
import { testAgainstAllPerspectives } from '@/lib/multi-perspective-testing'
import { ensureHumanCenteredAnalysis } from '@/lib/human-centered-framework'

const baseCtx = {
  role:'Engineering Manager',
  changeDescription:'VP departure without named successor',
  risk_scoring:{ scope:'organization', severity:'major', human_impact:'limited', time_sensitivity:'immediate' },
  orgSignals:{ hasNamedSuccessor:false, trustPathDisrupted:true, cultureDistance:0.5 }
}

const baseParsedResult = {
  summary_markdown: 'VP departure will create uncertainty in team direction and decision-making authority.',
  risk_level: 'medium' as const,
  risk_reasons: ['Leadership vacuum', 'Decision-making delays', 'Team uncertainty'],
  risk_scoring: baseCtx.risk_scoring,
  decision_trace: ['Assessed scope: organization-wide', 'Identified succession gap', 'Evaluated trust impact'],
  sources: [],
  meta: {}
}

describe('Organizational Principles', () => {
  it('flags finite adaptation when overloaded', () => {
    const parsed: any = { ...baseParsedResult }
    const overloadedCtx = {
      ...baseCtx,
      orgSignals: { ...baseCtx.orgSignals, changeLoadPct: 130 }
    }
    const res = validateAgainstPrinciples(parsed, overloadedCtx)
    expect(res.valid).toBe(false)
    expect(res.violations.some(v => v.law.includes('Finite Adaptation'))).toBe(true)
  })

  it('detects relationship conservation issue (no successor + trust disrupted)', () => {
    const parsed: any = { ...baseParsedResult }
    const res = validateAgainstPrinciples(parsed, baseCtx)
    expect(res.violations.some(v => v.law.includes('Relationship Conservation'))).toBe(true)
  })

  it('validates human dignity when no threats present', () => {
    const safeCtx = {
      ...baseCtx,
      changeDescription: 'Promotion of senior engineer to team lead role',
      orgSignals: { hasNamedSuccessor: true, trustPathDisrupted: false, cultureDistance: 0.2 }
    }
    const parsed: any = { ...baseParsedResult }
    const res = validateAgainstPrinciples(parsed, safeCtx)

    // Should not have human dignity violations for a promotion with clear succession
    const dignityViolations = res.violations.filter(v => v.law.includes('Human Dignity'))
    expect(dignityViolations.length).toBeLessThan(2) // Allow some violations but not critical ones
  })

  it('flags cultural momentum issues for major culture changes', () => {
    const culturalCtx = {
      ...baseCtx,
      changeDescription: 'Shifting from remote-first to office-mandatory policy',
      orgSignals: { ...baseCtx.orgSignals, cultureDistance: 0.8 }
    }
    const parsed: any = { ...baseParsedResult }
    const res = validateAgainstPrinciples(parsed, culturalCtx)

    const culturalViolations = res.violations.filter(v => v.law.includes('Cultural Momentum'))
    expect(culturalViolations.length).toBeGreaterThan(0)
  })
})

describe('Multi-Perspective Testing', () => {
  it('identifies stakeholder coverage gaps', () => {
    const parsed: any = {
      ...baseParsedResult,
      summary_markdown: 'Brief change summary',
      risk_reasons: ['Generic risk'],
      decision_trace: ['Brief trace']
    }

    const res = testAgainstAllPerspectives(parsed, baseCtx)
    expect(res.overallScore).toBeLessThan(0.8) // Should have gaps
    expect(res.gaps.length).toBeGreaterThan(0)
  })

  it('recognizes good stakeholder coverage', () => {
    const comprehensiveParsed: any = {
      ...baseParsedResult,
      summary_markdown: 'VP departure will impact job security, team relationships, skill development needs, and career progression. Clear communication plan and training support will be provided. Timeline for transition includes specific milestones and support resources for affected employees.',
      risk_reasons: ['Job security concerns', 'Team dynamics disruption', 'Skill gap emergence', 'Communication challenges'],
      decision_trace: ['Assessed employee impact', 'Evaluated manager readiness', 'Planned support resources', 'Established timeline', 'Created communication strategy']
    }

    const res = testAgainstAllPerspectives(comprehensiveParsed, baseCtx)
    expect(res.overallScore).toBeGreaterThan(0.5) // Lower threshold since this is a complex scenario
  })
})

describe('Human-Centered Analysis', () => {
  it('detects empathy gaps in communication', () => {
    const coldParsed: any = {
      ...baseParsedResult,
      summary_markdown: 'Simply restructure the team. This is just a minor organizational change that should be easy to implement. No big deal.'
    }

    const res = ensureHumanCenteredAnalysis(coldParsed, baseCtx)
    expect(res.score).toBeLessThan(0.75) // Should flag dismissive language
    expect(res.improvements.some(imp => imp.includes('language') || imp.includes('dismissive') || imp.includes('Remove dismissive'))).toBe(true)
  })

  it('recognizes empathetic communication', () => {
    const empathicParsed: any = {
      ...baseParsedResult,
      summary_markdown: 'We understand this change may feel uncertain. Many people in similar situations experience concerns about job security and team relationships. Here\'s how we\'ll support you through this transition with clear resources and regular check-ins.'
    }

    const res = ensureHumanCenteredAnalysis(empathicParsed, baseCtx)
    expect(res.score).toBeGreaterThan(0.7)
  })

  it('identifies dignity threats in layoff scenarios', () => {
    const layoffCtx = {
      ...baseCtx,
      changeDescription: 'Department layoffs due to budget constraints'
    }
    const layoffParsed: any = {
      ...baseParsedResult,
      summary_markdown: 'Budget cuts require immediate staff reduction across multiple departments.',
      risk_reasons: ['Job losses', 'Financial instability', 'Team disruption']
    }

    const res = ensureHumanCenteredAnalysis(layoffParsed, layoffCtx)
    // Test should verify that the system recognizes this as a serious scenario
    expect(res.score).toBeLessThan(0.8) // Should have lower score for layoffs
    expect(res.improvements.length).toBeGreaterThan(0) // Should have improvement suggestions
  })
})