import { type CacheStatus, type AnalysisStatus } from '@/lib/utils/constants'

export interface ImpactAnalysisInput {
  readonly role: string
  readonly changeDescription: string
}

export type ImpactAnalysisResult = {
  analysis_summary: string // main narrative
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_rationale?: string // 1-line explanation shown in the badge tooltip
  risk_factors: string[] // 1-4 specific risk factors
  readonly risk_scoring: {
    readonly scope: 'individual' | 'team' | 'organization' | 'national' | 'global'
    readonly severity: 'minor' | 'moderate' | 'major' | 'catastrophic'
    readonly human_impact: 'none' | 'limited' | 'significant' | 'mass_casualty'
    readonly time_sensitivity: 'long_term' | 'short_term' | 'immediate' | 'critical'
  }
  decision_trace: string[] // 3–5 concise bullets
  sources: { title: string; url: string }[]
  meta?: {
    timestamp: string // ISO
    status?: AnalysisStatus
    run_id?: string
    role?: string // Role from input
    changeDescription?: string // Change description from input
    _cache?: CacheStatus // Cache source: 'hit', 'race', 'miss', 'session'
  }
}

// Agentic analysis specific types - uses a more lenient type for base_analysis
export type AgenticAnalysisResult = {
  base_analysis: {
    analysis_summary: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    risk_factors: string[]
    risk_scoring: ImpactAnalysisResult['risk_scoring']
    decision_trace: string[]
    sources: { title: string; url: string }[]
  }
  pattern_insights: {
    common_patterns: string[]
    potential_pitfalls: string[]
    success_factors: string[]
    contextual_insights: string[]
  }
  role_insights: {
    role_challenges: string[]
    adaptation_strategies: string[]
    stakeholder_considerations: string[]
    timeline_expectations: string[]
  }
  cross_reference: {
    similar_scenarios: string[]
    comparative_risks: string[]
    lessons_learned: string[]
  }
  dynamic_insights: {
    context_gaps?: string[]
    emergent_patterns: string[]
    strategic_recommendations: string[]
    risk_refinements: string[]
    implementation_priorities: string[]
  }
}
