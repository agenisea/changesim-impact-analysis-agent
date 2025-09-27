import { sb } from '@/lib/db/client'
import { RAG_CONFIG } from '@/lib/utils/constants'

export interface ImpactChunkMatch {
  chunk_id: string
  run_id: string
  org_role: string | null
  composite: string | null
  content: string
  similarity: number
}

export interface MatchImpactChunksParams {
  embedding: number[]
  role?: string
  matchCount?: number
  matchThreshold?: number
}

export async function matchImpactChunks({
  embedding,
  role,
  matchCount = RAG_CONFIG.MATCH_COUNT,
  matchThreshold = RAG_CONFIG.MATCH_THRESHOLD,
}: MatchImpactChunksParams): Promise<ImpactChunkMatch[]> {
  if (!embedding.length) {
    return []
  }

  const { data, error } = await sb.rpc('match_impact_chunks', {
    query_embedding: embedding,
    role_filter: role ?? null,
    match_count: matchCount,
    match_threshold: matchThreshold,
  })

  if (error) {
    console.error('[rag] match_impact_chunks RPC failed:', error.message)
    throw new Error('Failed to retrieve semantic context for RAG flow')
  }

  return (data ?? []).filter((item: any): item is ImpactChunkMatch => Boolean(item?.content))
}
