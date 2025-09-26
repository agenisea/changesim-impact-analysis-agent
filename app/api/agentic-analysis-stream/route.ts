import { type NextRequest } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { generateObject } from 'ai'
import { type ImpactAnalysisResult } from '@/types/impact-analysis'
import { z } from 'zod'
import { IMPACT_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai/impact-analysis'
import { mapRiskLevel } from '@/lib/business/evaluator'
import { normalizeRiskScoring } from '@/lib/business/normalize'
import { appendSystemNoteWithBounds, boundDecisionTrace } from '@/lib/business/decision-trace'
import { impactModel } from '@/lib/ai/ai-client'
import { getEnhancedContextualMemory } from '@/lib/db/enhanced-embeddings'
import { chunkAndEmbedAnalysis } from '@/lib/db/embeddings'
import { sb } from '@/lib/db/client'
import {
  runPatternAnalysisAgent,
  runRoleSpecificAgent,
  runCrossReferenceAgent,
  runDynamicReasoningAgent
} from '@/lib/ai/agentic-rag'
import { checkSessionCostLimit, trackTokenUsage } from '@/lib/ai/persistent-cost-tracker'
import { createHash } from 'crypto'
import { getSessionIdCookie } from '@/lib/server/session'
import {
  ANALYSIS_STATUS,
  CACHE_STATUS,
  MODEL,
  TEMPERATURE,
  PROMPT_VERSION
} from '@/lib/utils/constants'

const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'

// Input validation schema
const agenticAnalysisInputSchema = z.object({
  role: z.string().min(1, 'Role is required').max(100, 'Role must be 100 characters or less'),
  changeDescription: z.string().min(10, 'Change description must be at least 10 characters').max(500, 'Change description must be 500 characters or less'),
})

// Streaming event types
type StreamEvent =
  | { type: 'base_analysis', data: any }
  | { type: 'context_summary', data: { totalChunks: number, chunkBreakdown: any } }
  | { type: 'pattern_insights', data: any }
  | { type: 'role_insights', data: any }
  | { type: 'cross_reference', data: any }
  | { type: 'dynamic_insights', data: any }
  | { type: 'complete', data: any }
  | { type: 'error', data: { message: string } }

function createStreamResponse(encoder: TextEncoder, controller: ReadableStreamDefaultController) {
  return {
    write: (event: StreamEvent) => {
      const chunk = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(encoder.encode(chunk))
    },
    close: () => {
      controller.close()
    }
  }
}

async function _POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      handleStreamingAnalysis(request, encoder, controller)
        .catch(error => {
          const errorEvent: StreamEvent = {
            type: 'error',
            data: { message: 'Analysis failed. Please try again.' }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
          controller.close()
        })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

async function handleStreamingAnalysis(
  request: NextRequest,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
) {
  const streamer = createStreamResponse(encoder, controller)

  try {
    console.log('[agentic-analysis-stream] API route called')

    const body = await request.json()
    const validatedInput = agenticAnalysisInputSchema.parse(body)

    // Generate cache key and session ID
    const inputHash = createHash('sha256')
      .update(JSON.stringify({
        role: validatedInput.role.trim().toLowerCase(),
        changeDescription: validatedInput.changeDescription.trim().toLowerCase()
      }))
      .digest('hex')

    const sessionData = await getSessionIdCookie()
    const runId = crypto.randomUUID()

    if (SHOW_DEBUG_LOGS) {
      console.log('[agentic-analysis-stream] Starting streaming analysis with run_id:', runId)
    }

    // Check session cost limit for multi-agent analysis (higher cost)
    const sessionCheck = await checkSessionCostLimit(sessionData.sessionId, 10.00) // $10 per session for multi-agent
    if (!sessionCheck.allowed) {
      if (SHOW_DEBUG_LOGS) {
        console.log(`[agentic-analysis-stream] Session cost limit exceeded: $${sessionCheck.currentSpend.toFixed(4)}`)
      }
      streamer.write({
        type: 'error',
        data: {
          message: `Session cost limit exceeded ($${sessionCheck.currentSpend.toFixed(2)}/$10.00). Please start a new session to continue.`
        }
      })
      streamer.close()
      return
    }

    // Step 1: Stream Base Analysis (15s)
    console.log('[stream] Starting base analysis...')
    const baseAnalysisResult = await generateObject({
      model: impactModel,
      system: IMPACT_ANALYSIS_SYSTEM_PROMPT,
      prompt: `Analyze the impact of this organizational change:

Role/Position: ${validatedInput.role}
Change Description: ${validatedInput.changeDescription}

Return only valid JSON matching the ImpactAnalysisResult schema.`,
      schema: z.object({
        analysis_summary: z.string(),
        risk_level: z.enum(['low', 'medium', 'high', 'critical']),
        risk_rationale: z.string().optional(),
        risk_factors: z.array(z.string()),
        risk_scoring: z.object({
          scope: z.enum(['individual', 'team', 'organization', 'national', 'global']),
          severity: z.enum(['minor', 'moderate', 'major', 'catastrophic']),
          human_impact: z.enum(['none', 'limited', 'significant', 'mass_casualty']),
          time_sensitivity: z.enum(['long_term', 'short_term', 'immediate', 'critical'])
        }),
        decision_trace: z.array(z.string()),
        sources: z.array(z.object({
          title: z.string(),
          url: z.string()
        }))
      }),
      temperature: TEMPERATURE
    })

    // Process base analysis
    const normalizedScoring = normalizeRiskScoring(baseAnalysisResult.object.risk_scoring)
    const mappedResult = mapRiskLevel(
      normalizedScoring.scope,
      normalizedScoring.severity,
      normalizedScoring.human_impact,
      normalizedScoring.time_sensitivity
    )
    const mappedRiskLevel = mappedResult.level
    const boundedTrace = boundDecisionTrace(baseAnalysisResult.object.decision_trace)

    const baseAnalysis: ImpactAnalysisResult = {
      analysis_summary: baseAnalysisResult.object.analysis_summary,
      risk_level: mappedRiskLevel,
      risk_rationale: baseAnalysisResult.object.risk_rationale,
      risk_factors: baseAnalysisResult.object.risk_factors,
      risk_scoring: {
        scope: normalizedScoring.scope === 'single' ? 'individual' as const : normalizedScoring.scope,
        severity: normalizedScoring.severity,
        human_impact: normalizedScoring.human_impact,
        time_sensitivity: normalizedScoring.time_sensitivity
      },
      decision_trace: boundedTrace,
      sources: baseAnalysisResult.object.sources,
      meta: {
        timestamp: new Date().toISOString(),
        status: ANALYSIS_STATUS.COMPLETE,
        run_id: runId,
        role: validatedInput.role,
        changeDescription: validatedInput.changeDescription
      }
    }

    // Stream base analysis immediately (saves 15s perceived wait time)
    streamer.write({ type: 'base_analysis', data: baseAnalysis })
    console.log('[stream] Base analysis streamed')

    // Step 2: Stream Context Summary (2s)
    console.log('[stream] Starting enhanced context retrieval...')
    const enhancedContext = await getEnhancedContextualMemory(validatedInput, baseAnalysis.risk_level)

    streamer.write({
      type: 'context_summary',
      data: {
        totalChunks: enhancedContext.summary.totalRetrievedChunks,
        chunkBreakdown: enhancedContext.summary.chunkTypeBreakdown
      }
    })
    console.log('[stream] Context summary streamed')

    // Step 3: Stream Parallel Agent Results (15s each, but parallel)
    console.log('[stream] Starting parallel agent execution...')

    const patternPromise = runPatternAnalysisAgent(validatedInput, baseAnalysis, enhancedContext.patternContext)
      .then(result => {
        streamer.write({ type: 'pattern_insights', data: result })
        console.log('[stream] Pattern insights streamed')
        return result
      })

    const rolePromise = runRoleSpecificAgent(validatedInput, baseAnalysis, enhancedContext.roleContext)
      .then(result => {
        streamer.write({ type: 'role_insights', data: result })
        console.log('[stream] Role insights streamed')
        return result
      })

    const [patternAnalysis, roleAnalysis] = await Promise.all([patternPromise, rolePromise])

    // Step 4: Stream Cross-Reference and Dynamic in parallel
    console.log('[stream] Starting synthesis agents...')

    const crossReferencePromise = runCrossReferenceAgent(validatedInput, baseAnalysis, enhancedContext.crossRefContext, {
      patterns: patternAnalysis,
      roleInsights: roleAnalysis
    }).then(result => {
      streamer.write({ type: 'cross_reference', data: result })
      console.log('[stream] Cross-reference streamed')
      return result
    })

    const { dynamicInsights, crossReference } = await runDynamicReasoningAgent(
      validatedInput,
      baseAnalysis,
      enhancedContext,
      {
        patterns: patternAnalysis,
        roleInsights: roleAnalysis
      },
      crossReferencePromise
    )

    streamer.write({ type: 'dynamic_insights', data: dynamicInsights })
    console.log('[stream] Dynamic insights streamed')

    // Step 5: Stream Complete Result
    const agenticResult = {
      base_analysis: baseAnalysis,
      pattern_insights: patternAnalysis,
      role_insights: roleAnalysis,
      cross_reference: crossReference,
      dynamic_insights: dynamicInsights
    }

    const completeResult = {
      ...agenticResult,
      meta: {
        timestamp: new Date().toISOString(),
        status: ANALYSIS_STATUS.COMPLETE,
        run_id: runId,
        role: validatedInput.role,
        changeDescription: validatedInput.changeDescription,
        _cache: CACHE_STATUS.MISS
      }
    }

    // Persist streaming result for parity with REST endpoint
    const { data: insertedRun, error: insertError } = await sb
      .from('changesim_impact_analysis_runs')
      .insert({
        run_id: runId,
        session_id: sessionData.sessionId,
        input_hash: inputHash,
        role: validatedInput.role,
        change_description: validatedInput.changeDescription,
        result: agenticResult,
        model: MODEL,
        temperature: TEMPERATURE,
        prompt_version: PROMPT_VERSION,
        input_tokens: null,
        output_tokens: null,
        total_tokens: null
      })
      .select()
      .single()

    if (insertError) {
      console.error('[agentic-analysis-stream] Database insert error:', insertError)
    }

    if (insertedRun) {
      // Track cost for multi-agent analysis (approximate based on base analysis)
      trackTokenUsage(runId, baseAnalysisResult.usage, MODEL, 'multi_agent').catch(error => {
        console.error('[agentic-analysis-stream] Cost tracking failed:', error.message)
      })

      chunkAndEmbedAnalysis(
        baseAnalysis,
        runId,
        validatedInput.role,
        validatedInput.changeDescription
      ).catch(error => {
        console.error(`[#${runId}] Streaming embedding failed:`, error.message)
      })
    }

    streamer.write({ type: 'complete', data: completeResult })
    console.log('[stream] Complete analysis streamed')

    streamer.close()

  } catch (error) {
    console.error('[agentic-analysis-stream] Analysis failed:', error)
    streamer.write({
      type: 'error',
      data: { message: 'Analysis failed. Please try again.' }
    })
    streamer.close()
  }
}

// Export auth-protected version
export const POST = withAuth(_POST)
