export interface ImpactInput {
  role: string
  changeDescription: string
  researchMode?: boolean
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
  decision_trace: string[] // 3–5 concise bullets
  sources: { title: string; url: string }[]
  meta?: {
    timestamp: string // ISO
    status?: 'complete' | 'pending' | 'error'
    run_id?: string
    role?: string // Role from input
    changeDescription?: string // Change description from input
  }
}

// Enhanced result when Research Mode is enabled
export interface EnhancedImpactResult extends ImpactResult {
  // Research Mode fields
  principles?: {
    valid: boolean
    violations: Array<{ law: string; severity: string; reason: string }>
    insights: string[]
  }
  perspectives?: {
    overallScore: number
    gaps: string[]
    stakeholderResults: Array<{
      name: string
      score: number
      concerns: string[]
    }>
  }
  humanCentered?: {
    overallScore: number
    improvements: string[]
    dimensions: {
      dignity: number
      stress: number
      clarity: number
      agency: number
      support: number
    }
  }
  plan?: {
    signals: Array<{
      kind: string
      reason: string
      priority: number
      confidence: number
    }>
    rationale: string[]
  }
  actions?: {
    summary: {
      executed: string[]
      recommendationCount: number
      summary: string
    }
    keyRecommendations: string[]
    executed: Array<{
      kind: string
      output: {
        title: string
        recommendations: string[]
        metrics?: string[]
        notes?: string[]
      }
    }>
  } | null
  // Tracing metadata
  tracing?: {
    traceId: string
    frameworkVersion: string
    totalDuration: number
    eventCounts: Record<string, number>
  }
}
