/**
 * Immediate cost tracking without database changes
 * Tracks token usage and costs in memory/logs for immediate visibility
 */

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

export interface CostMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUSD: number
  model: string
  operation: string
  timestamp: string
}

// In-memory cost tracking (survives until server restart)
class CostTracker {
  private static dailyCosts: Map<string, number> = new Map()
  private static dailyTokens: Map<string, number> = new Map()
  private static requestCount = 0

  static trackUsage(metrics: CostMetrics): void {
    const today = new Date().toISOString().split('T')[0]
    const currentCost = this.dailyCosts.get(today) || 0
    const currentTokens = this.dailyTokens.get(today) || 0

    this.dailyCosts.set(today, currentCost + metrics.estimatedCostUSD)
    this.dailyTokens.set(today, currentTokens + metrics.totalTokens)
    this.requestCount++

    // Log every request with cost
    console.log(`[COST] ${metrics.operation}: $${metrics.estimatedCostUSD.toFixed(6)} | ` +
               `${metrics.totalTokens} tokens | Daily: $${(currentCost + metrics.estimatedCostUSD).toFixed(4)}`)

    // Alert on high costs
    const newDailyCost = currentCost + metrics.estimatedCostUSD
    if (newDailyCost > 5.00 && currentCost <= 5.00) {
      console.error(`🚨 [COST ALERT] Daily spending exceeded $5.00: $${newDailyCost.toFixed(4)}`)
    }
    if (newDailyCost > 10.00 && currentCost <= 10.00) {
      console.error(`🚨🚨 [COST ALERT] Daily spending exceeded $10.00: $${newDailyCost.toFixed(4)}`)
    }
  }

  static getDailyCost(date?: string): number {
    const targetDate = date || new Date().toISOString().split('T')[0]
    return this.dailyCosts.get(targetDate) || 0
  }

  static getStats(): { dailyCost: number, dailyTokens: number, requestCount: number, avgCostPerRequest: number } {
    const today = new Date().toISOString().split('T')[0]
    const dailyCost = this.dailyCosts.get(today) || 0
    const dailyTokens = this.dailyTokens.get(today) || 0

    return {
      dailyCost,
      dailyTokens,
      requestCount: this.requestCount,
      avgCostPerRequest: this.requestCount > 0 ? dailyCost / this.requestCount : 0
    }
  }
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

export function trackAndLogUsage(
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
  model: string,
  operation: string
): number {
  const inputTokens = usage?.inputTokens || 0
  const outputTokens = usage?.outputTokens || 0
  const totalTokens = usage?.totalTokens || inputTokens + outputTokens

  const cost = calculateCost(inputTokens, outputTokens, model)

  const metrics: CostMetrics = {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUSD: cost,
    model,
    operation,
    timestamp: new Date().toISOString()
  }

  CostTracker.trackUsage(metrics)
  return cost
}

export function getCostStats() {
  return CostTracker.getStats()
}

export function checkDailyCostLimit(limit: number = 10.00): boolean {
  const currentCost = CostTracker.getDailyCost()
  return currentCost < limit
}