/**
 * Multi-Perspective Testing Framework
 *
 * Tests ChangeSim outputs against multiple stakeholder perspectives
 * to ensure reliability and completeness of impact analysis.
 * This framework prevents blind spots and validates organizational insights.
 */

import type { ImpactResult } from '@/types/impact'
import type { OrganizationalContext } from '@/types/organizational-laws'

// ===== STAKEHOLDER PERSPECTIVES =====

export interface StakeholderPerspective {
  name: string
  role: 'affected' | 'decision_maker' | 'implementer' | 'observer' | 'customer'
  concerns: string[]
  priorities: Priority[]
  informationNeeds: InformationNeed[]
  successMetrics: string[]
  testQuestions: TestQuestion[]
}

export interface Priority {
  area: string
  importance: 'critical' | 'high' | 'medium' | 'low'
  timeframe: 'immediate' | 'short_term' | 'long_term'
}

export interface InformationNeed {
  category: 'risk' | 'timeline' | 'impact' | 'process' | 'support'
  specificity: 'high' | 'medium' | 'low'
  urgency: 'immediate' | 'before_change' | 'during_change' | 'after_change'
}

export interface TestQuestion {
  question: string
  expectedAnswerType: 'quantitative' | 'qualitative' | 'boolean' | 'timeline'
  criticalityLevel: 'must_answer' | 'should_answer' | 'nice_to_answer'
}

// ===== CORE PERSPECTIVES =====

export const EMPLOYEE_PERSPECTIVE: StakeholderPerspective = {
  name: "Affected Employee",
  role: "affected",
  concerns: [
    "Job security and role clarity",
    "Skill relevance and development needs",
    "Work-life balance impacts",
    "Career progression opportunities",
    "Team relationships and dynamics",
    "Workload and stress levels"
  ],
  priorities: [
    { area: "job_security", importance: "critical", timeframe: "immediate" },
    { area: "skill_development", importance: "high", timeframe: "short_term" },
    { area: "work_life_balance", importance: "high", timeframe: "immediate" },
    { area: "career_growth", importance: "medium", timeframe: "long_term" }
  ],
  informationNeeds: [
    { category: "impact", specificity: "high", urgency: "immediate" },
    { category: "timeline", specificity: "high", urgency: "before_change" },
    { category: "support", specificity: "high", urgency: "before_change" }
  ],
  successMetrics: [
    "Maintained or improved job satisfaction",
    "Clear understanding of new role expectations",
    "Adequate training and support provided",
    "Preserved team relationships"
  ],
  testQuestions: [
    {
      question: "How will my day-to-day work change?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "must_answer"
    },
    {
      question: "What new skills will I need to develop?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "must_answer"
    },
    {
      question: "When will these changes take effect?",
      expectedAnswerType: "timeline",
      criticalityLevel: "must_answer"
    },
    {
      question: "Who can I turn to for support during the transition?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "should_answer"
    }
  ]
}

export const MANAGER_PERSPECTIVE: StakeholderPerspective = {
  name: "Direct Manager",
  role: "implementer",
  concerns: [
    "Team productivity during transition",
    "Employee engagement and retention",
    "Communication and change management",
    "Resource allocation and support needs",
    "Performance measurement and accountability",
    "Stakeholder expectations management"
  ],
  priorities: [
    { area: "team_performance", importance: "critical", timeframe: "immediate" },
    { area: "employee_retention", importance: "critical", timeframe: "short_term" },
    { area: "communication", importance: "high", timeframe: "immediate" },
    { area: "resource_planning", importance: "high", timeframe: "short_term" }
  ],
  informationNeeds: [
    { category: "risk", specificity: "high", urgency: "immediate" },
    { category: "process", specificity: "high", urgency: "before_change" },
    { category: "support", specificity: "medium", urgency: "before_change" }
  ],
  successMetrics: [
    "Minimal productivity disruption",
    "High employee engagement scores",
    "Successful implementation milestones",
    "Stakeholder satisfaction"
  ],
  testQuestions: [
    {
      question: "What specific risks should I prepare for?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "must_answer"
    },
    {
      question: "How should I communicate this change to my team?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "must_answer"
    },
    {
      question: "What resources will I need to support the transition?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "must_answer"
    },
    {
      question: "How will I measure success during the transition?",
      expectedAnswerType: "qualitative",
      criticalityLevel: "should_answer"
    }
  ]
}

/**
 * Test an impact analysis against all stakeholder perspectives
 */
export function testAgainstAllPerspectives(
  impactResult: ImpactResult,
  context: any
): {
  overallScore: number
  gaps: string[]
  recommendations: string[]
} {
  // Implementation: Test against all defined perspectives
  // This is a simplified version for the framework demonstration

  const perspectives = [EMPLOYEE_PERSPECTIVE, MANAGER_PERSPECTIVE]
  let totalScore = 0
  const allGaps: string[] = []
  const allRecommendations: string[] = []

  for (const perspective of perspectives) {
    const result = testAgainstPerspective(impactResult, perspective, context)
    totalScore += result.score
    allGaps.push(...result.gaps)
    allRecommendations.push(...result.recommendations)
  }

  return {
    overallScore: totalScore / perspectives.length,
    gaps: [...new Set(allGaps)], // dedupe
    recommendations: [...new Set(allRecommendations)] // dedupe
  }
}

/**
 * Test an impact analysis against a specific stakeholder perspective
 */
export function testAgainstPerspective(
  impactResult: ImpactResult,
  perspective: StakeholderPerspective,
  context: any
): {
  score: number
  gaps: string[]
  recommendations: string[]
} {
  // Simplified implementation for demonstration
  // Real implementation would analyze impact result content against perspective needs

  const concernsCovered = analyzeConcernCoverage(impactResult, perspective)
  const questionAnswered = analyzeQuestionCoverage(impactResult, perspective)

  const score = (concernsCovered + questionAnswered) / 2
  const gaps = identifyPerspectiveGaps(impactResult, perspective, score)
  const recommendations = generatePerspectiveRecommendations(perspective, gaps)

  return { score, gaps, recommendations }
}

// Helper functions
import { assessStakeholderConcernCoverage } from './diagnostic-helpers'

function analyzeConcernCoverage(impactResult: ImpactResult, perspective: StakeholderPerspective): number {
  return assessStakeholderConcernCoverage(impactResult, perspective.concerns)
}

function analyzeQuestionCoverage(impactResult: ImpactResult, perspective: StakeholderPerspective): number {
  const content = `${impactResult.summary_markdown || ''} ${(impactResult.risk_reasons || []).join(' ')} ${(impactResult.decision_trace || []).join(' ')}`
  const criticalQuestions = perspective.testQuestions.filter(q => q.criticalityLevel === 'must_answer')

  // Check if critical questions are addressed by looking for relevant keywords
  const answeredQuestions = criticalQuestions.filter(question => {
    const questionKeywords = question.question.toLowerCase().split(' ').filter(word =>
      word.length > 3 && !['will', 'what', 'when', 'where', 'how', 'should', 'need'].includes(word)
    )

    return questionKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    )
  })

  return criticalQuestions.length > 0 ? answeredQuestions.length / criticalQuestions.length : 0.8
}

function identifyPerspectiveGaps(impactResult: ImpactResult, perspective: StakeholderPerspective, score: number): string[] {
  const gaps: string[] = []

  if (score < 0.6) {
    gaps.push(`Insufficient coverage of ${perspective.name} concerns`)
  }

  if (!impactResult.decision_trace || impactResult.decision_trace.length < 3) {
    gaps.push(`Limited decision rationale for ${perspective.name}`)
  }

  return gaps
}

function generatePerspectiveRecommendations(perspective: StakeholderPerspective, gaps: string[]): string[] {
  const recommendations: string[] = []

  if (gaps.length > 0) {
    recommendations.push(`Enhance analysis for ${perspective.name} perspective`)
    recommendations.push(`Address specific concerns: ${perspective.concerns.slice(0, 3).join(', ')}`)
  }

  return recommendations
}