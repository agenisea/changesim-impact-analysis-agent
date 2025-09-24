import { retryFetch } from '@/lib/api/utils'
import { ImpactAnalysisInput, ImpactAnalysisResult } from '@/types/impact-analysis'

const RETRY_OPTIONS = { maxAttempts: 3, baseDelayMs: 300 }

export async function submitImpactAnalysis(input: ImpactAnalysisInput): Promise<ImpactAnalysisResult> {
  const response = await retryFetch(
    '/api/impact-analysis',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: input.role.trim(),
        changeDescription: input.changeDescription.trim(),
      }),
    },
    RETRY_OPTIONS
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to analyze impact')
  }

  const result = await response.json()
  return result
}
