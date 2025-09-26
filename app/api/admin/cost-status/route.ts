import { NextResponse } from 'next/server'
import { getCostAnalytics, checkDailyCostLimit } from '@/lib/ai/persistent-cost-tracker'

export async function GET() {
  try {
    // Get current cost status
    const [analytics, dailyStatus] = await Promise.all([
      getCostAnalytics(7), // Last 7 days
      checkDailyCostLimit(20.00) // $20 daily limit
    ])

    const costStatus = {
      status: dailyStatus.allowed ? 'healthy' : 'over_limit',
      daily: {
        spent: dailyStatus.currentSpend,
        limit: 20.00,
        remaining: Math.max(0, 20.00 - dailyStatus.currentSpend),
        percentage: (dailyStatus.currentSpend / 20.00) * 100
      },
      analytics: {
        dailySpend: analytics.dailySpend,
        weeklySpend: analytics.weeklySpend,
        avgCostPerRequest: analytics.avgCostPerRequest,
        totalRequests: analytics.totalRequests
      },
      alerts: {
        nearLimit: dailyStatus.currentSpend > 16.00, // 80% of $20
        overLimit: !dailyStatus.allowed,
        message: dailyStatus.reason
      }
    }

    return NextResponse.json(costStatus)
  } catch (error) {
    console.error('[cost-status] Failed to get cost status:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve cost status' },
      { status: 500 }
    )
  }
}