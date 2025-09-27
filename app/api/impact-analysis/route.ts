import { type NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/server/auth'
import { generateObject } from 'ai'
import { type ImpactAnalysisResult } from '@/types/impact-analysis'
import { z } from 'zod'
import { IMPACT_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai/impact-analysis'
import { invokeAgenticRag } from '@/lib/ai/agentic-rag'
import { mapRiskLevel } from '@/lib/business/evaluator'
import { normalizeRiskScoring } from '@/lib/business/normalize'
import { appendSystemNoteWithBounds, boundDecisionTrace } from '@/lib/business/decision-trace'
import { impactModel } from '@/lib/ai/ai-client'
import { sb, type ChangeSimImpactAnalysisRunInsert } from '@/lib/db/client'
import { getSessionIdCookie } from '@/lib/server/session'
import { makeInputHash } from '@/lib/utils/hash'
import {
  PROMPT_VERSION,
  PROCESS_NAME,
  TEMPERATURE,
  MAX_OUTPUT_TOKENS,
  CACHE_STATUS,
  ANALYSIS_STATUS,
  AGENT_TYPE,
  type CacheStatus,
  type AgentType,
} from '@/lib/utils/constants'

const SHOW_DEBUG_LOGS = process.env.SHOW_DEBUG_LOGS === 'true'

const impactAnalysisInputSchema = z.object({
  changeDescription: z.string().trim().min(1, 'Change description is required'),
  role: z.string().trim().min(1, 'Role is required'),
  context: z.any().optional(),
  forceFresh: z.boolean().optional(),
})

const impactAnalysisResultSchema = z.object({
  analysis_summary: z.string(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  risk_rationale: z.string().min(1, 'Risk rationale is required'),
  risk_factors: z.array(z.string()).min(1).max(4),
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
      status: z
        .enum([ANALYSIS_STATUS.COMPLETE, ANALYSIS_STATUS.PENDING, ANALYSIS_STATUS.ERROR])
        .optional(),
      run_id: z.string().optional(),
      role: z.string().optional(),
      change_description: z.string().optional(),
      context: z.unknown().nullable().optional(),
      agent_type: z.enum([AGENT_TYPE.AGENTIC_RAG, AGENT_TYPE.SINGLE_AGENT]).optional(),
      rag: z
        .object({
          match_count: z.number(),
          average_similarity: z.number(),
        })
        .optional(),
    })
    .optional(),
})

async function _POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[impact-analysis] API route called')

    const body = await request.json()
    if (SHOW_DEBUG_LOGS) {
      console.log('[impact-analysis] Request data:', body)
    }

    // Validate input
    const validation = impactAnalysisInputSchema.safeParse(body)
    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact-analysis] Validation failed:', errorMessage)
      }
      return NextResponse.json({ error: errorMessage }, { status: 422 })
    }

    const { changeDescription, role, context, forceFresh } = validation.data

    // Get session ID for tracking runs
    const { sessionId, isNewSession } = await getSessionIdCookie()

    // Extract actual runtime values for single source of truth
    const actualModel = impactModel.modelId // Extract real model from impactModel
    const actualTemperature = TEMPERATURE // Single source of truth from constants
    const actualProcess = PROCESS_NAME

    // Create input hash for caching using actual runtime values
    const inputHash = makeInputHash({
      role,
      changeDescription,
      context: context || null,
      model: actualModel,
      promptVersion: PROMPT_VERSION,
    })

    // 1) Cache lookup: SAME session + SAME inputs + SAME model/prompt
    // Skip cache check for new sessions since no runs could exist yet
    if (!forceFresh && !isNewSession) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact-analysis] Checking cache for existing session')
      }

      try {
        const { data: cached, error: cacheError } = await sb
          .from('changesim_impact_analysis_runs')
          .select('*')
          .eq('session_id', sessionId)
          .eq('input_hash', inputHash)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cacheError) {
          console.error('[impact-analysis] Cache lookup error:', cacheError)
          // Continue to fresh analysis
        } else if (cached) {
          if (SHOW_DEBUG_LOGS) {
            console.log('[impact-analysis] Cache hit! Returning cached result')
          }

          // Transform cached data to match expected ImpactResult format - NO SENSITIVE DATA
          const cachedMeta: ImpactAnalysisResult['meta'] = {
            timestamp: cached.created_at,
            status: ANALYSIS_STATUS.COMPLETE,
            run_id: cached.run_id,
            role: cached.role,
            change_description: cached.change_description,
            context: cached.context || null, // Always include context field
            _cache: CACHE_STATUS.HIT,
            agent_type: cached.meta?.agent_type || AGENT_TYPE.SINGLE_AGENT,
          }

          // Only include RAG diagnostics if it was an agentic-rag strategy
          if (cached.meta?.agent_type === AGENT_TYPE.AGENTIC_RAG && cached.meta?.rag) {
            cachedMeta.rag = {
              match_count: cached.meta.rag.match_count,
              average_similarity: cached.meta.rag.average_similarity,
            }
          }

          const cachedResult: ImpactAnalysisResult = {
            analysis_summary: cached.analysis_summary,
            risk_level: cached.risk_level as 'low' | 'medium' | 'high' | 'critical',
            risk_rationale: cached.risk_rationale || 'Cached analysis result',
            risk_factors: cached.risk_factors || [],
            risk_scoring: cached.risk_scoring as any,
            decision_trace: cached.decision_trace || [],
            sources: cached.sources || [],
            meta: cachedMeta,
          }

          const response = NextResponse.json(cachedResult)
          response.headers.set('X-ChangeSim-Cache', CACHE_STATUS.HIT)
          response.headers.set('X-ChangeSim-Prompt-Version', PROMPT_VERSION)
          response.headers.set('X-ChangeSim-Model', actualModel)
          const cachedType = cachedResult.meta?.agent_type
          if (typeof cachedType === 'string') {
            response.headers.set('X-ChangeSim-Agent-Type', cachedType)
          }
          return response
        } else {
          if (SHOW_DEBUG_LOGS) {
            console.log('[impact-analysis] Cache miss - proceeding with fresh analysis')
          }
        }
      } catch (cacheError) {
        console.error('[impact-analysis] Cache lookup failed:', cacheError)
        // Continue to fresh analysis
      }
    } else if (forceFresh) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact-analysis] Fresh analysis forced - skipping cache')
      }
    } else if (isNewSession) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact-analysis] New session detected - skipping cache check')
      }
    }

    let runId = `ia_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    let parsedResult: ImpactAnalysisResult
    let usage: { inputTokens?: number | null; outputTokens?: number | null } | undefined
    let agentType: AgentType = AGENT_TYPE.SINGLE_AGENT
    let ragDiagnostics: { matchCount: number; averageSimilarity: number } | undefined

    const ragAttempt = await invokeAgenticRag({
      role,
      changeDescription,
      context,
      schema: impactAnalysisResultSchema,
    })

    if ('object' in ragAttempt) {
      // Agentic RAG SUCCESS: Dynamic prompting + historical context used
      parsedResult = ragAttempt.object as ImpactAnalysisResult
      usage = ragAttempt.usage
      agentType = AGENT_TYPE.AGENTIC_RAG
      ragDiagnostics = {
        matchCount: ragAttempt.diagnostics.matchCount,
        averageSimilarity: ragAttempt.diagnostics.averageSimilarity,
      }
      console.log(
        '[impact-analysis] ✅ AGENTIC RAG SUCCESS - Enhanced analysis with dynamic prompting',
        {
          agentType: AGENT_TYPE.AGENTIC_RAG,
          ragMatches: ragDiagnostics.matchCount,
          averageSimilarity: ragDiagnostics.averageSimilarity.toFixed(3),
          focusAreas: ragAttempt.diagnostics.focusAreas,
          dynamicPromptUsed: ragAttempt.diagnostics.dynamicPromptUsed,
        }
      )
    } else {
      // FALLBACK TO ORIGINAL SINGLE-AGENT METHOD
      let fallbackReason = 'unknown'
      if ('error' in ragAttempt) {
        fallbackReason = 'agentic-rag-error'
        console.error('[impact-analysis] ❌ AGENTIC RAG ERROR - Falling back to single-agent', {
          error: ragAttempt.error.message,
          fallbackStrategy: 'single-agent',
        })
      }
      if ('skipped' in ragAttempt) {
        fallbackReason = ragAttempt.reason
        console.log('[impact-analysis] ⚠️  AGENTIC RAG SKIPPED - Falling back to single-agent', {
          reason: ragAttempt.reason,
          fallbackStrategy: 'single-agent',
          explanation:
            ragAttempt.reason === 'insufficient-context'
              ? 'Not enough historical data for meaningful RAG enhancement'
              : 'Other reason for skipping agentic RAG',
        })
      }

      console.log('[impact-analysis] 🔄 FALLBACK: Using original single-agent method', {
        agentType: AGENT_TYPE.SINGLE_AGENT,
        systemPrompt: 'IMPACT_ANALYSIS_SYSTEM_PROMPT (original)',
        dynamicPrompting: false,
        ragEnhancement: false,
        roleSpecificContext: false,
      })

      const fallback = await generateObject({
        model: impactModel,
        system: IMPACT_ANALYSIS_SYSTEM_PROMPT,
        prompt: `Analyze the impact of this organizational change:

Change Description: ${changeDescription}
${context ? `Additional Context: ${JSON.stringify(context)}` : ''}

Return only valid JSON matching the ImpactAnalysisResult schema.`,
        schema: impactAnalysisResultSchema,
        temperature: actualTemperature,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      })

      parsedResult = fallback.object as ImpactAnalysisResult
      usage = fallback.usage
      agentType = AGENT_TYPE.SINGLE_AGENT

      console.log('[impact-analysis] ✅ FALLBACK COMPLETED - Single-agent analysis successful', {
        agentType: AGENT_TYPE.SINGLE_AGENT,
        fallbackReason,
        tokenUsage: usage,
      })
    }

    if (SHOW_DEBUG_LOGS) {
      console.log('[impact-analysis] AI response received')
      console.log('[impact-analysis] Token usage:', usage)
    }

    // Apply deterministic risk mapping with proper enum normalization
    const normalizedRiskScoring = normalizeRiskScoring(parsedResult.risk_scoring)
    const riskResult = mapRiskLevel(
      normalizedRiskScoring.scope,
      normalizedRiskScoring.severity,
      normalizedRiskScoring.human_impact,
      normalizedRiskScoring.time_sensitivity
    )
    parsedResult.risk_level = riskResult.level

    // Add org-cap decision trace note when triggered (with bounds checking)
    if (riskResult.orgCapTriggered && parsedResult.decision_trace) {
      const guardrailNote = 'Risk level adjusted downward due to organizational scope guardrail'
      parsedResult.decision_trace = appendSystemNoteWithBounds(
        parsedResult.decision_trace,
        guardrailNote
      )
    }

    // Note: ruleApplied tracking is available for future transparency needs
    // Currently only org-cap requires explanation; other rules work silently

    // Ensure decision trace is always within bounds (defense in depth)
    if (parsedResult.decision_trace) {
      parsedResult.decision_trace = boundDecisionTrace(parsedResult.decision_trace)
    }

    if (parsedResult.risk_level) {
      parsedResult.risk_level = parsedResult.risk_level.toLowerCase() as
        | 'low'
        | 'medium'
        | 'high'
        | 'critical'
    }

    // Determine cache status based on why we did fresh analysis
    let cacheStatus: CacheStatus = CACHE_STATUS.MISS // default
    if (isNewSession) {
      cacheStatus = CACHE_STATUS.NEW_SESSION // new session, cache skipped
    } else if (forceFresh) {
      cacheStatus = CACHE_STATUS.MISS // forced fresh
    }
    // else: normal cache miss (existing session, different inputs)

    // Log run to database for analytics and session tracking
    try {
      const runMeta: Record<string, unknown> = {
        model: actualModel,
        temperature: actualTemperature,
        input_tokens: usage?.inputTokens || null,
        output_tokens: usage?.outputTokens || null,
        prompt_version: PROMPT_VERSION,
        timestamp: new Date().toISOString(),
        status: ANALYSIS_STATUS.COMPLETE,
        _cache: cacheStatus,
        agent_type: agentType,
      }

      if (ragDiagnostics && agentType === AGENT_TYPE.AGENTIC_RAG) {
        runMeta.rag = {
          match_count: ragDiagnostics.matchCount,
          average_similarity: ragDiagnostics.averageSimilarity,
        }
      }

      const runData: ChangeSimImpactAnalysisRunInsert = {
        process: actualProcess,
        role,
        change_description: changeDescription,
        context: context || null,
        analysis_summary: parsedResult.analysis_summary,
        risk_level: parsedResult.risk_level,
        risk_rationale: parsedResult.risk_rationale,
        risk_factors: parsedResult.risk_factors,
        risk_scoring: parsedResult.risk_scoring,
        decision_trace: parsedResult.decision_trace,
        sources: parsedResult.sources,
        meta: runMeta,
        session_id: sessionId,
        input_hash: inputHash,
      }

      const { data: insertedRun, error } = await sb
        .from('changesim_impact_analysis_runs')
        .insert(runData)
        .select('run_id')
        .single()

      if (error) {
        if (error.code === '23505') {
          // Unique violation → race condition; re-select the cached row
          if (SHOW_DEBUG_LOGS) {
            console.log('[impact-analysis] Race condition detected, fetching existing result')
          }
          const { data: raced, error: raceError } = await sb
            .from('changesim_impact_analysis_runs')
            .select('*')
            .eq('session_id', sessionId)
            .eq('input_hash', inputHash)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (raceError) {
            console.error('[impact-analysis] Race condition recovery failed:', raceError)
            // Continue with fresh result - don't fail the request
          } else if (raced) {
            const racedMeta: ImpactAnalysisResult['meta'] = {
              timestamp: raced.created_at,
              status: ANALYSIS_STATUS.COMPLETE,
              run_id: raced.run_id,
              role: raced.role,
              change_description: raced.change_description,
              context: raced.context || null, // Always include context field
              _cache: CACHE_STATUS.RACE,
              agent_type: raced.meta?.agent_type || AGENT_TYPE.SINGLE_AGENT,
            }

            // Only include RAG diagnostics if it was an agentic-rag strategy
            if (raced.meta?.agent_type === AGENT_TYPE.AGENTIC_RAG && raced.meta?.rag) {
              racedMeta.rag = {
                match_count: raced.meta.rag.match_count,
                average_similarity: raced.meta.rag.average_similarity,
              }
            }

            const racedResult: ImpactAnalysisResult = {
              analysis_summary: raced.analysis_summary,
              risk_level: raced.risk_level as 'low' | 'medium' | 'high' | 'critical',
              risk_rationale: raced.risk_rationale || 'Race condition recovered result',
              risk_factors: raced.risk_factors || [],
              risk_scoring: raced.risk_scoring as any,
              decision_trace: raced.decision_trace || [],
              sources: raced.sources || [],
              meta: racedMeta,
            }
            const response = NextResponse.json(racedResult)
            response.headers.set('X-ChangeSim-Cache', CACHE_STATUS.RACE)
            response.headers.set('X-ChangeSim-Prompt-Version', PROMPT_VERSION)
            response.headers.set('X-ChangeSim-Model', actualModel)
            return response
          }
        }
        console.error('[impact-analysis] Database insert failed:', error)
        // Continue execution - don't fail the request for logging issues
      } else {
        if (SHOW_DEBUG_LOGS) {
          console.log('[impact-analysis] Run logged to database:', insertedRun?.run_id)
        }
        // Update runId with the actual database UUID
        if (insertedRun?.run_id) {
          runId = insertedRun.run_id
        }

        // Create embeddings for the analysis (async, don't block response)
        if (insertedRun?.run_id) {
          import('@/lib/db/embeddings')
            .then(({ chunkAndEmbedAnalysis }) => {
              return chunkAndEmbedAnalysis(
                parsedResult,
                insertedRun.run_id,
                role,
                changeDescription,
                context
              )
            })
            .catch(embeddingError => {
              console.error('[impact-analysis] Embedding process failed:', embeddingError)
              // Don't fail the main request for embedding issues
            })
        }
      }
    } catch (dbError) {
      console.error('[impact-analysis] Database logging error:', dbError)
      // Continue execution - don't fail the request for logging issues
    }

    // Add meta information with cache status
    const metaWithCache: ImpactAnalysisResult['meta'] = {
      ...(parsedResult.meta ?? {}),
      timestamp: new Date().toISOString(),
      status: ANALYSIS_STATUS.COMPLETE,
      run_id: runId,
      role: role,
      change_description: changeDescription,
      context: context || null, // Always include context field
      _cache: cacheStatus,
      agent_type: agentType,
    }

    // Only include RAG diagnostics when agentic RAG strategy was actually used
    if (ragDiagnostics && agentType === AGENT_TYPE.AGENTIC_RAG) {
      metaWithCache.rag = {
        match_count: ragDiagnostics.matchCount,
        average_similarity: ragDiagnostics.averageSimilarity,
      }
    }

    parsedResult.meta = metaWithCache

    // Result is already validated by generateObject
    const result: ImpactAnalysisResult = parsedResult

    if (SHOW_DEBUG_LOGS) {
      console.log('[impact-analysis] Impact analysis completed successfully')
    }

    const response = NextResponse.json(result)
    response.headers.set('X-ChangeSim-Cache', cacheStatus)
    response.headers.set('X-ChangeSim-Prompt-Version', PROMPT_VERSION)
    response.headers.set('X-ChangeSim-Model', actualModel)
    response.headers.set('X-ChangeSim-Agent-Type', agentType)
    return response
  } catch (error) {
    console.error('[impact-analysis] Impact analysis error:', error)
    console.error('[impact-analysis] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    })

    const errorMessage = (error as Error).message.toLowerCase()

    // Handle specific AI service errors first (most specific)
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        {
          error: 'AI service rate limit exceeded. Please try again in a few moments.',
        },
        { status: 429 }
      )
    } else if (
      errorMessage.includes('schema') ||
      errorMessage.includes('validation') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('response format')
    ) {
      return NextResponse.json(
        { error: 'AI response format validation failed. Please try again.' },
        { status: 502 }
      )
    } else if (
      errorMessage.includes('api service') ||
      errorMessage.includes('temporarily unavailable') ||
      errorMessage.includes('service unavailable')
    ) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 502 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to analyze impact. Please try again.' },
        { status: 500 }
      )
    }
  }
}

// Export auth-protected version
export const POST = withAuth(_POST)
