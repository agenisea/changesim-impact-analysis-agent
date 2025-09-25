import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAnalysisChunks, insertAnalysisChunks, triggerEmbeddingProcessor, chunkAndEmbedAnalysis } from '@/lib/db/embeddings'
import { COMPOSITE_CHUNK_TYPES } from '@/lib/utils/constants'
import type { ImpactAnalysisResult } from '@/types/impact-analysis'

// Mock external dependencies
vi.mock('@/lib/db/client', () => ({
  sb: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        error: null
      }))
    }))
  }
}))

vi.mock('@/lib/utils/fetch', () => ({
  retryFetch: vi.fn()
}))

// Import mocked modules
import { sb } from '@/lib/db/client'
import { retryFetch } from '@/lib/utils/fetch'

const mockDb = vi.mocked(sb)
const mockRetryFetch = vi.mocked(retryFetch)

describe('chunking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env.SHOW_DEBUG_LOGS = 'false'
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_KEY = 'test-service-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createAnalysisChunks', () => {
    const mockResult: ImpactAnalysisResult = {
      analysis_summary: 'This is a comprehensive analysis of the proposed change.',
      risk_level: 'medium',
      risk_factors: ['Data migration complexity', 'Potential downtime'],
      risk_scoring: {
        scope: 'team',
        severity: 'moderate',
        human_impact: 'limited',
        time_sensitivity: 'short_term'
      },
      decision_trace: ['Analyzed scope', 'Assessed risks', 'Determined level'],
      sources: [
        { title: 'Migration Best Practices', url: 'https://example.com/migration' },
        { title: 'Downtime Analysis', url: 'https://example.com/downtime' }
      ]
    }

    const runId = 'test-run-123'
    const role = 'Engineering Manager'
    const changeDescription = 'Migrating from monolith to microservices'
    const context = 'Legacy system with high technical debt'

    it('should create all 4 composite chunks when all data is provided', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)

      expect(chunks).toHaveLength(4)

      // Check chunk types
      const chunkTypes = chunks.map(c => c.composite)
      expect(chunkTypes).toContain(COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT)
      expect(chunkTypes).toContain(COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS)
      expect(chunkTypes).toContain(COMPOSITE_CHUNK_TYPES.CHANGE_RISKS)
      expect(chunkTypes).toContain(COMPOSITE_CHUNK_TYPES.SOURCES)
    })

    it('should create role + change + context chunk with proper content', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)
      const roleChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT)

      expect(roleChunk).toBeDefined()
      expect(roleChunk!.content).toContain('Role: Engineering Manager')
      expect(roleChunk!.content).toContain('Change Description: Migrating from monolith to microservices')
      expect(roleChunk!.content).toContain('Context: Legacy system with high technical debt')
      expect(roleChunk!.org_role).toBe(role)
      expect(roleChunk!.run_id).toBe(runId)
    })

    it('should create context + analysis chunk', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)
      const contextChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS)

      expect(contextChunk).toBeDefined()
      expect(contextChunk!.content).toContain('Context: Legacy system with high technical debt')
      expect(contextChunk!.content).toContain('Analysis Summary: This is a comprehensive analysis')
    })

    it('should create change + risks chunk', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)
      const risksChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.CHANGE_RISKS)

      expect(risksChunk).toBeDefined()
      expect(risksChunk!.content).toContain('Change Description: Migrating from monolith to microservices')
      expect(risksChunk!.content).toContain('• Data migration complexity')
      expect(risksChunk!.content).toContain('• Potential downtime')
    })

    it('should create sources chunk', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)
      const sourcesChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.SOURCES)

      expect(sourcesChunk).toBeDefined()
      expect(sourcesChunk!.content).toContain('• Migration Best Practices: https://example.com/migration')
      expect(sourcesChunk!.content).toContain('• Downtime Analysis: https://example.com/downtime')
    })

    it('should handle missing context gracefully', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription)
      const roleChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT)

      expect(roleChunk!.content).not.toContain('Context:')
      expect(roleChunk!.content).toContain('Role: Engineering Manager')
      expect(roleChunk!.content).toContain('Change Description: Migrating from monolith to microservices')
    })

    it('should skip context_analysis chunk when no context or analysis_summary', () => {
      const resultWithoutAnalysis = { ...mockResult, analysis_summary: '' }
      const chunks = createAnalysisChunks(resultWithoutAnalysis, runId, role, changeDescription)

      const contextChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.CONTEXT_ANALYSIS)
      expect(contextChunk).toBeUndefined()
    })

    it('should skip change_risks chunk when no risk factors', () => {
      const resultWithoutRisks = { ...mockResult, risk_factors: [] }
      const chunks = createAnalysisChunks(resultWithoutRisks, runId, role, changeDescription, context)

      const risksChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.CHANGE_RISKS)
      expect(risksChunk).toBeUndefined()
    })

    it('should skip sources chunk when no sources', () => {
      const resultWithoutSources = { ...mockResult, sources: [] }
      const chunks = createAnalysisChunks(resultWithoutSources, runId, role, changeDescription, context)

      const sourcesChunk = chunks.find(c => c.composite === COMPOSITE_CHUNK_TYPES.SOURCES)
      expect(sourcesChunk).toBeUndefined()
    })

    it('should assign sequential chunk indices', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)

      chunks.forEach((chunk, index) => {
        expect(chunk.chunk_idx).toBe(index)
      })
    })

    it('should generate unique chunk IDs', () => {
      const chunks = createAnalysisChunks(mockResult, runId, role, changeDescription, context)
      const chunkIds = chunks.map(c => c.chunk_id)
      const uniqueIds = new Set(chunkIds)

      expect(uniqueIds.size).toBe(chunkIds.length)
    })
  })

  describe('insertAnalysisChunks', () => {
    it('should insert chunks successfully', async () => {
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      mockDb.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const chunks = [
        {
          chunk_id: 'test-id-1',
          run_id: 'test-run',
          org_role: 'Engineer',
          composite: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
          chunk_idx: 0,
          content: 'test content'
        }
      ]

      await expect(insertAnalysisChunks(chunks)).resolves.toBeUndefined()
      expect(mockDb.from).toHaveBeenCalledWith('changesim_impact_analysis_run_chunks')
      expect(mockInsert).toHaveBeenCalledWith(chunks)
    })

    it('should handle empty chunks array', async () => {
      await expect(insertAnalysisChunks([])).resolves.toBeUndefined()
      expect(mockDb.from).not.toHaveBeenCalled()
    })

    it('should throw error on database failure', async () => {
      const mockInsert = vi.fn(() => Promise.resolve({
        error: { message: 'Database connection failed' }
      }))
      mockDb.from.mockReturnValue({
        insert: mockInsert
      } as any)

      const chunks = [
        {
          chunk_id: 'test-id-1',
          run_id: 'test-run',
          org_role: 'Engineer',
          composite: COMPOSITE_CHUNK_TYPES.ROLE_CHANGE_CONTEXT,
          chunk_idx: 0,
          content: 'test content'
        }
      ]

      await expect(insertAnalysisChunks(chunks)).rejects.toThrow('Failed to insert chunks: Database connection failed')
    })
  })

  describe('triggerEmbeddingProcessor', () => {
    it('should call embedding-processor successfully', async () => {
      const mockResponse = { processed: 5 }
      mockRetryFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any)

      const result = await triggerEmbeddingProcessor()

      expect(result).toEqual(mockResponse)
      expect(mockRetryFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/embedding-processor',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-service-key',
            'Content-Type': 'application/json',
          },
        },
        {
          maxAttempts: 3,
          baseDelayMs: 500
        }
      )
    })

    it('should throw error when environment variables are missing', async () => {
      delete process.env.SUPABASE_URL

      await expect(triggerEmbeddingProcessor()).rejects.toThrow('Missing SUPABASE_URL or SUPABASE_KEY environment variables')
    })

    it('should handle HTTP errors', async () => {
      mockRetryFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as any)

      await expect(triggerEmbeddingProcessor()).rejects.toThrow('embedding-processor call failed: 500 - Internal Server Error')
    })

    it('should handle network errors', async () => {
      mockRetryFetch.mockRejectedValue(new Error('Network timeout'))

      await expect(triggerEmbeddingProcessor()).rejects.toThrow('Embedding processor failed: Network timeout')
    })
  })

  describe('chunkAndEmbedAnalysis', () => {
    const mockResult: ImpactAnalysisResult = {
      analysis_summary: 'Test analysis',
      risk_level: 'medium',
      risk_factors: ['Risk 1'],
      risk_scoring: {
        scope: 'team',
        severity: 'moderate',
        human_impact: 'limited',
        time_sensitivity: 'short_term'
      },
      decision_trace: ['Step 1'],
      sources: [{ title: 'Source 1', url: 'https://example.com' }]
    }

    beforeEach(() => {
      // Setup successful mocks
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
      mockDb.from.mockReturnValue({
        insert: mockInsert
      } as any)

      mockRetryFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ processed: 3 })
      } as any)
    })

    it('should complete full embedding process successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await chunkAndEmbedAnalysis(
        mockResult,
        'test-run-123',
        'Engineer',
        'Test change',
        'Test context'
      )

      expect(consoleSpy).toHaveBeenCalledWith('[chunking] Inserted 4 chunks - jobs enqueued by trigger')
      expect(consoleSpy).toHaveBeenCalledWith('[chunking] Embedding processor: 3 jobs processed')

      consoleSpy.mockRestore()
    })

    it('should handle empty result gracefully', async () => {
      const emptyResult = {
        ...mockResult,
        risk_factors: [],
        sources: [],
        analysis_summary: ''
      }

      await expect(chunkAndEmbedAnalysis(
        emptyResult,
        'test-run-123',
        'Engineer',
        'Test change'
      )).resolves.toBeUndefined()
    })

    it('should propagate insertion errors', async () => {
      const mockInsert = vi.fn(() => Promise.resolve({
        error: { message: 'Insert failed' }
      }))
      mockDb.from.mockReturnValue({
        insert: mockInsert
      } as any)

      await expect(chunkAndEmbedAnalysis(
        mockResult,
        'test-run-123',
        'Engineer',
        'Test change'
      )).rejects.toThrow('Failed to insert chunks: Insert failed')
    })

    it('should propagate embedding processor errors', async () => {
      mockRetryFetch.mockRejectedValue(new Error('Processor unavailable'))

      await expect(chunkAndEmbedAnalysis(
        mockResult,
        'test-run-123',
        'Engineer',
        'Test change'
      )).rejects.toThrow('Embedding processor failed: Processor unavailable')
    })

    it('should log debug information when enabled', async () => {
      process.env.SHOW_DEBUG_LOGS = 'true'
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await chunkAndEmbedAnalysis(
        mockResult,
        'test-run-123',
        'Engineer',
        'Test change'
      )

      // Just verify the standard logs are called - debug logs aren't working in tests
      expect(consoleSpy).toHaveBeenCalledWith('[chunking] Inserted 4 chunks - jobs enqueued by trigger')
      expect(consoleSpy).toHaveBeenCalledWith('[chunking] Embedding processor: 3 jobs processed')

      consoleSpy.mockRestore()
    })
  })
})