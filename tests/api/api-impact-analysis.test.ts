/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/impact-analysis/route'
import {
  validInputFixtures,
  invalidInputFixtures,
  createMockAIResponse,
} from '../fixtures/impact-analysis'
import { ANALYSIS_STATUS, CACHE_STATUS } from '@/lib/utils/constants'
import type { ImpactAnalysisResult } from '@/types/impact-analysis'

// Mock external dependencies
vi.mock('@/lib/ai/ai-client', () => ({
  impactModel: { modelId: 'gpt-4.1-mini' },
}))

vi.mock('@/lib/db/client', () => ({
  sb: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/server/session', () => ({
  getSessionIdCookie: vi.fn(),
}))

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

vi.mock('@/lib/ai/agentic-rag', () => ({
  invokeAgenticRag: vi.fn(),
}))

vi.mock('@/lib/ai/embeddings', () => ({
  embedImpactQuery: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}))

vi.mock('@/lib/db/retrieval', () => ({
  matchImpactChunks: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/ai/dynamic-prompting', () => ({
  buildDynamicPrompt: vi.fn().mockReturnValue({
    enhancedSystemPrompt: 'Enhanced system prompt',
    roleContext: 'Test role context',
    focusAreas: ['test area'],
    ragInsights: null,
  }),
}))

vi.mock('@/lib/db/embeddings', () => ({
  chunkAndEmbedAnalysis: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/utils/hash', () => ({
  makeInputHash: vi.fn(() => 'test-hash-123'),
}))

// Mock environment variables for tests
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test-key'

// Import mocked modules
import { generateObject } from 'ai'
import { sb } from '@/lib/db/client'
import { getSessionIdCookie } from '@/lib/server/session'
import { invokeAgenticRag } from '@/lib/ai/agentic-rag'

const mockGenerateObject = vi.mocked(generateObject)
const mockDb = vi.mocked(sb)
const mockGetSession = vi.mocked(getSessionIdCookie)
const mockInvokeAgenticRag = vi.mocked(invokeAgenticRag)

// Helper function to create a mock NextRequest
function createMockRequest(body: any, headers?: Record<string, string>): NextRequest {
  const url = 'http://localhost:3000/api/impact-analysis'
  const requestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  }
  return new NextRequest(url, requestInit)
}

// Helper function to setup successful mocks
function setupSuccessfulMocks() {
  // Mock session
  mockGetSession.mockResolvedValue({
    sessionId: 'test-session-123',
    isNewSession: false,
  })

  // Mock database cache miss (no existing result)
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    })),
  }))

  // Mock database insert success
  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({
        data: { run_id: 'ia_test_uuid_12345' },
        error: null,
      }),
    })),
  }))

  mockDb.from = vi.fn((table: string) => {
    if (table === 'changesim_impact_analysis_runs') {
      return {
        select: mockFrom().select,
        insert: mockInsert,
      }
    }
    return mockFrom()
  }) as any

  // Mock agentic RAG to skip (fallback to single agent)
  mockInvokeAgenticRag.mockResolvedValue({
    strategy: 'agentic-rag',
    skipped: true,
    reason: 'insufficient-context',
  } as any)

  // Mock AI response
  mockGenerateObject.mockResolvedValue({
    object: createMockAIResponse(),
    usage: {
      inputTokens: 150,
      outputTokens: 300,
      totalTokens: 450,
    },
  } as any)
}

describe('API Route: /api/impact-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Input Validation', () => {
    it('should reject requests with missing required fields', async () => {
      for (const invalidInput of invalidInputFixtures) {
        const request = createMockRequest(invalidInput)
        const response = await POST(request)

        expect(response.status).toBe(422)
        const body = await response.json()
        expect(body).toHaveProperty('error')
        expect(typeof body.error).toBe('string')
      }
    })

    it('should accept valid input structure', async () => {
      setupSuccessfulMocks()

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept optional context and forceFresh parameters', async () => {
      setupSuccessfulMocks()

      const inputWithOptionals = {
        ...validInputFixtures[0]!,
        context: { department: 'Engineering', urgency: 'high' },
        forceFresh: true,
      }

      const request = createMockRequest(inputWithOptionals)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Successful Analysis Flow', () => {
    it('should return properly structured impact analysis result', async () => {
      setupSuccessfulMocks()

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify response structure
      expect(result).toHaveProperty('analysis_summary')
      expect(result).toHaveProperty('risk_level')
      expect(result).toHaveProperty('risk_factors')
      expect(result).toHaveProperty('risk_scoring')
      expect(result).toHaveProperty('decision_trace')
      expect(result).toHaveProperty('sources')
      expect(result).toHaveProperty('meta')

      // Verify risk level is valid
      expect(['low', 'medium', 'high', 'critical']).toContain(result.risk_level)

      // Verify arrays have expected structure
      expect(Array.isArray(result.risk_factors)).toBe(true)
      expect(Array.isArray(result.decision_trace)).toBe(true)
      expect(Array.isArray(result.sources)).toBe(true)

      // Verify meta information
      expect(result.meta).toMatchObject({
        status: ANALYSIS_STATUS.COMPLETE,
        role: validInput.role,
        change_description: validInput.changeDescription,
        _cache: CACHE_STATUS.MISS,
      })
      expect(result.meta?.timestamp).toBeTruthy()
      expect(result.meta?.run_id).toBeTruthy()
    })

    it('should set correct response headers', async () => {
      setupSuccessfulMocks()

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.MISS)
      expect(response.headers.get('X-ChangeSim-Prompt-Version')).toBeTruthy()
      expect(response.headers.get('X-ChangeSim-Model')).toBeTruthy()
    })

    it('should call session management and database logging', async () => {
      setupSuccessfulMocks()

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      await POST(request)

      // Verify session was retrieved
      expect(mockGetSession).toHaveBeenCalledOnce()

      // Verify database operations (cache check + insert)
      expect(mockDb.from).toHaveBeenCalledWith('changesim_impact_analysis_runs')

      // Verify AI generation was called
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })
  })

  describe('Cache Behavior', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        run_id: 'cached-run-123',
        analysis_summary: 'Cached analysis summary',
        risk_level: 'medium',
        risk_factors: ['Cached risk factor'],
        risk_scoring: {
          scope: 'team',
          severity: 'moderate',
          human_impact: 'limited',
          time_sensitivity: 'short_term',
        },
        decision_trace: ['Cached decision trace'],
        sources: [{ title: 'Cached Source', url: 'https://cached.com' }],
        created_at: '2025-01-01T00:00:00Z',
        role: 'Cached Role',
        change_description: 'Cached Change',
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock cache hit
      const mockCacheHit = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: cachedResult,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      }))

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(mockCacheHit()),
      }) as any

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.HIT)

      const result: ImpactAnalysisResult = await response.json()
      expect(result.meta?._cache).toBe(CACHE_STATUS.HIT)
      expect(result.analysis_summary).toBe(cachedResult.analysis_summary)

      // Verify AI was not called for cached result
      expect(mockGenerateObject).not.toHaveBeenCalled()
    })

    it('should skip cache for new sessions', async () => {
      setupSuccessfulMocks()

      // Override session to be new session
      mockGetSession.mockResolvedValue({
        sessionId: 'new-session-123',
        isNewSession: true,
      })

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.NEW_SESSION)

      const result: ImpactAnalysisResult = await response.json()
      expect(result.meta?._cache).toBe(CACHE_STATUS.NEW_SESSION)

      // Verify AI was called for new session
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })

    it('should skip cache when forceFresh is true', async () => {
      setupSuccessfulMocks()

      const inputWithForceFresh = {
        ...validInputFixtures[0]!,
        forceFresh: true,
      }

      const request = createMockRequest(inputWithForceFresh)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.MISS)

      // Verify AI was called despite potential cache
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service rate limiting (429)', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      // Mock rate limit error
      mockGenerateObject.mockRejectedValue(new Error('429 rate limit exceeded'))

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toContain('rate limit')
    })

    it('should handle AI service unavailability (502)', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      // Mock API error
      mockGenerateObject.mockRejectedValue(new Error('API service temporarily unavailable'))

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(502)
      const body = await response.json()
      expect(body.error).toContain('temporarily unavailable')
    })

    it('should handle AI response schema validation errors (502)', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      // Mock schema validation error from AI
      mockGenerateObject.mockRejectedValue(new Error('schema validation failed for response'))

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(502)
      const body = await response.json()
      expect(body.error).toContain('AI response format validation failed')
    })

    it('should handle generic server errors (500)', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      }) as any

      // Mock generic error
      mockGenerateObject.mockRejectedValue(new Error('Something went wrong'))

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to analyze impact. Please try again.')
    })

    it('should handle database errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock cache lookup failure
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' },
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      // Mock successful AI response
      mockGenerateObject.mockResolvedValue({
        object: createMockAIResponse(),
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      // Should still succeed despite database errors
      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()
      expect(result.analysis_summary).toBeTruthy()
    })
  })

  describe('Race Condition Handling', () => {
    it('should handle concurrent request race conditions', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      // Mock successful AI response
      mockGenerateObject.mockResolvedValue({
        object: createMockAIResponse(),
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const existingRun = {
        run_id: 'raced-run-123',
        analysis_summary: 'Raced analysis result',
        risk_level: 'high',
        risk_factors: ['Raced factor'],
        risk_scoring: {
          scope: 'organization',
          severity: 'major',
          human_impact: 'limited',
          time_sensitivity: 'immediate',
        },
        decision_trace: ['Raced decision'],
        sources: [{ title: 'Raced Source', url: 'https://raced.com' }],
        created_at: '2025-01-01T00:00:00Z',
        role: 'Raced Role',
        change_description: 'Raced Change',
      }

      // Mock race condition: insert fails with unique constraint violation
      // then successful re-select of existing result
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValueOnce({ data: null, error: null }) // Initial cache miss
                    .mockResolvedValueOnce({ data: existingRun, error: null }), // Race recovery
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Unique constraint violation' },
            }),
          }),
        }),
      }) as any

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.RACE)

      const result: ImpactAnalysisResult = await response.json()
      expect(result.meta?._cache).toBe(CACHE_STATUS.RACE)
      expect(result.analysis_summary).toBe(existingRun.analysis_summary)
    })
  })

  describe('Enum Normalization Integration', () => {
    it('should properly normalize individual scope to single before evaluation', async () => {
      // Mock AI response with 'individual' scope (schema format)
      const mockAIResponse = {
        analysis_summary: 'Test analysis with individual scope',
        risk_level: 'medium', // This should be overridden by evaluator
        risk_factors: ['Test factor'],
        risk_scoring: {
          scope: 'individual', // Schema format
          severity: 'major',
          human_impact: 'limited',
          time_sensitivity: 'immediate',
        },
        decision_trace: ['Decision 1', 'Decision 2', 'Decision 3'],
        sources: [
          { title: 'Source 1', url: 'https://example.com/1' },
          { title: 'Source 2', url: 'https://example.com/2' },
        ],
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      mockGenerateObject.mockResolvedValue({
        object: mockAIResponse,
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = {
        role: 'Engineering Manager',
        changeDescription: 'Test change with individual scope normalization',
      }

      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify that the AI was called
      expect(mockGenerateObject).toHaveBeenCalledOnce()

      // The key test: the risk_level should be determined by the evaluator
      // using the normalized 'single' scope, not the original 'medium' from AI
      // Since scope='single' (normalized from 'individual'), severity='major',
      // human_impact='limited', time_sensitivity='immediate'
      // This results in 'medium' due to single-person guardrail (line 55-58 in evaluator)
      expect(result.risk_level).toBe('medium') // Evaluator determines this, not AI's original 'medium'

      // Verify the risk scoring still shows the original schema values in response
      expect(result.risk_scoring.scope).toBe('individual') // Original schema format preserved in response
      expect(result.risk_scoring.severity).toBe('major')
      expect(result.risk_scoring.human_impact).toBe('limited')
      expect(result.risk_scoring.time_sensitivity).toBe('immediate')
    })

    it('should apply org-cap guardrail correctly with normalized scope', async () => {
      // Mock AI response that should trigger org cap
      // organization + major + limited + short_term = medium with orgCapTriggered: true
      const mockAIResponse = {
        analysis_summary: 'Test analysis triggering org cap',
        risk_level: 'high', // AI suggests high, but evaluator will cap it
        risk_factors: ['Org-capped factor'],
        risk_scoring: {
          scope: 'organization',
          severity: 'major', // major (2) <= 2 ✓
          human_impact: 'limited', // limited (1) <= 1 ✓
          time_sensitivity: 'short_term', // short_term (1) <= 1 ✓
        },
        decision_trace: ['Decision 1', 'Decision 2', 'Decision 3'],
        sources: [
          { title: 'Source 1', url: 'https://example.com/1' },
          { title: 'Source 2', url: 'https://example.com/2' },
        ],
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      mockGenerateObject.mockResolvedValue({
        object: mockAIResponse,
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = {
        role: 'Engineering Manager',
        changeDescription: 'Test change that should trigger org cap',
      }

      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Based on debug: organization + major + limited + short_term = medium with orgCapTriggered
      expect(result.risk_level).toBe('medium')

      // Check if org cap decision trace was added
      const hasOrgCapTrace = result.decision_trace.some(trace =>
        trace.includes('organizational scope guardrail')
      )
      expect(hasOrgCapTrace).toBe(true) // Should have org cap trace
    })

    it('should warn but continue with invalid enum values', async () => {
      // Mock AI response with invalid enum values to test fallback behavior
      const mockAIResponse = {
        analysis_summary: 'Test with invalid enums',
        risk_level: 'medium',
        risk_factors: ['Test factor'],
        risk_scoring: {
          scope: 'invalid_scope' as any,
          severity: 'invalid_severity' as any,
          human_impact: 'limited',
          time_sensitivity: 'immediate',
        },
        decision_trace: ['Decision 1', 'Decision 2', 'Decision 3'],
        sources: [
          { title: 'Source 1', url: 'https://example.com/1' },
          { title: 'Source 2', url: 'https://example.com/2' },
        ],
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      mockGenerateObject.mockResolvedValue({
        object: mockAIResponse,
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = {
        role: 'Engineering Manager',
        changeDescription: 'Test with invalid enum values',
      }

      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Should still work with fallback values
      // Normalized: scope='single' (fallback), severity='moderate' (fallback),
      //            human_impact='limited', time_sensitivity='immediate'
      expect(result.risk_level).toBe('medium') // Based on fallback normalization

      // Verify console warnings were logged for invalid values
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown scope value: invalid_scope')
      )
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown severity value: invalid_severity')
      )
    })
  })

  describe('Decision Trace Bounds', () => {
    it('should enforce decision trace bounds even with excessive AI output', async () => {
      // Mock AI response with excessive decision trace items
      const mockAIResponse = {
        analysis_summary: 'Test analysis with excessive decision trace',
        risk_level: 'medium',
        risk_factors: ['Test factor'],
        risk_scoring: {
          scope: 'individual',
          severity: 'major',
          human_impact: 'limited',
          time_sensitivity: 'immediate',
        },
        decision_trace: [
          'Decision 1',
          'Decision 2',
          'Decision 3',
          'Decision 4',
          'Decision 5',
          'Decision 6', // Exceeds schema max of 5
          'Decision 7',
          'Decision 8',
        ],
        sources: [
          { title: 'Source 1', url: 'https://example.com/1' },
          { title: 'Source 2', url: 'https://example.com/2' },
        ],
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      mockGenerateObject.mockResolvedValue({
        object: mockAIResponse,
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = {
        role: 'Engineering Manager',
        changeDescription: 'Test excessive decision trace bounds',
      }

      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Decision trace should be bounded to max 5 items despite AI returning 8
      expect(result.decision_trace.length).toBeLessThanOrEqual(5)
      expect(result.decision_trace.length).toBeGreaterThanOrEqual(3)

      // Should contain only the first 5 decisions (bounded)
      expect(result.decision_trace).toEqual([
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
        'Decision 5',
      ])
    })

    it('should bound decision trace when org-cap guardrail is triggered', async () => {
      // Mock AI response with decision trace at max capacity
      const mockAIResponse = {
        analysis_summary: 'Test org cap with full decision trace',
        risk_level: 'high',
        risk_factors: ['Org-capped factor'],
        risk_scoring: {
          scope: 'organization',
          severity: 'major',
          human_impact: 'limited',
          time_sensitivity: 'short_term',
        },
        decision_trace: [
          'Decision 1',
          'Decision 2',
          'Decision 3',
          'Decision 4',
          'Decision 5', // Already at max
        ],
        sources: [
          { title: 'Source 1', url: 'https://example.com/1' },
          { title: 'Source 2', url: 'https://example.com/2' },
        ],
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG to skip (fallback to single agent)
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      mockGenerateObject.mockResolvedValue({
        object: mockAIResponse,
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = {
        role: 'Engineering Manager',
        changeDescription: 'Test org cap decision trace bounds',
      }

      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Should be bounded to exactly 5 items with guardrail note
      expect(result.decision_trace.length).toBe(5)

      // Last item should be the guardrail note
      expect(result.decision_trace[4]).toBe(
        'Risk level adjusted downward due to organizational scope guardrail'
      )

      // First 4 should be original decisions (trimmed to make space)
      expect(result.decision_trace.slice(0, 4)).toEqual([
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
      ])
    })
  })

  describe('Agentic RAG Integration', () => {
    it('should use agentic RAG when sufficient context is available', async () => {
      const mockAIResponse = createMockAIResponse()

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock database cache miss
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock successful agentic RAG response
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        object: mockAIResponse,
        usage: {
          inputTokens: 200,
          outputTokens: 400,
          totalTokens: 600,
        },
        diagnostics: {
          matchCount: 3,
          averageSimilarity: 0.85,
          retrievalIds: ['chunk-1', 'chunk-2', 'chunk-3'],
          roleContext: 'Engineering Manager context',
          focusAreas: ['technical risks', 'team impact'],
          dynamicPromptUsed: true,
        },
      } as any)

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify agentic RAG was called
      expect(mockInvokeAgenticRag).toHaveBeenCalledOnce()
      expect(mockInvokeAgenticRag).toHaveBeenCalledWith({
        role: validInput.role,
        changeDescription: validInput.changeDescription,
        context: undefined,
        schema: expect.any(Object),
      })

      // Verify generateObject was NOT called (agentic RAG handled it)
      expect(mockGenerateObject).not.toHaveBeenCalled()

      // Verify RAG diagnostics are included in response
      expect(result.meta?.agent_type).toBe('agentic-rag')
      expect(result.meta?.rag).toEqual({
        match_count: 3,
        average_similarity: 0.85,
      })

      // Verify response headers
      expect(response.headers.get('X-ChangeSim-Agent-Type')).toBe('agentic-rag')
    })

    it('should fallback to single-agent when agentic RAG fails', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock database
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG error
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        error: new Error('Embedding service unavailable'),
      } as any)

      // Mock successful fallback
      mockGenerateObject.mockResolvedValue({
        object: createMockAIResponse(),
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify both were called
      expect(mockInvokeAgenticRag).toHaveBeenCalledOnce()
      expect(mockGenerateObject).toHaveBeenCalledOnce()

      // Verify fallback to single-agent
      expect(result.meta?.agent_type).toBe('single-agent')
      expect(result.meta?.rag).toBeUndefined()

      // Verify response headers
      expect(response.headers.get('X-ChangeSim-Agent-Type')).toBe('single-agent')
    })

    it('should fallback to single-agent when insufficient context', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock database
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock agentic RAG skipped due to insufficient context
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context',
      } as any)

      // Mock successful fallback
      mockGenerateObject.mockResolvedValue({
        object: createMockAIResponse(),
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 },
      } as any)

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify both were called
      expect(mockInvokeAgenticRag).toHaveBeenCalledOnce()
      expect(mockGenerateObject).toHaveBeenCalledOnce()

      // Verify fallback to single-agent
      expect(result.meta?.agent_type).toBe('single-agent')
      expect(result.meta?.rag).toBeUndefined()
    })

    it('should handle object context in agentic RAG flow', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false,
      })

      // Mock database
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null,
            }),
          }),
        }),
      }) as any

      // Mock successful agentic RAG response
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        object: createMockAIResponse(),
        usage: { inputTokens: 200, outputTokens: 400, totalTokens: 600 },
        diagnostics: {
          matchCount: 2,
          averageSimilarity: 0.78,
          retrievalIds: ['chunk-1', 'chunk-2'],
          roleContext: 'Sales Manager context',
          focusAreas: ['customer impact', 'revenue risks'],
          dynamicPromptUsed: true,
        },
      } as any)

      const inputWithObjectContext = {
        ...validInputFixtures[0]!,
        context: { department: 'Sales', urgency: 'high', team_size: 15 },
      }

      const request = createMockRequest(inputWithObjectContext)
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify agentic RAG was called with object context
      expect(mockInvokeAgenticRag).toHaveBeenCalledWith({
        role: inputWithObjectContext.role,
        changeDescription: inputWithObjectContext.changeDescription,
        context: inputWithObjectContext.context,
        schema: expect.any(Object),
      })

      const result: ImpactAnalysisResult = await response.json()
      expect(result.meta?.agent_type).toBe('agentic-rag')
      expect(result.meta?.context).toEqual(inputWithObjectContext.context)
    })
  })

  describe('Risk Rationale Data Flow', () => {
    it('should include risk_rationale in all response scenarios (cache miss, single-agent)', async () => {
      setupSuccessfulMocks()

      // Mock AI response with explicit risk_rationale
      const mockAIResponse = {
        ...createMockAIResponse(),
        risk_rationale: 'Complex architectural change with potential service disruptions'
      }

      mockGenerateObject.mockResolvedValue({
        object: mockAIResponse,
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 }
      } as any)

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify risk_rationale is present and matches expected value
      expect(result.risk_rationale).toBeDefined()
      expect(result.risk_rationale).toBe('Complex architectural change with potential service disruptions')
      expect(typeof result.risk_rationale).toBe('string')
      expect(result.risk_rationale.length).toBeGreaterThan(0)
    })

    it('should include risk_rationale in cached responses', async () => {
      const cachedResult = {
        run_id: 'cached-run-123',
        analysis_summary: 'Cached analysis summary',
        risk_level: 'medium',
        risk_rationale: 'Cached risk rationale explanation', // Explicit risk_rationale
        risk_factors: ['Cached risk factor'],
        risk_scoring: {
          scope: 'team',
          severity: 'moderate',
          human_impact: 'limited',
          time_sensitivity: 'short_term'
        },
        decision_trace: ['Cached decision trace'],
        sources: [{ title: 'Cached Source', url: 'https://cached.com' }],
        created_at: '2025-01-01T00:00:00Z',
        role: 'Cached Role',
        change_description: 'Cached Change'
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false
      })

      // Mock cache hit
      const mockCacheHit = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: cachedResult,
                  error: null
                })
              }))
            }))
          }))
        }))
      }))

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(mockCacheHit())
      }) as any

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify cached risk_rationale is preserved
      expect(result.risk_rationale).toBeDefined()
      expect(result.risk_rationale).toBe('Cached risk rationale explanation')
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.HIT)
    })

    it('should provide fallback risk_rationale for cached results without it', async () => {
      const cachedResultWithoutRationale = {
        run_id: 'cached-run-124',
        analysis_summary: 'Cached analysis summary',
        risk_level: 'high',
        risk_rationale: null, // Missing risk_rationale
        risk_factors: ['Cached risk factor'],
        risk_scoring: {
          scope: 'organization',
          severity: 'major',
          human_impact: 'significant',
          time_sensitivity: 'immediate'
        },
        decision_trace: ['Cached decision trace'],
        sources: [{ title: 'Cached Source', url: 'https://cached.com' }],
        created_at: '2025-01-01T00:00:00Z',
        role: 'Cached Role',
        change_description: 'Cached Change'
      }

      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false
      })

      // Mock cache hit with missing risk_rationale
      const mockCacheHit = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: cachedResultWithoutRationale,
                  error: null
                })
              }))
            }))
          }))
        }))
      }))

      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(mockCacheHit())
      }) as any

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify fallback risk_rationale is provided
      expect(result.risk_rationale).toBeDefined()
      expect(result.risk_rationale).toBe('Cached analysis result')
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.HIT)
    })

    it('should include risk_rationale in agentic RAG responses', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false
      })

      // Mock database cache miss
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { run_id: 'test-run-123' },
              error: null
            })
          })
        })
      }) as any

      // Mock successful agentic RAG response with risk_rationale
      const mockRAGResponse = {
        ...createMockAIResponse(),
        risk_rationale: 'Agentic RAG enhanced risk assessment based on historical patterns'
      }

      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        object: mockRAGResponse,
        usage: { inputTokens: 200, outputTokens: 400, totalTokens: 600 },
        diagnostics: {
          matchCount: 3,
          averageSimilarity: 0.85,
          retrievalIds: ['chunk-1', 'chunk-2', 'chunk-3'],
          roleContext: 'Engineering Manager context',
          focusAreas: ['technical risks', 'team impact'],
          dynamicPromptUsed: true
        }
      } as any)

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const result: ImpactAnalysisResult = await response.json()

      // Verify agentic RAG response includes risk_rationale
      expect(result.risk_rationale).toBeDefined()
      expect(result.risk_rationale).toBe('Agentic RAG enhanced risk assessment based on historical patterns')
      expect(result.meta?.agent_type).toBe('agentic-rag')
      expect(response.headers.get('X-ChangeSim-Agent-Type')).toBe('agentic-rag')
    })

    it('should ensure risk_rationale is required in schema validation', async () => {
      setupSuccessfulMocks()

      // Mock generateObject to throw validation error for missing risk_rationale
      mockGenerateObject.mockRejectedValue(
        new Error('Required property risk_rationale missing in schema validation')
      )

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)

      // Should return validation error due to missing risk_rationale
      expect(response.status).toBe(502)
      const errorBody = await response.json()
      expect(errorBody.error).toContain('AI response format validation failed')
    })

    it('should handle race condition scenarios with risk_rationale', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        isNewSession: false
      })

      // Mock agentic RAG to skip and fallback to single-agent
      mockInvokeAgenticRag.mockResolvedValue({
        strategy: 'agentic-rag',
        skipped: true,
        reason: 'insufficient-context'
      } as any)

      // Mock successful AI response
      mockGenerateObject.mockResolvedValue({
        object: {
          ...createMockAIResponse(),
          risk_rationale: 'Original analysis risk rationale'
        },
        usage: { inputTokens: 150, outputTokens: 300, totalTokens: 450 }
      } as any)

      const existingRun = {
        run_id: 'raced-run-123',
        analysis_summary: 'Raced analysis result',
        risk_level: 'high',
        risk_rationale: 'Raced analysis risk rationale', // Ensure race result has risk_rationale
        risk_factors: ['Raced factor'],
        risk_scoring: {
          scope: 'organization',
          severity: 'major',
          human_impact: 'limited',
          time_sensitivity: 'immediate'
        },
        decision_trace: ['Raced decision'],
        sources: [{ title: 'Raced Source', url: 'https://raced.com' }],
        created_at: '2025-01-01T00:00:00Z',
        role: 'Raced Role',
        change_description: 'Raced Change'
      }

      // Mock race condition: insert fails with unique constraint violation
      // then successful re-select of existing result
      mockDb.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn()
                    .mockResolvedValueOnce({ data: null, error: null }) // Initial cache miss
                    .mockResolvedValueOnce({ data: existingRun, error: null }) // Race recovery
                })
              })
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Unique constraint violation' }
            })
          })
        })
      }) as any

      const validInput = validInputFixtures[0]!
      const request = createMockRequest(validInput)
      const response = await POST(request)


      expect(response.status).toBe(200)
      expect(response.headers.get('X-ChangeSim-Cache')).toBe(CACHE_STATUS.RACE)

      const result: ImpactAnalysisResult = await response.json()

      // Verify race condition recovery preserves risk_rationale
      expect(result.risk_rationale).toBeDefined()
      expect(result.risk_rationale).toBe('Raced analysis risk rationale')
    })
  })
})
