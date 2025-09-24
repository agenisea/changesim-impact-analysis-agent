/**
 * Risk scoring enum normalizer
 *
 * Ensures API schema enums are properly normalized to match evaluator expectations,
 * preventing silent fallbacks to "medium" risk levels due to enum mismatches.
 */

import type { Scope, Severity, HumanImpact, TimeSensitivity } from './evaluator'

// Schema enums (what AI returns)
type SchemaScope = 'individual' | 'team' | 'organization' | 'national' | 'global'
type SchemaSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic'
type SchemaHumanImpact = 'none' | 'limited' | 'significant' | 'mass_casualty'
type SchemaTimeSensitivity = 'long_term' | 'short_term' | 'immediate' | 'critical'

/**
 * Normalizes scope from schema format to evaluator format
 * Key difference: 'individual' -> 'single'
 */
export function normalizeScope(scope: SchemaScope): Scope {
  switch (scope) {
    case 'individual':
      return 'single'
    case 'team':
    case 'organization':
    case 'national':
    case 'global':
      return scope
    default:
      console.warn(`[normalize] Unknown scope value: ${scope}, falling back to 'single'`)
      return 'single'
  }
}

/**
 * Normalizes severity from schema format to evaluator format
 * Currently identical, but provides consistency and future-proofing
 */
export function normalizeSeverity(severity: SchemaSeverity): Severity {
  const validSeverities: Severity[] = ['minor', 'moderate', 'major', 'catastrophic']

  if (validSeverities.includes(severity as Severity)) {
    return severity as Severity
  }

  console.warn(`[normalize] Unknown severity value: ${severity}, falling back to 'moderate'`)
  return 'moderate'
}

/**
 * Normalizes human impact from schema format to evaluator format
 * Currently identical, but provides consistency and future-proofing
 */
export function normalizeHumanImpact(humanImpact: SchemaHumanImpact): HumanImpact {
  const validHumanImpacts: HumanImpact[] = ['none', 'limited', 'significant', 'mass_casualty']

  if (validHumanImpacts.includes(humanImpact as HumanImpact)) {
    return humanImpact as HumanImpact
  }

  console.warn(`[normalize] Unknown human_impact value: ${humanImpact}, falling back to 'none'`)
  return 'none'
}

/**
 * Normalizes time sensitivity from schema format to evaluator format
 * Currently identical, but provides consistency and future-proofing
 */
export function normalizeTimeSensitivity(timeSensitivity: SchemaTimeSensitivity): TimeSensitivity {
  const validTimeSensitivities: TimeSensitivity[] = ['long_term', 'short_term', 'immediate', 'critical']

  if (validTimeSensitivities.includes(timeSensitivity as TimeSensitivity)) {
    return timeSensitivity as TimeSensitivity
  }

  console.warn(`[normalize] Unknown time_sensitivity value: ${timeSensitivity}, falling back to 'long_term'`)
  return 'long_term'
}

/**
 * Normalizes all risk scoring values in one call
 * This is the main function to use in the API route
 */
export function normalizeRiskScoring(riskScoring: {
  scope: SchemaScope
  severity: SchemaSeverity
  human_impact: SchemaHumanImpact
  time_sensitivity: SchemaTimeSensitivity
}) {
  return {
    scope: normalizeScope(riskScoring.scope),
    severity: normalizeSeverity(riskScoring.severity),
    human_impact: normalizeHumanImpact(riskScoring.human_impact),
    time_sensitivity: normalizeTimeSensitivity(riskScoring.time_sensitivity),
  }
}

/**
 * Type guard to validate if a value is a valid evaluator scope
 */
export function isValidScope(value: unknown): value is Scope {
  return typeof value === 'string' &&
    ['single', 'team', 'organization', 'national', 'global'].includes(value)
}

/**
 * Type guard to validate if a value is a valid evaluator severity
 */
export function isValidSeverity(value: unknown): value is Severity {
  return typeof value === 'string' &&
    ['minor', 'moderate', 'major', 'catastrophic'].includes(value)
}

/**
 * Type guard to validate if a value is a valid evaluator human impact
 */
export function isValidHumanImpact(value: unknown): value is HumanImpact {
  return typeof value === 'string' &&
    ['none', 'limited', 'significant', 'mass_casualty'].includes(value)
}

/**
 * Type guard to validate if a value is a valid evaluator time sensitivity
 */
export function isValidTimeSensitivity(value: unknown): value is TimeSensitivity {
  return typeof value === 'string' &&
    ['long_term', 'short_term', 'immediate', 'critical'].includes(value)
}