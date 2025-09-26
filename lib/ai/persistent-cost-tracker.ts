/**
 * Database-backed cost tracking using existing tables
 * No schema changes required - uses existing token columns
 */

import { sb } from '@/lib/db/client'

// GPT-4o-mini pricing (per 1K tokens)
export const MODEL_PRICING = {
  'gpt-4o-mini': {
    input: 0.00015,  // $0.15 per 1M tokens
    output: 0.0006,  // $0.60 per 1M tokens
  },
  'text-embedding-ada-002': {
    input: 0.0001,   // $0.10 per 1M tokens
    output: 0,
  }
} as const

export interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUSD: number
  model: string
  operation: string
}

export function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (!pricing) {
    console.warn(`[COST] Unknown model pricing: ${model}`)
    return 0
  }

  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output
  return inputCost + outputCost
}

/**
 * Track token usage by updating existing database record
 */
export async function trackTokenUsage(
  runId: string,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
  model: string,
  operation: string
): Promise<number> {
  const inputTokens = usage?.inputTokens || 0
  const outputTokens = usage?.outputTokens || 0
  const totalTokens = usage?.totalTokens || inputTokens + outputTokens

  const cost = calculateCost(inputTokens, outputTokens, model)

  try {
    // Update the existing run record with token usage
    const { error } = await sb
      .from('changesim_impact_analysis_runs')
      .update({
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        model: model, // Store actual model used
        temperature: 0.2 // Store actual temperature used
      })
      .eq('run_id', runId)

    if (error) {
      console.error('[COST] Failed to update token usage:', error)
    } else {
      console.log(`[COST] ${operation}: $${cost.toFixed(6)} | ${totalTokens} tokens | Run: ${runId}`)
    }

    return cost
  } catch (error) {
    console.error('[COST] Token tracking error:', error)
    return cost
  }
}

/**
 * Check session spending limits using database
 */
export async function checkSessionCostLimit(
  sessionId: string,
  limitUSD: number = 5.00
): Promise<{ allowed: boolean; currentSpend: number; reason?: string }> {
  try {
    // Get today's spending for this session
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { data: runs } = await sb
      .from('changesim_impact_analysis_runs')
      .select('input_tokens, output_tokens, model')
      .eq('session_id', sessionId)
      .gte('created_at', startOfDay.toISOString())
      .not('input_tokens', 'is', null)

    if (!runs) {
      return { allowed: true, currentSpend: 0 }
    }

    // Calculate total session cost
    const totalCost = runs.reduce((sum, run) => {
      const cost = calculateCost(
        run.input_tokens || 0,
        run.output_tokens || 0,
        run.model || 'gpt-4o-mini'
      )
      return sum + cost
    }, 0)

    const allowed = totalCost < limitUSD

    if (!allowed) {
      console.warn(`[COST] Session ${sessionId} exceeded limit: $${totalCost.toFixed(4)} >= $${limitUSD}`)
    }

    return {
      allowed,
      currentSpend: totalCost,
      reason: allowed ? undefined : `Session daily limit of $${limitUSD} exceeded`
    }
  } catch (error) {
    console.error('[COST] Session cost check failed:', error)
    // Fail open for availability
    return { allowed: true, currentSpend: 0 }
  }
}

/**
 * Check daily spending limits across all sessions
 */
export async function checkDailyCostLimit(limitUSD: number = 20.00): Promise<{
  allowed: boolean
  currentSpend: number
  reason?: string
}> {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { data: runs } = await sb
      .from('changesim_impact_analysis_runs')
      .select('input_tokens, output_tokens, model')
      .gte('created_at', startOfDay.toISOString())
      .not('input_tokens', 'is', null)

    if (!runs) {
      return { allowed: true, currentSpend: 0 }
    }

    const totalCost = runs.reduce((sum, run) => {
      const cost = calculateCost(
        run.input_tokens || 0,
        run.output_tokens || 0,
        run.model || 'gpt-4o-mini'
      )
      return sum + cost
    }, 0)

    const allowed = totalCost < limitUSD

    if (!allowed) {
      console.error(`🚨 [COST ALERT] Daily limit exceeded: $${totalCost.toFixed(4)} >= $${limitUSD}`)
    } else if (totalCost > limitUSD * 0.8) {
      console.warn(`⚠️ [COST WARNING] Approaching daily limit: $${totalCost.toFixed(4)} / $${limitUSD}`)
    }

    return {
      allowed,
      currentSpend: totalCost,
      reason: allowed ? undefined : `Daily limit of $${limitUSD} exceeded`
    }
  } catch (error) {
    console.error('[COST] Daily cost check failed:', error)
    return { allowed: true, currentSpend: 0 }
  }
}

/**
 * Get cost analytics for monitoring
 */
export async function getCostAnalytics(days: number = 7): Promise<{
  dailySpend: number
  weeklySpend: number
  avgCostPerRequest: number
  totalRequests: number
  topCostlyOperations: Array<{ operation: string; cost: number; count: number }>
}> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const { data: runs } = await sb
      .from('changesim_impact_analysis_runs')
      .select('input_tokens, output_tokens, model, created_at')
      .gte('created_at', startDate.toISOString())
      .not('input_tokens', 'is', null)

    if (!runs?.length) {
      return {
        dailySpend: 0,
        weeklySpend: 0,
        avgCostPerRequest: 0,
        totalRequests: 0,
        topCostlyOperations: []
      }
    }

    const totalCost = runs.reduce((sum, run) => {
      return sum + calculateCost(
        run.input_tokens || 0,
        run.output_tokens || 0,
        run.model || 'gpt-4o-mini'
      )
    }, 0)

    // Calculate daily spend (last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const dailyRuns = runs.filter(run => new Date(run.created_at) >= oneDayAgo)
    const dailySpend = dailyRuns.reduce((sum, run) => {
      return sum + calculateCost(
        run.input_tokens || 0,
        run.output_tokens || 0,
        run.model || 'gpt-4o-mini'
      )
    }, 0)

    return {
      dailySpend,
      weeklySpend: totalCost,
      avgCostPerRequest: runs.length > 0 ? totalCost / runs.length : 0,
      totalRequests: runs.length,
      topCostlyOperations: [
        { operation: 'impact_analysis', cost: totalCost, count: runs.length }
      ]
    }
  } catch (error) {
    console.error('[COST] Analytics failed:', error)
    return {
      dailySpend: 0,
      weeklySpend: 0,
      avgCostPerRequest: 0,
      totalRequests: 0,
      topCostlyOperations: []
    }
  }
}