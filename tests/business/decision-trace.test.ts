/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest'
import {
  boundDecisionTrace,
  appendSystemNoteWithBounds,
  validateDecisionTrace,
  MAX_DECISION_TRACE_LENGTH,
  MIN_DECISION_TRACE_LENGTH,
} from '@/lib/business/decision-trace'

describe('Decision Trace Bounds Management', () => {
  describe('boundDecisionTrace', () => {
    it('should not modify arrays within bounds', () => {
      const trace = ['Decision 1', 'Decision 2', 'Decision 3']
      const result = boundDecisionTrace(trace)
      expect(result).toEqual(trace)
      expect(result.length).toBe(3)
    })

    it('should trim arrays that exceed max length', () => {
      const trace = [
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
        'Decision 5',
        'Decision 6', // This exceeds max of 5
        'Decision 7',
      ]
      const result = boundDecisionTrace(trace)
      expect(result).toEqual(['Decision 1', 'Decision 2', 'Decision 3', 'Decision 4', 'Decision 5'])
      expect(result.length).toBe(MAX_DECISION_TRACE_LENGTH)
    })

    it('should respect custom max length', () => {
      const trace = ['Decision 1', 'Decision 2', 'Decision 3', 'Decision 4']
      const result = boundDecisionTrace(trace, 2)
      expect(result).toEqual(['Decision 1', 'Decision 2'])
      expect(result.length).toBe(2)
    })

    it('should handle empty arrays', () => {
      const result = boundDecisionTrace([])
      expect(result).toEqual([])
    })

    it('should not mutate original array', () => {
      const original = [
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
        'Decision 5',
        'Decision 6',
      ]
      const originalCopy = [...original]
      const result = boundDecisionTrace(original)

      expect(original).toEqual(originalCopy) // Original unchanged
      expect(result).not.toBe(original) // Different reference
      expect(result.length).toBe(5) // Bounded result
    })
  })

  describe('appendSystemNoteWithBounds', () => {
    it('should append system note when space is available', () => {
      const trace = ['Decision 1', 'Decision 2', 'Decision 3']
      const result = appendSystemNoteWithBounds(trace, 'System note')

      expect(result).toEqual(['Decision 1', 'Decision 2', 'Decision 3', 'System note'])
      expect(result.length).toBe(4)
    })

    it('should trim original trace when at capacity', () => {
      const trace = ['Decision 1', 'Decision 2', 'Decision 3', 'Decision 4', 'Decision 5']
      const result = appendSystemNoteWithBounds(trace, 'System note')

      expect(result).toEqual([
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
        'System note',
      ])
      expect(result.length).toBe(5)
    })

    it('should handle over-capacity original trace', () => {
      const trace = [
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
        'Decision 5',
        'Decision 6', // Exceeds normal capacity
        'Decision 7',
      ]
      const result = appendSystemNoteWithBounds(trace, 'System note')

      expect(result).toEqual([
        'Decision 1',
        'Decision 2',
        'Decision 3',
        'Decision 4',
        'System note',
      ])
      expect(result.length).toBe(5)
    })

    it('should respect custom max length', () => {
      const trace = ['Decision 1', 'Decision 2', 'Decision 3']
      const result = appendSystemNoteWithBounds(trace, 'System note', 3)

      expect(result).toEqual(['Decision 1', 'Decision 2', 'System note'])
      expect(result.length).toBe(3)
    })

    it('should handle minimum capacity (maxLength = 1)', () => {
      const trace = ['Decision 1', 'Decision 2']
      const result = appendSystemNoteWithBounds(trace, 'System note', 1)

      expect(result).toEqual(['System note'])
      expect(result.length).toBe(1)
    })

    it('should not mutate original array', () => {
      const original = ['Decision 1', 'Decision 2', 'Decision 3', 'Decision 4', 'Decision 5']
      const originalCopy = [...original]
      const result = appendSystemNoteWithBounds(original, 'System note')

      expect(original).toEqual(originalCopy) // Original unchanged
      expect(result).not.toBe(original) // Different reference
    })
  })

  describe('validateDecisionTrace', () => {
    it('should accept valid length arrays', () => {
      const validLengths = [3, 4, 5] // MIN to MAX

      validLengths.forEach(length => {
        const trace = Array.from({ length }, (_, i) => `Decision ${i + 1}`)
        const result = validateDecisionTrace(trace)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject arrays below minimum length', () => {
      const shortTraces = [[], ['Decision 1'], ['Decision 1', 'Decision 2']]

      shortTraces.forEach(trace => {
        const result = validateDecisionTrace(trace)
        expect(result.valid).toBe(false)
        expect(result.error).toContain(`at least ${MIN_DECISION_TRACE_LENGTH}`)
        expect(result.error).toContain(`got ${trace.length}`)
      })
    })

    it('should reject arrays above maximum length', () => {
      const longTrace = Array.from({ length: 7 }, (_, i) => `Decision ${i + 1}`)
      const result = validateDecisionTrace(longTrace)

      expect(result.valid).toBe(false)
      expect(result.error).toContain(`at most ${MAX_DECISION_TRACE_LENGTH}`)
      expect(result.error).toContain('got 7')
    })
  })

  describe('Integration scenarios', () => {
    it('should handle org-cap guardrail scenario', () => {
      // Simulate AI returning max length decision trace
      const aiTrace = [
        'Analyzed organizational change scope',
        'Evaluated technical complexity and dependencies',
        'Assessed potential user impact and disruption',
        'Considered implementation timeline and resources',
        'Applied risk scoring based on severity matrix',
      ]

      // System adds guardrail note
      const withGuardrail = appendSystemNoteWithBounds(
        aiTrace,
        'Risk level adjusted downward due to organizational scope guardrail'
      )

      expect(withGuardrail.length).toBe(5)
      expect(withGuardrail[4]).toBe(
        'Risk level adjusted downward due to organizational scope guardrail'
      )

      // Validate it meets schema requirements
      const validation = validateDecisionTrace(withGuardrail)
      expect(validation.valid).toBe(true)
    })

    it('should handle multiple system notes with bounds', () => {
      const originalTrace = ['Decision 1', 'Decision 2', 'Decision 3', 'Decision 4']

      // First system note
      let bounded = appendSystemNoteWithBounds(originalTrace, 'System note 1')
      expect(bounded.length).toBe(5)

      // Second system note should trim further
      bounded = appendSystemNoteWithBounds(bounded, 'System note 2')
      expect(bounded.length).toBe(5)
      expect(bounded[4]).toBe('System note 2')
    })

    it('should prevent prompt drift with excessive AI output', () => {
      // Simulate AI returning way too many decision trace items
      const excessiveTrace = Array.from({ length: 15 }, (_, i) => `AI Decision ${i + 1}`)

      // Bounds checking should contain this
      const bounded = boundDecisionTrace(excessiveTrace)
      expect(bounded.length).toBe(5)

      // Even with system note, should stay bounded
      const withNote = appendSystemNoteWithBounds(bounded, 'System guardrail')
      expect(withNote.length).toBe(5)

      const validation = validateDecisionTrace(withNote)
      expect(validation.valid).toBe(true)
    })
  })
})
