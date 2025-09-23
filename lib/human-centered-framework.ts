/**
 * Human-Centered Framework for ChangeSim
 *
 * Ensures that all organizational change analysis preserves human dignity,
 * reduces stress, and clarifies impact through a lens of empathy and respect.
 * This framework makes human welfare a first-class concern in change analysis.
 */

import type { ImpactResult } from '@/types/impact'
import type { OrganizationalContext } from '@/types/organizational-laws'

// ===== HUMAN-CENTERED PRINCIPLES =====

/**
 * Core human needs that must be preserved during organizational change
 */
export interface HumanNeeds {
  dignity: DignityFactors
  security: SecurityFactors
  connection: ConnectionFactors
  growth: GrowthFactors
  meaning: MeaningFactors
}

export interface DignityFactors {
  respect: number // 0-10: feeling valued and respected
  autonomy: number // 0-10: having choice and control
  voice: number // 0-10: being heard and considered
  identity: number // 0-10: role aligns with self-concept
}

export interface SecurityFactors {
  economic: number // 0-10: financial stability
  psychological: number // 0-10: emotional safety
  physical: number // 0-10: workplace safety
  social: number // 0-10: belonging and acceptance
}

export interface ConnectionFactors {
  relationships: number // 0-10: quality of work relationships
  collaboration: number // 0-10: ability to work together effectively
  communication: number // 0-10: clear, open information flow
  support: number // 0-10: access to help when needed
}

export interface GrowthFactors {
  learning: number // 0-10: opportunities to develop skills
  advancement: number // 0-10: career progression possibilities
  mastery: number // 0-10: becoming expert in meaningful work
  contribution: number // 0-10: making a meaningful impact
}

export interface MeaningFactors {
  purpose: number // 0-10: understanding why work matters
  values: number // 0-10: alignment with personal values
  legacy: number // 0-10: contributing to something lasting
  fulfillment: number // 0-10: work feels personally rewarding
}

// ===== STRESS ASSESSMENT FRAMEWORK =====

export interface StressProfile {
  currentLevel: StressLevel
  sources: StressSource[]
  resilience: ResilienceFactors
  coping: CopingMechanisms
  riskFactors: StressRiskFactor[]
}

export type StressLevel = 'low' | 'manageable' | 'elevated' | 'high' | 'critical'

export interface StressSource {
  category: 'workload' | 'uncertainty' | 'relationships' | 'skills' | 'values' | 'control' | 'time'
  intensity: number // 1-10
  duration: 'acute' | 'chronic'
  modifiable: boolean // can this be influenced by organizational action?
}

export interface ResilienceFactors {
  personal: PersonalResilience
  social: SocialResilience
  organizational: OrganizationalResilience
}

export interface PersonalResilience {
  adaptability: number // 0-10
  optimism: number // 0-10
  problemSolving: number // 0-10
  emotionalRegulation: number // 0-10
}

export interface SocialResilience {
  networkStrength: number // 0-10
  socialSupport: number // 0-10
  mentorship: number // 0-10
  teamCohesion: number // 0-10
}

export interface OrganizationalResilience {
  leadership: number // 0-10
  communication: number // 0-10
  resources: number // 0-10
  culture: number // 0-10
}

export interface CopingMechanisms {
  positive: PositiveCoping[]
  concerning: ConcerningCoping[]
  support: SupportMechanisms[]
}

export interface PositiveCoping {
  mechanism: string
  effectiveness: number // 0-10
  accessibility: 'high' | 'medium' | 'low'
}

export interface ConcerningCoping {
  mechanism: string
  riskLevel: 'low' | 'medium' | 'high'
  intervention: string
}

export interface SupportMechanisms {
  type: 'professional' | 'peer' | 'managerial' | 'organizational' | 'external'
  availability: 'immediate' | 'scheduled' | 'on_request' | 'limited'
  effectiveness: number // 0-10
}

export interface StressRiskFactor {
  factor: string
  likelihood: number // 0-1
  impact: 'low' | 'medium' | 'high' | 'severe'
  prevention: string[]
}

// ===== IMPACT CLARITY FRAMEWORK =====

export interface ImpactClarity {
  understanding: UnderstandingLevel
  communication: CommunicationQuality
  expectations: ExpectationClarity
  timeline: TimelineClarity
}

export interface UnderstandingLevel {
  whatChanges: number // 0-10: clarity about what will change
  whyChanging: number // 0-10: understanding the rationale
  howAffectsMe: number // 0-10: personal impact clarity
  whatToExpect: number // 0-10: predictability of outcomes
}

export interface CommunicationQuality {
  clarity: number // 0-10: message is clear and understandable
  completeness: number // 0-10: all necessary information provided
  timeliness: number // 0-10: information provided when needed
  empathy: number // 0-10: communication shows care and understanding
}

export interface ExpectationClarity {
  newRole: number // 0-10: clear understanding of new responsibilities
  success: number // 0-10: clear success criteria
  support: number // 0-10: clear support available
  timeline: number // 0-10: clear timing expectations
}

export interface TimelineClarity {
  phases: PhaseClarity[]
  milestones: MilestoneClarity[]
  dependencies: DependencyClarity[]
}

export interface PhaseClarity {
  phase: string
  duration: string
  activities: string[]
  outcomes: string[]
  clarity: number // 0-10
}

export interface MilestoneClarity {
  milestone: string
  date: string
  criteria: string[]
  clarity: number // 0-10
}

export interface DependencyClarity {
  dependency: string
  owner: string
  impact: string
  clarity: number // 0-10
}

// ===== HUMAN-CENTERED VALIDATION =====

/**
 * Validate that an impact analysis meets human-centered criteria
 */
export function validateHumanCenteredApproach(
  impactResult: ImpactResult,
  context: any
): HumanCenteredValidation {
  const humanNeedsAssessment = assessHumanNeedsPreservation(impactResult, context)
  const stressAssessment = assessStressReduction(impactResult, context)
  const clarityAssessment = assessImpactClarity(impactResult, context)

  const overallScore = (
    humanNeedsAssessment.score +
    stressAssessment.score +
    clarityAssessment.score
  ) / 3

  return {
    overallScore,
    humanNeeds: humanNeedsAssessment,
    stress: stressAssessment,
    clarity: clarityAssessment,
    recommendations: generateHumanCenteredRecommendations(
      humanNeedsAssessment,
      stressAssessment,
      clarityAssessment
    ),
    ethicalConsiderations: identifyEthicalConsiderations(impactResult, context)
  }
}

export interface HumanCenteredValidation {
  overallScore: number // 0-1
  humanNeeds: HumanNeedsAssessment
  stress: StressAssessment
  clarity: ClarityAssessment
  recommendations: string[]
  ethicalConsiderations: EthicalConsideration[]
}

export interface HumanNeedsAssessment {
  score: number // 0-1
  dignityPreserved: boolean
  securityMaintained: boolean
  connectionSupported: boolean
  growthEnabled: boolean
  meaningPreserved: boolean
  concerns: string[]
}

export interface StressAssessment {
  score: number // 0-1
  stressLevel: StressLevel
  primarySources: string[]
  mitigationStrategies: string[]
  supportNeeds: string[]
}

export interface ClarityAssessment {
  score: number // 0-1
  understandingLevel: number // 0-1
  communicationQuality: number // 0-1
  expectationClarity: number // 0-1
  improvementAreas: string[]
}

export interface EthicalConsideration {
  principle: 'autonomy' | 'beneficence' | 'non_maleficence' | 'justice' | 'dignity'
  concern: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

// ===== HUMAN-CENTERED LANGUAGE FRAMEWORK =====

/**
 * Guidelines for human-centered communication in impact analysis
 */
export const HUMAN_CENTERED_LANGUAGE = {
  principles: [
    "Use 'we' language to emphasize shared experience",
    "Acknowledge emotions explicitly and validate them",
    "Focus on opportunities within challenges",
    "Provide specific, actionable next steps",
    "Respect individual differences and needs"
  ],

  avoid: [
    "Dismissive language ('just', 'simply', 'easy')",
    "Minimizing concerns ('minor', 'shouldn't be worried')",
    "Absolute statements without context",
    "Technical jargon without explanation",
    "Generic reassurances without specifics"
  ],

  patterns: {
    acknowledging: [
      "We understand this change may feel...",
      "It's natural to have concerns about...",
      "Many people in similar situations experience..."
    ],
    supporting: [
      "Here's how we'll support you through...",
      "Resources available to you include...",
      "You won't be navigating this alone..."
    ],
    clarifying: [
      "What this means for your day-to-day work is...",
      "The specific timeline looks like...",
      "You can expect to see changes in..."
    ]
  }
}

/**
 * Evaluate language in impact analysis for human-centered qualities
 */
export function evaluateLanguageHumanCenteredness(text: string): {
  score: number // 0-1
  strengths: string[]
  improvements: string[]
  suggestions: string[]
} {
  // Implementation would analyze text for:
  // - Empathetic tone
  // - Person-first language
  // - Acknowledgment of emotions
  // - Specific support offered
  // - Clear next steps

  return {
    score: 0.75, // Placeholder
    strengths: ["Acknowledges emotional impact", "Provides specific timeline"],
    improvements: ["Could offer more specific support resources"],
    suggestions: ["Consider adding 'we understand this may feel uncertain' language"]
  }
}

// ===== IMPLEMENTATION HELPERS =====

import { assessHumanNeedsImpact, evaluateLanguageEmpathy } from './diagnostic-helpers'

function assessHumanNeedsPreservation(
  impactResult: ImpactResult,
  context: any
): HumanNeedsAssessment {
  const needs = assessHumanNeedsImpact(
    impactResult.summary_markdown || '',
    impactResult.risk_reasons || []
  )

  // Calculate overall score (0-1)
  const avgScore = (needs.dignity + needs.security + needs.connection + needs.growth + needs.meaning) / 50 // out of 10 each

  const concerns = []
  if (needs.dignity < 6) concerns.push("Dignity concerns detected in language")
  if (needs.security < 6) concerns.push("Security/stability concerns not adequately addressed")
  if (needs.connection < 6) concerns.push("Limited attention to relationship impacts")
  if (needs.growth < 6) concerns.push("Growth and development needs not addressed")
  if (needs.meaning < 6) concerns.push("Purpose and meaning not clearly communicated")

  return {
    score: avgScore,
    dignityPreserved: needs.dignity >= 6,
    securityMaintained: needs.security >= 6,
    connectionSupported: needs.connection >= 6,
    growthEnabled: needs.growth >= 6,
    meaningPreserved: needs.meaning >= 6,
    concerns
  }
}

function assessStressReduction(
  impactResult: ImpactResult,
  context: any
): StressAssessment {
  const content = `${impactResult.summary_markdown || ''} ${(impactResult.risk_reasons || []).join(' ')}`
  const changeDesc = context.changeDescription || ''

  // Identify stress sources from content
  const stressSources = []
  if (changeDesc.includes('layoff') || changeDesc.includes('termination')) {
    stressSources.push("Job security concerns")
  }
  if (content.includes('uncertain') || content.includes('unclear')) {
    stressSources.push("Uncertainty about timeline")
  }
  if (content.includes('skill') || content.includes('training')) {
    stressSources.push("New skill requirements")
  }
  if (content.includes('relationship') || content.includes('team')) {
    stressSources.push("Team dynamics changes")
  }

  // Assess stress level based on risk level and sources
  const riskLevel = impactResult.risk_level
  let stressLevel: StressLevel = 'manageable'
  if (riskLevel === 'critical') stressLevel = 'critical'
  else if (riskLevel === 'high') stressLevel = 'high'
  else if (riskLevel === 'medium' && stressSources.length > 2) stressLevel = 'elevated'
  else if (stressSources.length <= 1) stressLevel = 'low'

  const score = {
    'low': 0.9,
    'manageable': 0.7,
    'elevated': 0.5,
    'high': 0.3,
    'critical': 0.1
  }[stressLevel]

  return {
    score,
    stressLevel,
    primarySources: stressSources.slice(0, 3),
    mitigationStrategies: [
      "Clear communication plan",
      "Regular check-ins and support",
      "Training and development resources"
    ],
    supportNeeds: [
      "Manager guidance and availability",
      "Peer support networks",
      "Clear escalation paths"
    ]
  }
}

function assessImpactClarity(
  impactResult: ImpactResult,
  context: any
): ClarityAssessment {
  const content = impactResult.summary_markdown || ''
  const decisionTrace = impactResult.decision_trace || []

  // Assess understanding components
  const hasTimelineInfo = content.includes('timeline') || content.includes('when') || content.includes('date')
  const hasRationale = decisionTrace.length > 2 || content.includes('because') || content.includes('rationale')
  const hasSpecificImpacts = (impactResult.risk_reasons || []).length > 2
  const hasNextSteps = content.includes('next') || content.includes('support') || content.includes('resource')

  const understandingLevel = (
    (hasTimelineInfo ? 0.25 : 0) +
    (hasRationale ? 0.25 : 0) +
    (hasSpecificImpacts ? 0.25 : 0) +
    (hasNextSteps ? 0.25 : 0)
  )

  // Assess communication quality using language evaluation
  const langEval = evaluateLanguageEmpathy(content)
  const communicationQuality = langEval.score

  // Expectation clarity based on content specificity
  const expectationClarity = content.length > 200 ? 0.8 : 0.6

  const overallScore = (understandingLevel + communicationQuality + expectationClarity) / 3

  const improvementAreas = []
  if (!hasTimelineInfo) improvementAreas.push("More specific timeline details")
  if (!hasRationale) improvementAreas.push("Clearer decision rationale")
  if (!hasSpecificImpacts) improvementAreas.push("More specific impact descriptions")
  if (!hasNextSteps) improvementAreas.push("Clearer next steps and support")
  if (langEval.hasDismissiveLanguage) improvementAreas.push("Remove dismissive language")

  return {
    score: overallScore,
    understandingLevel,
    communicationQuality,
    expectationClarity,
    improvementAreas
  }
}

function generateHumanCenteredRecommendations(
  humanNeeds: HumanNeedsAssessment,
  stress: StressAssessment,
  clarity: ClarityAssessment
): string[] {
  const recommendations: string[] = []

  if (!humanNeeds.connectionSupported) {
    recommendations.push("Address relationship and connection concerns explicitly")
  }

  if (stress.stressLevel === 'elevated' || stress.stressLevel === 'high') {
    recommendations.push("Implement stress reduction strategies before change implementation")
  }

  if (clarity.score < 0.8) {
    recommendations.push("Improve communication clarity and specificity")
  }

  return recommendations
}

function identifyEthicalConsiderations(
  impactResult: ImpactResult,
  context: any
): EthicalConsideration[] {
  // Identify potential ethical concerns in the proposed change

  return [
    {
      principle: 'autonomy',
      concern: 'Limited choice in role transition',
      severity: 'medium',
      recommendation: 'Provide options where possible and explain constraints'
    }
  ]
}

// ===== EXPORT MAIN VALIDATION FUNCTION =====

/**
 * Main function to ensure ChangeSim analysis meets human-centered standards
 */
export function ensureHumanCenteredAnalysis(
  impactResult: ImpactResult,
  context: any
): {
  passes: boolean
  score: number
  recommendations: string[]
  improvements: string[]
} {
  const validation = validateHumanCenteredApproach(impactResult, context)
  const languageEval = evaluateLanguageHumanCenteredness(impactResult.summary_markdown)

  const combinedScore = (validation.overallScore + languageEval.score) / 2

  return {
    passes: combinedScore > 0.75,
    score: combinedScore,
    recommendations: [
      ...validation.recommendations,
      ...languageEval.suggestions
    ],
    improvements: [
      ...validation.humanNeeds.concerns,
      ...validation.stress.supportNeeds,
      ...validation.clarity.improvementAreas,
      ...languageEval.improvements
    ]
  }
}