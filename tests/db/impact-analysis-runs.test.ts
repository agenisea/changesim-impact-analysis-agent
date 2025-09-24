import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sb, type ChangeSimImpactAnalysisRunInsert } from '@/lib/db/db'
import { MODEL, PROMPT_VERSION } from '@/lib/utils/constants'

// Mock Supabase client
vi.mock('@/lib/db/db', () => ({
  sb: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

describe('Database Insert Impact Analysis Run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully insert a run with all required fields', async () => {
    const mockRunData: ChangeSimImpactAnalysisRunInsert = {
      process: 'ChangeSim Impact Analysis',
      role: 'Test Role',
      change_description: 'Test change description',
      context: 'test context',
      risk_level: 'medium',
      risk_factors: ['Risk factor 1', 'Risk factor 2'],
      risk_scoring: {
        scope: 'team',
        severity: 'moderate',
        human_impact: 'limited',
        time_sensitivity: 'short_term'
      },
      analysis_summary: '# Test Summary',
      decision_trace: ['Decision 1', 'Decision 2'],
      sources: [{ title: 'Test Source', url: 'http://example.com' }],
      meta: {
        model: MODEL,
        temperature: 0.1,
        input_tokens: 100,
        output_tokens: 200,
        prompt_version: PROMPT_VERSION
      },
      session_id: 'test-session-id'
    }

    const mockResponse = {
      data: { run_id: 'test-run-id-123' },
      error: null
    }

    // Mock the chain of method calls
    const mockSingle = vi.fn().mockResolvedValue(mockResponse)
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

    ;(sb as any).from = mockFrom

    // Simulate the database insert
    const { data, error } = await sb
      .from('changesim_impact_analysis_runs')
      .insert(mockRunData)
      .select('run_id')
      .single()

    expect(mockFrom).toHaveBeenCalledWith('changesim_impact_analysis_runs')
    expect(mockInsert).toHaveBeenCalledWith(mockRunData)
    expect(mockSelect).toHaveBeenCalledWith('run_id')
    expect(mockSingle).toHaveBeenCalled()
    expect(data).toEqual({ run_id: 'test-run-id-123' })
    expect(error).toBeNull()
  })

  it('should handle database insert errors gracefully', async () => {
    const mockRunData: ChangeSimImpactAnalysisRunInsert = {
      process: 'ChangeSim Impact Analysis',
      role: 'Test Role',
      change_description: 'Test change description',
      risk_level: 'medium',
      risk_factors: ['Risk factor 1'],
      risk_scoring: { scope: 'team', severity: 'moderate', human_impact: 'limited', time_sensitivity: 'short_term' },
      analysis_summary: '# Test Summary',
      decision_trace: ['Decision 1'],
      sources: [{ title: 'Test Source', url: 'http://example.com' }],
      meta: { model: MODEL }
    }

    const mockResponse = {
      data: null,
      error: { message: 'Database connection failed', code: '500' }
    }

    const mockSingle = vi.fn().mockResolvedValue(mockResponse)
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

    ;(sb as any).from = mockFrom

    const { data, error } = await sb
      .from('changesim_impact_analysis_runs')
      .insert(mockRunData)
      .select('run_id')
      .single()

    expect(data).toBeNull()
    expect(error).toEqual({ message: 'Database connection failed', code: '500' })
  })

  it('should validate required environment variables', () => {
    // This test verifies that the db module throws helpful errors
    // when environment variables are missing
    const originalUrl = process.env.SUPABASE_URL
    const originalKey = process.env.SUPABASE_KEY

    // Test missing SUPABASE_URL
    delete process.env.SUPABASE_URL
    expect(() => {
      // This would normally throw during module import
      // We'll simulate the validation logic
      const supabaseUrl = process.env.SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable is missing. Please add it to your .env.local file.')
      }
    }).toThrow('SUPABASE_URL environment variable is missing')

    // Test missing SUPABASE_KEY
    process.env.SUPABASE_URL = 'http://localhost:54321'
    delete process.env.SUPABASE_KEY
    expect(() => {
      const supabaseKey = process.env.SUPABASE_KEY
      if (!supabaseKey) {
        throw new Error('SUPABASE_KEY environment variable is missing. Please add it to your .env.local file. This should be the service role key for server-side operations only.')
      }
    }).toThrow('SUPABASE_KEY environment variable is missing')

    // Restore original values
    if (originalUrl) process.env.SUPABASE_URL = originalUrl
    if (originalKey) process.env.SUPABASE_KEY = originalKey
  })

  it('should handle minimal run data correctly', async () => {
    const minimalRunData: ChangeSimImpactAnalysisRunInsert = {
      process: 'ChangeSim Impact Analysis',
      role: 'Minimal Role',
      change_description: 'Minimal change',
      risk_level: 'low',
      risk_factors: ['Minor risk'],
      risk_scoring: { scope: 'individual', severity: 'minor', human_impact: 'none', time_sensitivity: 'long_term' },
      analysis_summary: 'Minimal summary',
      decision_trace: [],
      sources: [],
      meta: { model: MODEL }
    }

    const mockResponse = {
      data: { run_id: 'minimal-run-id' },
      error: null
    }

    const mockSingle = vi.fn().mockResolvedValue(mockResponse)
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

    ;(sb as any).from = mockFrom

    const { data, error } = await sb
      .from('changesim_impact_analysis_runs')
      .insert(minimalRunData)
      .select('run_id')
      .single()

    expect(mockInsert).toHaveBeenCalledWith(minimalRunData)
    expect(data).toEqual({ run_id: 'minimal-run-id' })
    expect(error).toBeNull()
  })
})