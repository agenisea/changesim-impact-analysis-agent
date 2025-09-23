// lib/runs-store.ts (server only)
import { getServerSupabase } from './supabase-server'

export const FRAMEWORK_VERSION = process.env.FRAMEWORK_VERSION ?? '1.0.0-alpha'
const ENABLE_RUN_LOGGING = process.env.ENABLE_RUN_LOGGING !== 'false'
const ENABLE_TRACE_LOGGING = process.env.ENABLE_TRACE_LOGGING !== 'false'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RunRow {
  role: string
  change_desc: string
  risk_level: RiskLevel
  risk_scoring: unknown
  principles_result?: unknown
  stakeholder_result?: unknown
  human_centered_result?: unknown
  decision_trace?: string[]
  plan_result?: unknown
  actions_result?: unknown
  model_meta?: {
    provider: string
    model: string
    version?: string
    temperature?: number
    prompt_version?: string
  }
  tokens_in?: number
  tokens_out?: number
  latency_ms?: number
  trace_id?: string
  user_id?: string
  session_id?: string
}

/**
 * Persist a run to Supabase. Returns the run_id or null if logging is disabled/failed.
 */
export async function persistRun(row: RunRow): Promise<string | null> {
  if (!ENABLE_RUN_LOGGING) {
    console.log('[runs] Logging disabled, skipping persist')
    return null
  }

  try {
    const supabase = getServerSupabase()
    const payload = {
      ...row,
      framework_version: FRAMEWORK_VERSION
    }

    const { data, error } = await supabase
      .from('changesim_runs')
      .insert(payload)
      .select('run_id')
      .single()

    if (error) {
      console.error('[runs] persistRun error:', error)
      return null
    }

    console.log('[runs] Persisted run:', data.run_id)
    return data.run_id as string
  } catch (error) {
    console.error('[runs] persistRun exception:', error)
    return null
  }
}

/**
 * Persist a trace event to Supabase for performance and debugging analytics.
 */
export async function persistTraceEvent(input: {
  trace_id: string
  event_type: string
  run_id?: string | null
  ctx?: any
  ms?: number
}): Promise<void> {
  if (!ENABLE_TRACE_LOGGING) {
    return
  }

  try {
    const supabase = getServerSupabase()
    const { error } = await supabase.from('changesim_traces').insert({
      trace_id: input.trace_id,
      event_type: input.event_type,
      run_id: input.run_id ?? null,
      ctx: input.ctx ?? null,
      ms: input.ms ?? null
    })

    if (error) {
      console.error('[traces] persistTraceEvent error:', error)
    }
  } catch (error) {
    console.error('[traces] persistTraceEvent exception:', error)
  }
}

/**
 * Get similar cases for learning from past runs (when enough data is available).
 */
export async function getSimilarCases(
  changeDesc: string,
  limit = 3
): Promise<Array<{ scenario: string; lessons: string[] }>> {
  if (!ENABLE_RUN_LOGGING) {
    return []
  }

  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('changesim_runs')
      .select('role, change_desc, principles_result, stakeholder_result')
      .textSearch('change_desc', changeDesc)
      .limit(limit)

    if (error) {
      console.error('[runs] getSimilarCases error:', error)
      return []
    }

    return (data ?? []).map(run => ({
      scenario: `${run.role}: ${run.change_desc}`,
      lessons: extractLessons(run.principles_result, run.stakeholder_result)
    }))
  } catch (error) {
    console.error('[runs] getSimilarCases exception:', error)
    return []
  }
}

/**
 * Helper to extract actionable lessons from past runs.
 */
function extractLessons(principles: any, stakeholders: any): string[] {
  const lessons: string[] = []

  if (principles?.violations?.length) {
    lessons.push(
      `Watch: ${principles.violations
        .map((v: any) => v.law)
        .slice(0, 3)
        .join(', ')}`
    )
  }

  if (stakeholders?.gaps?.length) {
    lessons.push(`Gaps: ${stakeholders.gaps.slice(0, 2).join('; ')}`)
  }

  return lessons
}

/**
 * Get analytics data for framework performance monitoring.
 */
export async function getFrameworkAnalytics(days = 30): Promise<Array<{
  framework_version: string
  total_runs: number
  avg_latency_ms: number | null
  runs_with_violations: number
  run_date: string
}>> {
  if (!ENABLE_RUN_LOGGING) {
    return []
  }

  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase.rpc('get_framework_analytics', {
      days_back: days
    })

    if (error) {
      console.error('[runs] getFrameworkAnalytics error:', error)
      return []
    }

    return data ?? []
  } catch (error) {
    console.error('[runs] getFrameworkAnalytics exception:', error)
    return []
  }
}

/**
 * Enhanced function for creating traced runs with complete context.
 */
export function createTracedRun(
  traceId: string,
  baseData: Omit<RunRow, 'trace_id'>
): RunRow {
  return {
    ...baseData,
    trace_id: traceId
  }
}