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
import { persistRun, createTracedRun } from '@/lib/runs-store'
import { startTrace, traced } from '@/lib/tracing-simple'
import { validateAgainstPrinciples } from '@/lib/organizational-principles'
import { testAgainstAllPerspectives } from '@/lib/multi-perspective-testing'
import { ensureHumanCenteredAnalysis } from '@/lib/human-centered-framework'
import { planNextSteps } from '@/lib/plan/planner'
import { executePlan, summarizeActions, extractKeyRecommendations } from '@/lib/plan/router'

const impactInputSchema = z.object({
  changeDescription: z.string().min(1, 'Change description is required'),
  role: z.string().min(1, 'Role is required'),
  context: z.any().optional(),
  researchMode: z.boolean().optional(),
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

    const { changeDescription, role, context, researchMode = false } = validation.data

    // Start tracing for this request
    const trace = startTrace()
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
    let result: ImpactResult = parsedResult

    // Research Mode: Add principled analysis and planning
    if (researchMode) {
      try {
        console.log('[impact] Running Research Mode analysis')

        // Organizational principles validation
        const principles = await traced(trace, 'principle_validation', async () =>
          validateAgainstPrinciples(parsedResult, {
            role,
            changeDescription,
            risk_scoring: parsedResult.risk_scoring,
            orgSignals: context?.orgSignals || {}
          })
        )

        // Multi-perspective stakeholder testing
        const perspectives = await traced(trace, 'perspective_test', async () =>
          testAgainstAllPerspectives(parsedResult, { role, changeDescription })
        )

        // Human-centered analysis
        const human = await traced(trace, 'human_analysis', async () =>
          ensureHumanCenteredAnalysis(parsedResult, { changeDescription })
        )

        // Create diagnostics for planner
        const diagnostics = {
          principles: { violations: principles.violations ?? [] },
          human_centered: { score: human.score, improvements: human.improvements ?? [] },
          perspectives: { overallScore: perspectives.overallScore, gaps: perspectives.gaps ?? [] },
          orgSignals: context?.orgSignals ?? {}
        }

        // Plan next steps
        const plan = await traced(trace, 'plan_generation', async () =>
          planNextSteps(diagnostics)
        )

        // Execute subagents if actions needed
        let actionResults = null
        if (plan.signals.some(s => s.kind !== 'none')) {
          actionResults = await traced(trace, 'subagent_execution', async () =>
            executePlan(plan, {
              role,
              changeDescription,
              risk_scoring: parsedResult.risk_scoring,
              diagnostics
            })
          )
        }

        // Enhance result with research data
        const actionsSummary = actionResults ? summarizeActions(actionResults) : null
        const keyRecommendations = actionResults ? extractKeyRecommendations(actionResults, 5) : []

        result = {
          ...result,
          action_recommendations: keyRecommendations, // Minimal surface for UI
          research: {
            trace_id: trace.traceId,
            principles,
            perspectives,
            human_centered: human,
            plan,
            actions: actionResults ? {
              summary: actionsSummary,
              executed: actionResults.actions,
              keyRecommendations
            } : null
          }
        } as any // Type assertion for enhanced result

        // Persist run data (fire-and-forget)
        void persistRun(createTracedRun(trace.traceId, {
          role,
          change_desc: changeDescription,
          risk_level: parsedResult.risk_level,
          risk_scoring: parsedResult.risk_scoring,
          principles_result: principles,
          stakeholder_result: perspectives,
          human_centered_result: human,
          decision_trace: parsedResult.decision_trace,
          plan_result: plan,
          actions_result: actionResults ? {
            summary: actionsSummary,
            executed: actionResults.actions,
            keyRecommendations
          } : null,
          model_meta: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.2,
            prompt_version: '1.0'
          },
          tokens_in: (usage as any).promptTokens || 0,
          tokens_out: (usage as any).completionTokens || 0,
          latency_ms: undefined // TODO: Add timing
        }))

        console.log('[impact] Research Mode analysis completed')
      } catch (error) {
        console.error('[impact] Research Mode analysis failed:', error)
        // Continue with basic result - don't let research mode break the API
      }
    } else {
      // Basic mode: still persist basic run data
      void persistRun(createTracedRun(trace.traceId, {
        role,
        change_desc: changeDescription,
        risk_level: parsedResult.risk_level,
        risk_scoring: parsedResult.risk_scoring,
        decision_trace: parsedResult.decision_trace,
        model_meta: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.2,
          prompt_version: '1.0'
        },
        tokens_in: (usage as any).promptTokens || 0,
        tokens_out: (usage as any).completionTokens || 0
      }))
    }

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
