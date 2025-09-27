import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  sb: {
    rpc: vi.fn(),
  },
}))

import { matchImpactChunks } from '@/lib/db/retrieval'
import { RAG_CONFIG } from '@/lib/utils/constants'
import { sb } from '@/lib/db/client'

describe('matchImpactChunks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty when embedding is empty without hitting Supabase', async () => {
    const result = await matchImpactChunks({ embedding: [] })
    expect(result).toEqual([])
    expect(sb.rpc).not.toHaveBeenCalled()
  })

  it('passes defaults and filters items without content', async () => {
    vi.mocked(sb.rpc).mockResolvedValueOnce({
      data: [
        { chunk_id: 'a', run_id: '1', org_role: 'role', composite: 'context', content: 'foo', similarity: 0.83 },
        { chunk_id: 'b', run_id: '2', org_role: 'role', composite: 'context', content: '', similarity: 0.6 },
      ],
      error: null,
    } as any)

    const embedding = [0.1, 0.2, 0.3]
    const result = await matchImpactChunks({ embedding, role: 'Team Culture' })

    expect(sb.rpc).toHaveBeenCalledWith('match_impact_chunks', {
      query_embedding: embedding,
      role_filter: 'Team Culture',
      match_count: RAG_CONFIG.MATCH_COUNT,
      match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
    })
    expect(result).toEqual([
      {
        chunk_id: 'a',
        run_id: '1',
        org_role: 'role',
        composite: 'context',
        content: 'foo',
        similarity: 0.83,
      },
    ])
  })

  it('throws when RPC fails', async () => {
    vi.mocked(sb.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    } as any)

    await expect(
      matchImpactChunks({ embedding: [0.1], matchCount: 2, matchThreshold: 0.5 })
    ).rejects.toThrow('Failed to retrieve semantic context for RAG flow')
  })
})
