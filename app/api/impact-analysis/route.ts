import { type NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { type ImpactAnalysisResult } from '@/types/impact-analysis'
import { z } from 'zod'
import { IMPACT_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai/impact-analysis'
import { mapRiskLevel } from '@/lib/business/evaluator'
import { normalizeRiskScoring } from '@/lib/business/normalize'
import { appendSystemNoteWithBounds, boundDecisionTrace } from '@/lib/business/decision-trace'
import { impactModel } from '@/lib/ai/ai-client'
import { sb, type ChangeSimImpactAnalysisRunInsert } from '@/lib/db/db'
import { getSessionIdCookie } from '@/lib/server/session'
import { makeInputHash } from '@/lib/utils/hash'
import { PROMPT_VERSION, PROCESS_NAME, TEMPERATURE, MAX_OUTPUT_TOKENS, CACHE_STATUS, ANALYSIS_STATUS, type CacheStatus } from '@/lib/utils/constants'

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
  risk_rationale: z.string().optional(),
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
      status: z.enum([ANALYSIS_STATUS.COMPLETE, ANALYSIS_STATUS.PENDING, ANALYSIS_STATUS.ERROR]).optional(),
      run_id: z.string().optional(),
      role: z.string().optional(),
      changeDescription: z.string().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[impact] API route called')

    const body = await request.json()
    if (SHOW_DEBUG_LOGS) {
      console.log('[impact] Request data:', body)
    }

    // Validate input
    const validation = impactAnalysisInputSchema.safeParse(body)
    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact] Validation failed:', errorMessage)
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
        console.log('[impact] Checking cache for existing session')
      }

      const { data: cached, error: cacheError } = await sb
        .from('changesim_impact_analysis_runs')
        .select('*')
        .eq('session_id', sessionId)
        .eq('input_hash', inputHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cacheError) {
        console.error('[impact] Cache lookup error:', cacheError)
        // Continue to fresh analysis
      } else if (cached) {
        if (SHOW_DEBUG_LOGS) {
          console.log('[impact] Cache hit! Returning cached result')
        }

        // Transform cached data to match expected ImpactResult format - NO SENSITIVE DATA
        const cachedResult: ImpactAnalysisResult = {
          analysis_summary: cached.analysis_summary,
          risk_level: cached.risk_level as 'low' | 'medium' | 'high' | 'critical',
          risk_factors: cached.risk_factors || [],
          risk_scoring: cached.risk_scoring as any,
          decision_trace: cached.decision_trace || [],
          sources: cached.sources || [],
          meta: {
            timestamp: cached.created_at,
            status: ANALYSIS_STATUS.COMPLETE,
            run_id: cached.run_id,
            role: cached.role,
            changeDescription: cached.change_description,
            _cache: CACHE_STATUS.HIT
          }
        }

        const response = NextResponse.json(cachedResult)
        response.headers.set('X-ChangeSim-Cache', CACHE_STATUS.HIT)
        response.headers.set('X-ChangeSim-Prompt-Version', PROMPT_VERSION)
        response.headers.set('X-ChangeSim-Model', actualModel)
        return response
      } else {
        if (SHOW_DEBUG_LOGS) {
          console.log('[impact] Cache miss - proceeding with fresh analysis')
        }
      }
    } else if (forceFresh) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact] Fresh analysis forced - skipping cache')
      }
    } else if (isNewSession) {
      if (SHOW_DEBUG_LOGS) {
        console.log('[impact] New session detected - skipping cache check')
      }
    }

    let runId = `ia_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Generate impact analysis using AI SDK with structured outputs
    const { object: parsedResult, usage } = await generateObject({
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

    if (SHOW_DEBUG_LOGS) {
      console.log('[impact] AI response received')
      console.log('[impact] Token usage:', usage)
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
      const runData: ChangeSimImpactAnalysisRunInsert = {
        process: actualProcess,
        role,
        change_description: changeDescription,
        context: context || null,
        analysis_summary: parsedResult.analysis_summary,
        risk_level: parsedResult.risk_level,
        risk_factors: parsedResult.risk_factors,
        risk_scoring: parsedResult.risk_scoring,
        decision_trace: parsedResult.decision_trace,
        sources: parsedResult.sources,
        meta: {
          model: actualModel,
          temperature: actualTemperature,
          input_tokens: usage?.inputTokens || null,
          output_tokens: usage?.outputTokens || null,
          prompt_version: PROMPT_VERSION,
          timestamp: new Date().toISOString(),
          status: ANALYSIS_STATUS.COMPLETE,
          _cache: cacheStatus
        },
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
            console.log('[impact] Race condition detected, fetching existing result')
          }
          const { data: raced } = await sb
            .from('changesim_impact_analysis_runs')
            .select('*')
            .eq('session_id', sessionId)
            .eq('input_hash', inputHash)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (raced) {
            const racedResult: ImpactAnalysisResult = {
              analysis_summary: raced.analysis_summary,
              risk_level: raced.risk_level as 'low' | 'medium' | 'high' | 'critical',
              risk_factors: raced.risk_factors || [],
              risk_scoring: raced.risk_scoring as any,
              decision_trace: raced.decision_trace || [],
              sources: raced.sources || [],
              meta: {
                timestamp: raced.created_at,
                status: ANALYSIS_STATUS.COMPLETE,
                run_id: raced.run_id,
                role: raced.role,
                changeDescription: raced.change_description,
                _cache: CACHE_STATUS.RACE
              }
            }
            const response = NextResponse.json(racedResult)
            response.headers.set('X-ChangeSim-Cache', CACHE_STATUS.RACE)
            response.headers.set('X-ChangeSim-Prompt-Version', PROMPT_VERSION)
            response.headers.set('X-ChangeSim-Model', actualModel)
            return response
          }
        }
        console.error('[impact] Database insert failed:', error)
        // Continue execution - don't fail the request for logging issues
      } else {
        if (SHOW_DEBUG_LOGS) {
          console.log('[impact] Run logged to database:', insertedRun?.run_id)
        }
        // Update runId with the actual database UUID
        if (insertedRun?.run_id) {
          runId = insertedRun.run_id
        }
      }
    } catch (dbError) {
      console.error('[impact] Database logging error:', dbError)
      // Continue execution - don't fail the request for logging issues
    }

    // Add meta information with cache status
    const metaWithCache = {
      ...parsedResult.meta,
      timestamp: new Date().toISOString(),
      status: ANALYSIS_STATUS.COMPLETE,
      run_id: runId,
      role: role,
      changeDescription: changeDescription,
      _cache: cacheStatus
    }
    parsedResult.meta = metaWithCache

    // Result is already validated by generateObject
    const result: ImpactAnalysisResult = parsedResult

    if (SHOW_DEBUG_LOGS) {
      console.log('[impact] Impact analysis completed successfully')
    }

    const response = NextResponse.json(result)
    response.headers.set('X-ChangeSim-Cache', cacheStatus)
    response.headers.set('X-ChangeSim-Prompt-Version', PROMPT_VERSION)
    response.headers.set('X-ChangeSim-Model', actualModel)
    return response
  } catch (error) {
    console.error('[impact] Impact analysis error:', error)
    console.error('[impact] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    })

    const errorMessage = (error as Error).message

    // Handle schema validation errors from AI response
    if (errorMessage.includes('schema') || errorMessage.includes('validation') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { error: 'AI response format validation failed. Please try again.' },
        { status: 502 }
      )
    } else if (errorMessage.includes('429')) {
      return NextResponse.json(
        {
          error: 'AI service rate limit exceeded. Please try again in a few moments.',
        },
        { status: 429 }
      )
    } else if (errorMessage.includes('API')) {
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
