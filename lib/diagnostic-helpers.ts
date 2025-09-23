// lib/diagnostic-helpers.ts
export function calculateChangeLoad(scope: string, severity: string, time: string) {
  const scopeW = { individual:0.2, team:0.6, organization:1.0, national:1.8, global:2.5 } as const
  const sevW   = { minor:0.3, moderate:0.6, major:1.0, catastrophic:2.0 } as const
  const urg    = time === 'immediate' || time === 'critical' ? 1.5 : 1.0
  return (scopeW[scope as keyof typeof scopeW] ?? 0.6) + (sevW[severity as keyof typeof sevW] ?? 0.6) * urg
}

export function relationshipRisk(hasNamedSuccessor?: boolean, trustPathDisrupted?: boolean) {
  if (trustPathDisrupted && !hasNamedSuccessor) return 'high'
  if (trustPathDisrupted || !hasNamedSuccessor) return 'medium'
  return 'low'
}

export function calculateOrganizationalCapacity(context: any): number {
  // Base capacity depends on scope and maturity
  let baseCapacity = 1.0

  // Adjust for organizational scope
  if (context.risk_scoring?.scope === 'team') baseCapacity = 0.8
  if (context.risk_scoring?.scope === 'organization') baseCapacity = 1.2
  if (context.risk_scoring?.scope === 'national') baseCapacity = 1.5
  if (context.risk_scoring?.scope === 'global') baseCapacity = 2.0

  // Reduce capacity if recent changes or high stress
  // Note: changeLoadPct is a percentage, so 130 means 130%
  if (context.orgSignals?.changeLoadPct && context.orgSignals.changeLoadPct > 100) {
    baseCapacity *= 0.7 // Already overloaded
  }

  return baseCapacity
}

export function assessCulturalAlignment(changeDesc: string, cultureDistance: number = 0.3): number {
  // Simple heuristic: check for culture-related keywords
  const culturalChangeKeywords = [
    'values', 'culture', 'mission', 'vision', 'principles',
    'remote', 'office', 'work-life', 'benefits', 'perks'
  ]

  const hasCulturalKeywords = culturalChangeKeywords.some(keyword =>
    changeDesc.toLowerCase().includes(keyword)
  )

  // If change involves cultural elements, alignment depends on distance
  if (hasCulturalKeywords) {
    return 1 - cultureDistance // Higher distance = lower alignment
  }

  // Non-cultural changes have baseline alignment
  return 0.8
}

export function assessHumanNeedsImpact(summaryMarkdown: string, riskReasons: string[]): {
  dignity: number
  security: number
  connection: number
  growth: number
  meaning: number
} {
  const content = `${summaryMarkdown} ${riskReasons.join(' ')}`.toLowerCase()

  // Check for keywords that impact each dimension
  const dignityKeywords = ['respect', 'autonomy', 'voice', 'identity', 'control', 'choice']
  const securityKeywords = ['job', 'financial', 'stability', 'safety', 'belonging', 'layoff']
  const connectionKeywords = ['team', 'relationship', 'collaboration', 'communication', 'support']
  const growthKeywords = ['skill', 'learning', 'development', 'career', 'advancement', 'training']
  const meaningKeywords = ['purpose', 'mission', 'values', 'impact', 'contribution', 'fulfillment']

  const checkKeywords = (keywords: string[]) => {
    const matches = keywords.filter(keyword => content.includes(keyword)).length
    return Math.max(5, 10 - matches * 1.5) // Start at baseline, reduce for negative mentions
  }

  return {
    dignity: checkKeywords(dignityKeywords),
    security: checkKeywords(securityKeywords),
    connection: checkKeywords(connectionKeywords),
    growth: checkKeywords(growthKeywords),
    meaning: checkKeywords(meaningKeywords)
  }
}

export function assessStakeholderConcernCoverage(
  impactResult: any,
  stakeholderConcerns: string[]
): number {
  const content = `${impactResult.summary_markdown || ''} ${(impactResult.risk_reasons || []).join(' ')}`.toLowerCase()

  const coveredConcerns = stakeholderConcerns.filter(concern => {
    const keywords = concern.toLowerCase().split(' ')
    return keywords.some(keyword => content.includes(keyword))
  })

  return coveredConcerns.length / stakeholderConcerns.length
}

export function evaluateLanguageEmpathy(text: string): {
  score: number
  hasEmpathyPatterns: boolean
  hasDismissiveLanguage: boolean
} {
  const empathyPatterns = [
    'we understand', 'it\'s natural', 'many people', 'you may feel',
    'we\'ll support', 'resources available', 'here to help'
  ]

  const dismissivePatterns = [
    'just', 'simply', 'easy', 'minor concern', 'shouldn\'t worry',
    'no big deal', 'quickly resolve', 'should be easy'
  ]

  const lowerText = text.toLowerCase()
  const hasEmpathy = empathyPatterns.some(pattern => lowerText.includes(pattern))
  const hasDismissive = dismissivePatterns.some(pattern => lowerText.includes(pattern))

  let score = 0.6 // baseline
  if (hasEmpathy) score += 0.3
  if (hasDismissive) score -= 0.5 // More penalty for dismissive language

  return {
    score: Math.max(0, Math.min(1, score)),
    hasEmpathyPatterns: hasEmpathy,
    hasDismissiveLanguage: hasDismissive
  }
}