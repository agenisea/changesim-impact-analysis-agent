/**
 * Elegant Foundational Principles for ChangeSim
 *
 * These principles serve as the philosophical and practical foundation
 * for all organizational change analysis, moving beyond risk calculation
 * toward understanding the fundamental dynamics of human systems.
 */

import type {
  OrganizationalContext,
  ValidationResult,
  EnergyConservation,
  TrustConservation,
  HierarchyPreservation,
  EmotionalContinuity
} from '@/types/organizational-laws'

// ===== THE FIVE FOUNDATIONAL PRINCIPLES =====

/**
 * PRINCIPLE 1: THE LAW OF FINITE ADAPTATION
 *
 * Human systems have limited capacity to process change simultaneously.
 * Changes queue and compound rather than process in parallel.
 *
 * "Organizations are like rivers - they can handle increased flow,
 * but beyond capacity, they overflow or change course entirely."
 */
export const PRINCIPLE_FINITE_ADAPTATION = {
  name: "Finite Adaptation Capacity",
  law: "Human systems process change sequentially within finite bandwidth",

  validate: (changes: any[], context: any): ValidationResult => {
    const totalChangeLoad = calculateChangeLoad(changes, context)
    const organizationalCapacity = calculateCapacity(context)
    const overloadRatio = totalChangeLoad / organizationalCapacity

    return {
      valid: overloadRatio <= 1.2, // 20% tolerance
      violations: overloadRatio > 1.2 ? [{
        law: "Finite Adaptation",
        severity: overloadRatio > 2 ? 'critical' : 'warning',
        description: `Change overload detected: ${Math.round(overloadRatio * 100)}% of capacity`,
        predictedConsequence: "Adaptation fatigue, decreased effectiveness, resistance",
        mitigation: ["Sequence changes", "Increase support", "Reduce scope", "Extend timeline"]
      }] : [],
      recommendations: generateCapacityRecommendations(overloadRatio, context),
      confidence: 0.85
    }
  }
}

/**
 * PRINCIPLE 2: THE LAW OF RELATIONSHIP CONSERVATION
 *
 * Trust, influence, and social capital redistribute but never disappear instantly.
 * Broken relationships create gaps that must be filled by other connections.
 *
 * "Trust flows like water - when one channel is blocked,
 * it seeks alternative paths or pools until it finds them."
 */
export const PRINCIPLE_RELATIONSHIP_CONSERVATION = {
  name: "Relationship Conservation",
  law: "Social capital redistributes through alternative pathways when disrupted",

  validate: (change: any, context: any): ValidationResult => {
    const trustAnalysis = analyzeTrustFlow(change, context)
    const orphanedRelationships = findOrphanedRelationships(trustAnalysis)
    const alternativePaths = findAlternativeTrustPaths(orphanedRelationships, context)

    return {
      valid: alternativePaths.length >= orphanedRelationships.length * 0.8,
      violations: alternativePaths.length < orphanedRelationships.length * 0.8 ? [{
        law: "Relationship Conservation",
        severity: alternativePaths.length < orphanedRelationships.length * 0.5 ? 'critical' : 'warning',
        description: `${orphanedRelationships.length - alternativePaths.length} relationships lack alternative paths`,
        predictedConsequence: "Isolation, communication breakdown, decreased collaboration",
        mitigation: ["Create bridge roles", "Facilitate introductions", "Establish mentorship", "Strengthen peer networks"]
      }] : [],
      recommendations: generateRelationshipRecommendations(trustAnalysis, alternativePaths),
      confidence: 0.75
    }
  }
}

/**
 * PRINCIPLE 3: THE LAW OF EMERGENT STABILITY
 *
 * Organizations naturally seek equilibrium, but the new state may be
 * fundamentally different from the original. Stability emerges from
 * the bottom up, not just top down.
 *
 * "Like ecosystems after disturbance, organizations will find a new balance,
 * but we cannot predict exactly what that balance will look like."
 */
export const PRINCIPLE_EMERGENT_STABILITY = {
  name: "Emergent Stability",
  law: "Systems self-organize toward new equilibrium states after disruption",

  validate: (change: any, context: any): ValidationResult => {
    const stabilityFactors = assessStabilityFactors(change, context)
    const emergentPatterns = predictEmergentPatterns(stabilityFactors, context)
    const stabilityTimeline = estimateStabilityTimeline(emergentPatterns)

    return {
      valid: stabilityTimeline.confidence > 0.6,
      violations: stabilityTimeline.confidence <= 0.6 ? [{
        law: "Emergent Stability",
        severity: stabilityTimeline.confidence < 0.3 ? 'critical' : 'warning',
        description: `Unpredictable stability outcome (${Math.round(stabilityTimeline.confidence * 100)}% confidence)`,
        predictedConsequence: "Prolonged instability, multiple false equilibria, organizational thrashing",
        mitigation: ["Strengthen anchor points", "Create feedback loops", "Monitor emergence patterns", "Support organic leadership"]
      }] : [],
      recommendations: generateStabilityRecommendations(emergentPatterns, stabilityTimeline),
      confidence: stabilityTimeline.confidence
    }
  }
}

/**
 * PRINCIPLE 4: THE LAW OF CULTURAL MOMENTUM
 *
 * Organizational culture changes slowly relative to structure and process.
 * Cultural shifts require sustained energy over time, not intensity bursts.
 *
 * "Culture is like a massive ship - small rudder movements over time
 * achieve more than powerful engines pushing against the current."
 */
export const PRINCIPLE_CULTURAL_MOMENTUM = {
  name: "Cultural Momentum",
  law: "Cultural transformation requires sustained effort over time, not intensity",

  validate: (change: any, context: any): ValidationResult => {
    const culturalAlignment = assessCulturalAlignment(change, context)
    const momentumRequired = calculateCulturalMomentum(change, context)
    const sustainabilityFactor = assessSustainability(momentumRequired, context)

    return {
      valid: sustainabilityFactor > 0.7,
      violations: sustainabilityFactor <= 0.7 ? [{
        law: "Cultural Momentum",
        severity: sustainabilityFactor < 0.4 ? 'critical' : 'warning',
        description: `Insufficient cultural momentum sustainability (${Math.round(sustainabilityFactor * 100)}%)`,
        predictedConsequence: "Cultural resistance, change fatigue, reversion to old patterns",
        mitigation: ["Build cultural bridges", "Start with willing adopters", "Embed in rituals", "Celebrate small wins"]
      }] : [],
      recommendations: generateCulturalRecommendations(culturalAlignment, momentumRequired),
      confidence: 0.8
    }
  }
}

/**
 * PRINCIPLE 5: THE LAW OF HUMAN DIGNITY
 *
 * All organizational changes must preserve human dignity and agency.
 * Changes that threaten identity, meaning, or autonomy create proportional resistance.
 *
 * "Sustainable change honors the person within the role,
 * the human within the system."
 */
export const PRINCIPLE_HUMAN_DIGNITY = {
  name: "Human Dignity Preservation",
  law: "Sustainable change preserves identity, meaning, and agency",

  validate: (change: any, context: any): ValidationResult => {
    const dignityAssessment = assessDignityPreservation(change, context)
    const identityThreats = identifyIdentityThreats(change, context)
    const agencyImpacts = assessAgencyImpacts(change, context)

    return {
      valid: dignityAssessment.score > 0.8 && identityThreats.length === 0,
      violations: (dignityAssessment.score <= 0.8 || identityThreats.length > 0) ? [{
        law: "Human Dignity",
        severity: dignityAssessment.score < 0.6 || identityThreats.some(t => t.severity === 'high') ? 'critical' : 'warning',
        description: `Dignity preservation concerns: ${identityThreats.length} identity threats detected`,
        predictedConsequence: "Resistance, disengagement, loss of trust, turnover",
        mitigation: ["Preserve core identity elements", "Increase autonomy", "Clarify meaning", "Provide choice"]
      }] : [],
      recommendations: generateDignityRecommendations(dignityAssessment, identityThreats, agencyImpacts),
      confidence: 0.9
    }
  }
}

// ===== PRINCIPLE APPLICATION FRAMEWORK =====

export const ORGANIZATIONAL_PRINCIPLES = [
  PRINCIPLE_FINITE_ADAPTATION,
  PRINCIPLE_RELATIONSHIP_CONSERVATION,
  PRINCIPLE_EMERGENT_STABILITY,
  PRINCIPLE_CULTURAL_MOMENTUM,
  PRINCIPLE_HUMAN_DIGNITY
] as const

/**
 * Apply all foundational principles to validate a proposed change
 */
export function validateAgainstPrinciples(
  change: any,
  context: any
): ValidationResult {
  const results = ORGANIZATIONAL_PRINCIPLES.map(principle =>
    principle.validate(change, context)
  )

  const allViolations = results.flatMap(r => r.violations)
  const allRecommendations = results.flatMap(r => r.recommendations)
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

  return {
    valid: results.every(r => r.valid),
    violations: allViolations,
    recommendations: [...new Set(allRecommendations)], // dedupe
    confidence: avgConfidence
  }
}

/**
 * Generate principle-based insights for change planning
 */
export function generatePrincipleInsights(
  change: any,
  context: any
): PrincipleInsights {
  const validation = validateAgainstPrinciples(change, context)

  return {
    principleViolations: validation.violations.map(v => ({
      principle: v.law,
      severity: v.severity,
      description: v.description,
      impact: v.predictedConsequence
    })),
    recommendations: validation.recommendations,
    confidenceScore: validation.confidence,
    riskFactors: extractRiskFactors(validation.violations),
    mitigationStrategies: extractMitigationStrategies(validation.violations),
    successIndicators: generateSuccessIndicators(change, context),
    monitoringPoints: generateMonitoringPoints(change, context)
  }
}

// ===== SUPPORTING TYPES =====

export interface PrincipleInsights {
  principleViolations: Array<{
    principle: string
    severity: 'warning' | 'error' | 'critical'
    description: string
    impact: string
  }>
  recommendations: string[]
  confidenceScore: number
  riskFactors: string[]
  mitigationStrategies: string[]
  successIndicators: string[]
  monitoringPoints: string[]
}

// ===== HELPER FUNCTIONS =====

import {
  calculateChangeLoad as calcChangeLoad,
  calculateOrganizationalCapacity,
  relationshipRisk,
  assessCulturalAlignment as assessCultural
} from './diagnostic-helpers'

function calculateChangeLoad(changes: any[], context: any): number {
  // For single change analysis, use the current change
  if (!changes?.length && context?.risk_scoring) {
    let baseLoad = calcChangeLoad(
      context.risk_scoring.scope,
      context.risk_scoring.severity,
      context.risk_scoring.time_sensitivity
    )

    // If there's already high change load, factor that in
    if (context.orgSignals?.changeLoadPct && context.orgSignals.changeLoadPct > 100) {
      baseLoad = baseLoad * (context.orgSignals.changeLoadPct / 100)
    }

    return baseLoad
  }
  return changes?.length * 0.3 || 0.5 // Fallback for multiple changes
}

function calculateCapacity(context: any): number {
  return calculateOrganizationalCapacity(context)
}

function generateCapacityRecommendations(overloadRatio: number, context: OrganizationalContext): string[] {
  return overloadRatio > 1.2 ? [
    "Consider sequencing changes over longer timeline",
    "Increase change management support resources",
    "Prioritize highest-impact changes only"
  ] : []
}

function analyzeTrustFlow(change: any, context: any): any {
  const risk = relationshipRisk(
    context.orgSignals?.hasNamedSuccessor,
    context.orgSignals?.trustPathDisrupted
  )

  return {
    riskLevel: risk,
    hasSuccessor: context.orgSignals?.hasNamedSuccessor || false,
    trustDisrupted: context.orgSignals?.trustPathDisrupted || false
  }
}

function findOrphanedRelationships(trustAnalysis: any): any[] {
  if (trustAnalysis.riskLevel === 'high') {
    return [{ type: 'leadership_gap', severity: 'high' }]
  }
  if (trustAnalysis.riskLevel === 'medium') {
    return [{ type: 'trust_disruption', severity: 'medium' }]
  }
  return []
}

function findAlternativeTrustPaths(orphaned: any[], context: any): any[] {
  // Simple heuristic: assume alternatives exist unless high risk with no successor
  const hasAlternatives = !(
    orphaned.some(o => o.severity === 'high') &&
    !context.orgSignals?.hasNamedSuccessor
  )

  return hasAlternatives ? orphaned.map(o => ({ ...o, hasAlternative: true })) : []
}

function generateRelationshipRecommendations(trustAnalysis: any, alternatives: any[]): string[] {
  const recommendations = []

  if (!trustAnalysis.hasSuccessor) {
    recommendations.push("Identify and announce interim leadership")
  }

  if (trustAnalysis.trustDisrupted) {
    recommendations.push("Plan stakeholder communication to rebuild trust")
  }

  if (alternatives.length < 1) {
    recommendations.push("Create bridge roles to maintain relationship continuity")
  }

  return recommendations
}

function assessStabilityFactors(change: any, context: OrganizationalContext): any {
  return {}
}

function predictEmergentPatterns(factors: any, context: OrganizationalContext): any {
  return {}
}

function estimateStabilityTimeline(patterns: any): { confidence: number } {
  return { confidence: 0.7 }
}

function generateStabilityRecommendations(patterns: any, timeline: any): string[] {
  return []
}

function assessCulturalAlignment(change: any, context: any): any {
  const alignment = assessCultural(
    context.changeDescription || '',
    context.orgSignals?.cultureDistance || 0.3
  )

  return {
    alignmentScore: alignment,
    requiresIntention: alignment < 0.6,
    cultureDistance: context.orgSignals?.cultureDistance || 0.3
  }
}

function calculateCulturalMomentum(change: any, context: any): any {
  const alignment = assessCultural(
    context.changeDescription || '',
    context.orgSignals?.cultureDistance || 0.3
  )

  return {
    required: alignment < 0.7 ? 'high' : 'medium',
    timeline: alignment < 0.5 ? 'long_term' : 'medium_term',
    resistance: alignment < 0.4 ? 'high' : 'low'
  }
}

function assessSustainability(momentum: any, context: any): number {
  // High momentum requirements reduce sustainability unless supported
  if (momentum.required === 'high' && momentum.resistance === 'high') {
    return 0.4
  }
  if (momentum.required === 'high') {
    return 0.6
  }
  return 0.8
}

function generateCulturalRecommendations(alignment: any, momentum: any): string[] {
  const recommendations = []

  if (alignment.requiresIntention) {
    recommendations.push("Develop explicit cultural bridge strategy")
  }

  if (momentum.resistance === 'high') {
    recommendations.push("Start with cultural champions and early adopters")
  }

  if (momentum.timeline === 'long_term') {
    recommendations.push("Plan sustained engagement over 6+ months")
  }

  return recommendations
}

function assessDignityPreservation(change: any, context: any): { score: number } {
  // Check for dignity-threatening keywords in the change description
  const changeText = context.changeDescription?.toLowerCase() || ''
  const dignityThreats = [
    'layoff', 'termination', 'fired', 'eliminated',
    'demotion', 'reduced', 'cut', 'downgrade'
  ]

  const hasThreat = dignityThreats.some(threat => changeText.includes(threat))
  let baseScore = hasThreat ? 0.4 : 0.8

  // Departure scenarios without succession also threaten dignity
  if (changeText.includes('departure') && !context.orgSignals?.hasNamedSuccessor) {
    baseScore = Math.min(baseScore, 0.6)
  }

  // Adjust based on scope - larger scope changes can be more impersonal
  const scopeMap: Record<string, number> = {
    individual: 0.1,
    team: 0.05,
    organization: -0.1,
    national: -0.2,
    global: -0.2
  }
  const scopeAdjustment = scopeMap[context.risk_scoring?.scope || 'team'] || 0

  return { score: Math.max(0.1, Math.min(1.0, baseScore + scopeAdjustment)) }
}

function identifyIdentityThreats(change: any, context: any): Array<{ severity: string }> {
  const changeText = context.changeDescription?.toLowerCase() || ''
  const threats = []

  // Major identity threats
  if (changeText.includes('layoff') || changeText.includes('elimination')) {
    threats.push({ severity: 'high', type: 'job_loss' })
  }

  // Moderate identity threats
  if (changeText.includes('demotion') || changeText.includes('reduced')) {
    threats.push({ severity: 'medium', type: 'status_reduction' })
  }

  // Role change threats
  if (changeText.includes('restructure') || changeText.includes('reorganization')) {
    threats.push({ severity: 'medium', type: 'role_uncertainty' })
  }

  return threats
}

function assessAgencyImpacts(change: any, context: any): any {
  const changeText = context.changeDescription?.toLowerCase() || ''

  // Low agency indicators
  const lowAgencyKeywords = ['mandatory', 'required', 'must', 'forced', 'no choice']
  const hasLowAgency = lowAgencyKeywords.some(keyword => changeText.includes(keyword))

  return {
    autonomyImpact: hasLowAgency ? 'reduced' : 'maintained',
    choiceAvailable: !hasLowAgency,
    controlLevel: hasLowAgency ? 'low' : 'medium'
  }
}

function generateDignityRecommendations(dignity: any, threats: any[], agency: any): string[] {
  const recommendations = []

  if (dignity.score < 0.6) {
    recommendations.push("Emphasize respect and value of affected individuals")
  }

  if (threats.some((t: any) => t.severity === 'high')) {
    recommendations.push("Provide clear rationale and support for major changes")
  }

  if (agency.autonomyImpact === 'reduced') {
    recommendations.push("Offer choices where possible within constraints")
  }

  if (!agency.choiceAvailable) {
    recommendations.push("Explain constraints clearly and respectfully")
  }

  return recommendations
}

function extractRiskFactors(violations: any[]): string[] {
  return violations.map(v => v.predictedConsequence)
}

function extractMitigationStrategies(violations: any[]): string[] {
  return violations.flatMap(v => v.mitigation)
}

function generateSuccessIndicators(change: any, context: OrganizationalContext): string[] {
  return [
    "Maintained productivity levels within 2 weeks",
    "No increase in voluntary turnover",
    "Positive sentiment in feedback surveys",
    "Successful completion of key milestones"
  ]
}

function generateMonitoringPoints(change: any, context: OrganizationalContext): string[] {
  return [
    "Weekly team check-ins for first month",
    "Bi-weekly productivity metrics review",
    "Monthly culture pulse surveys",
    "Quarterly relationship network analysis"
  ]
}