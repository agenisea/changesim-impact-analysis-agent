export interface ImpactInput {
  role: string
  changeDescription: string
}

export interface ImpactAnalysis {
  summary: string // short, plain text (~120 words)
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high'
  reasons: string[]
}

export type ImpactResult = {
  summary_markdown: string // main narrative
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_badge_reason?: string // 1-line explanation shown in the badge tooltip
  risk_reasons: string[] // 1-4 specific risk factors
  risk_scoring: {
    scope: 'individual' | 'team' | 'organization' | 'national' | 'global'
    severity: 'minor' | 'moderate' | 'major' | 'catastrophic'
    human_impact: 'none' | 'limited' | 'significant' | 'mass_casualty'
    time_sensitivity: 'long_term' | 'short_term' | 'immediate' | 'critical'
  }
  decision_trace: string[] // 3–6 concise bullets
  sources: { title: string; url: string }[]
  meta?: {
    timestamp: string // ISO
    status?: 'complete' | 'pending' | 'error'
    run_id?: string
    role?: string // Role from input
    changeDescription?: string // Change description from input
  }
}
