import OpenAI from 'openai'
import { EMBEDDING_MODEL, EMBEDDING_CONFIG } from '@/lib/utils/constants'

let openai: OpenAI | null = null

function getOpenAiClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings')
    }
    openai = new OpenAI({ apiKey })
  }
  return openai
}

async function retryWithJitter<T>(fn: () => Promise<T>, maxRetries = EMBEDDING_CONFIG.MAX_RETRIES, baseDelay = EMBEDDING_CONFIG.RETRY_DELAY_MS): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt)
      const jitter = Math.random() * 0.3 * delay // 30% jitter
      const totalDelay = delay + jitter

      console.log(`[embeddings] Attempt ${attempt + 1} failed, retrying in ${Math.round(totalDelay)}ms...`)
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  // This should never be reached due to the throw in the loop, but satisfies TypeScript
  throw new Error('Retry function reached unexpected state')
}

export async function embedImpactQuery(text: string): Promise<number[]> {
  const value = text.trim()
  if (!value) {
    return []
  }

  const client = getOpenAiClient()

  const response = await retryWithJitter(async () => {
    return await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: value,
    })
  })

  const embedding = response.data?.[0]?.embedding

  if (!embedding) {
    throw new Error('Embedding generation returned no values')
  }

  return embedding
}
