import { type NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { ImpactResult } from '@/types/impact'
import { z } from 'zod'
import { IMPACT_ANALYSIS_SYSTEM_PROMPT } from '@/components/agent/prompt'
import {
  mapRiskLevel,
  type Scope as RiskScope,
  type Severity as RiskSeverity,
  type HumanImpact as RiskHumanImpact,
  type TimeSensitivity as RiskTimeSensitivity,
} from '@/lib/evaluator'
import { impactModel } from '@/lib/ai-client'

const impactInputSchema = z.object({
  changeDescription: z.string().min(1, 'Change description is required'),
  role: z.string().min(1, 'Role is required'),
  context: z.any().optional(),
})

const impactResultSchema = z.object({
  summary_markdown: z.string(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  risk_badge_reason: z.string().optional(),
  risk_reasons: z.array(z.string()).min(1).max(4),
  risk_scoring: z.object({
    scope: z.enum(['individual', 'team', 'organization', 'national', 'global']),
    severity: z.enum(['minor', 'moderate', 'major', 'catastrophic']),
    human_impact: z.enum(['none', 'limited', 'significant', 'mass_casualty']),
    time_sensitivity: z.enum(['long_term', 'short_term', 'immediate', 'critical']),
  }),
  decision_trace: z.array(z.string()).min(3).max(5),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    )
    .min(2),
  meta: z
    .object({
      timestamp: z.string(),
      status: z.enum(['complete', 'pending', 'error']).optional(),
      run_id: z.string().optional(),
      role: z.string().optional(),
      changeDescription: z.string().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[impact] API route called')

    const body = await request.json()
    console.log('[impact] Request data:', body)

    // Validate input
    const validation = impactInputSchema.safeParse(body)
    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      console.log('[impact] Validation failed:', errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { changeDescription, role, context } = validation.data

    const runId = `ia_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Generate impact analysis using AI SDK with structured outputs
    const { object: parsedResult, usage } = await generateObject({
      model: impactModel,
      system: IMPACT_ANALYSIS_SYSTEM_PROMPT,
      prompt: `Analyze the impact of this organizational change:

Change Description: ${changeDescription}
${context ? `Additional Context: ${JSON.stringify(context)}` : ''}

Return only valid JSON matching the ImpactResult schema.`,
      schema: impactResultSchema,
      temperature: 0.2,
      maxOutputTokens: 1500,
    })

    console.log('[impact] AI response received')
    console.log('[impact] Token usage:', usage)

    // Apply deterministic risk mapping
    const { scope, severity, human_impact, time_sensitivity } = parsedResult.risk_scoring
    const normalizedScope = (scope === 'individual' ? 'single' : scope) as RiskScope
    const riskResult = mapRiskLevel(
      normalizedScope,
      severity as RiskSeverity,
      human_impact as RiskHumanImpact,
      time_sensitivity as RiskTimeSensitivity
    )
    parsedResult.risk_level = riskResult.level

    // Add org-cap decision trace note when triggered
    if (riskResult.orgCapTriggered && parsedResult.decision_trace) {
      const guardrailNote = 'Risk level adjusted downward due to organizational scope guardrail'
      const keptCount = Math.min(parsedResult.decision_trace.length, 4)
      const trace = parsedResult.decision_trace.slice(0, keptCount)
      trace.push(guardrailNote)
      parsedResult.decision_trace = trace
    }


    if (parsedResult.risk_level) {
      parsedResult.risk_level = parsedResult.risk_level.toLowerCase() as
        | 'low'
        | 'medium'
        | 'high'
        | 'critical'
    }

    // Add meta information
    parsedResult.meta = {
      ...parsedResult.meta,
      timestamp: new Date().toISOString(),
      status: 'complete',
      run_id: runId,
      role: role,
      changeDescription: changeDescription,
    }

    // Result is already validated by generateObject
    const result: ImpactResult = parsedResult

    console.log('[impact] Impact analysis completed successfully')
    return NextResponse.json(result)
  } catch (error) {
    console.error('[impact] Impact analysis error:', error)
    console.error('[impact] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    })

    const errorMessage = (error as Error).message
    if (errorMessage.includes('429')) {
      return NextResponse.json(
        {
          error: 'AI service rate limit exceeded. Please try again in a few moments.',
        },
        { status: 429 }
      )
    } else if (errorMessage.includes('API')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 503 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to analyze impact. Please try again.' },
        { status: 500 }
      )
    }
  }
}
