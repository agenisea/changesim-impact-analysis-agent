import { type CacheStatus, type AnalysisStatus } from '@/lib/config/constants'

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
