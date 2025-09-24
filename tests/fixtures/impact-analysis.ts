import { ImpactAnalysisInput, ImpactAnalysisResult } from '@/types/impact-analysis'
import { ANALYSIS_STATUS, CACHE_STATUS } from '@/lib/utils/constants'

export const validInputFixtures: ImpactAnalysisInput[] = [
  {
    role: 'Engineering Manager',
    changeDescription: 'Migrating from monolith to microservices architecture'
  },
  {
    role: 'Product Manager',
    changeDescription: 'Introducing mandatory two-factor authentication for all users'
  },
  {
    role: 'CISO',
    changeDescription: 'Implementing zero-trust security model across all systems'
  },
  {
    role: 'HR Director',
    changeDescription: 'Transitioning to fully remote work policy'
  }
]

export const invalidInputFixtures = [
  {
    // Missing role
    changeDescription: 'Some change'
  },
  {
    // Missing changeDescription
    role: 'Manager'
  },
  {
    // Empty strings
    role: '',
    changeDescription: ''
  },
  {
    // Wrong types
    role: 123,
    changeDescription: ['array', 'instead', 'of', 'string']
  }
]

export const expectedResponseStructure = {
  analysis_summary: 'string',
  risk_level: ['low', 'medium', 'high', 'critical'],
  risk_factors: 'array',
  risk_scoring: {
    scope: ['individual', 'team', 'organization', 'national', 'global'],
    severity: ['minor', 'moderate', 'major', 'catastrophic'],
    human_impact: ['none', 'limited', 'significant', 'mass_casualty'],
    time_sensitivity: ['long_term', 'short_term', 'immediate', 'critical']
  },
  decision_trace: 'array',
  sources: 'array',
  meta: {
    timestamp: 'string',
    status: 'string',
    run_id: 'string',
    role: 'string',
    changeDescription: 'string',
    _cache: 'string'
  }
}

export function createMockAIResponse(): ImpactAnalysisResult {
  return {
    analysis_summary: "### Predicted Impacts\n- **System Architecture**: Migration complexity may cause temporary service disruptions\n\n### Risk Factors\n- **Technical Risk**: Service decomposition challenges",
    risk_level: 'high',
    risk_rationale: 'Complex architectural change with potential service disruptions',
    risk_factors: [
      'Service decomposition complexity',
      'Potential data consistency issues',
      'Increased operational overhead'
    ],
    risk_scoring: {
      scope: 'organization',
      severity: 'major',
      human_impact: 'limited',
      time_sensitivity: 'short_term'
    },
    decision_trace: [
      'Analyzed scope of microservices migration',
      'Evaluated technical complexity and risks',
      'Considered organizational impact',
      'Applied severity scoring based on service disruption potential'
    ],
    sources: [
      { title: 'Microservices Migration Guide', url: 'https://example.com/microservices' },
      { title: 'Architecture Best Practices', url: 'https://example.com/architecture' }
    ],
    meta: {
      timestamp: new Date().toISOString(),
      status: ANALYSIS_STATUS.COMPLETE,
      run_id: 'ia_test_12345',
      role: 'Engineering Manager',
      changeDescription: 'Migrating from monolith to microservices architecture',
      _cache: CACHE_STATUS.MISS
    }
  }
}