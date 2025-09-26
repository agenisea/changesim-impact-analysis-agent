export type Scope = 'single' | 'team' | 'organization' | 'national' | 'global'
export type Severity = 'minor' | 'moderate' | 'major' | 'catastrophic'
export type HumanImpact = 'none' | 'limited' | 'significant' | 'mass_casualty'
export type TimeSensitivity = 'long_term' | 'short_term' | 'immediate' | 'critical'
export type RiskLabel = 'low' | 'medium' | 'high' | 'critical'

const scopeRank: Readonly<Record<Scope, number>> = {
  single: 0,
  team: 1,
  organization: 2,
  national: 3,
  global: 4,
} as const

const severityRank: Readonly<Record<Severity, number>> = {
  minor: 0,
  moderate: 1,
  major: 2,
  catastrophic: 3,
} as const

const humanRank: Readonly<Record<HumanImpact, number>> = {
  none: 0,
  limited: 1,
  significant: 2,
  mass_casualty: 3,
} as const

const timeRank: Readonly<Record<TimeSensitivity, number>> = {
  long_term: 0,
  short_term: 1,
  immediate: 2,
  critical: 3,
} as const

export function mapRiskLevel(
  scope: Scope,
  severity: Severity,
  human: HumanImpact,
  time: TimeSensitivity
): { level: RiskLabel; orgCapTriggered?: boolean } {
  const s = scopeRank[scope]
  const sev = severityRank[severity]
  const h = humanRank[human]
  const t = timeRank[time]

  // ---- CRITICAL (explicit catastrophic/systemic) ----
  if (sev === 3) return { level: 'critical' } // catastrophic
  if (h === 3) return { level: 'critical' } // mass casualty
  if (s >= scopeRank.national && (sev >= 2 || h >= 2)) return { level: 'critical' } // national/global + major/significant
  if (t === 3 && sev >= 2) return { level: 'critical' } // time=critical + major+

  // ---- HARD CAPS ----
  // 1) Single-person guardrail: cap at medium, allow low when criteria met
  if (s === 0 && h < 3) {
    const qualifiesForLow = sev <= 1 && h === 0 && t <= 1
    return { level: qualifiesForLow ? 'low' : 'medium' }
  }

  // 2) Org-cap (NEW): organization scope + limited/no human impact + not urgent + ≤ major => medium
  if (s === scopeRank.organization && h <= 1 && t <= 1 && sev <= 2)
    return { level: 'medium', orgCapTriggered: true }

  // ---- HIGH (thresholded fallbacks) ----
  const majorFactors =
    (s >= scopeRank.organization ? 1 : 0) + // organization+
    (sev >= 2 ? 1 : 0) + // major+
    (h >= 2 ? 1 : 0) + // significant+
    (t >= 2 ? 1 : 0) // immediate+

  if (s >= scopeRank.national) return { level: 'high' } // national/global (non-critical)
  if (sev === 2 && (t >= 2 || h >= 2)) return { level: 'high' } // major + (urgent or significant)
  if (majorFactors >= 2) return { level: 'high' }

  // ---- MEDIUM / LOW ----
  if (majorFactors === 1) return { level: 'medium' }
  if (s <= scopeRank.team && sev <= 1 && h <= 1) return { level: 'low' }
  return { level: 'medium' }
}
