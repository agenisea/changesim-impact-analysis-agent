/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeScope,
  normalizeSeverity,
  normalizeHumanImpact,
  normalizeTimeSensitivity,
  normalizeRiskScoring,
  isValidScope,
  isValidSeverity,
  isValidHumanImpact,
  isValidTimeSensitivity,
} from '@/lib/business/normalize'
import type { Scope, Severity, HumanImpact, TimeSensitivity } from '@/lib/business/evaluator'

describe('Risk Scoring Enum Normalizer', () => {
  beforeEach(() => {
    // Mock console.warn to avoid noise in test output
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('normalizeScope', () => {
    it('should convert individual to single', () => {
      expect(normalizeScope('individual')).toBe('single')
    })

    it('should pass through valid scope values unchanged', () => {
      expect(normalizeScope('team')).toBe('team')
      expect(normalizeScope('organization')).toBe('organization')
      expect(normalizeScope('national')).toBe('national')
      expect(normalizeScope('global')).toBe('global')
    })

    it('should handle unknown values with fallback', () => {
      // @ts-expect-error Testing invalid input
      expect(normalizeScope('invalid')).toBe('single')
      expect(console.warn).toHaveBeenCalledWith('[normalize] Unknown scope value: invalid, falling back to \'single\'')
    })
  })

  describe('normalizeSeverity', () => {
    it('should pass through valid severity values unchanged', () => {
      expect(normalizeSeverity('minor')).toBe('minor')
      expect(normalizeSeverity('moderate')).toBe('moderate')
      expect(normalizeSeverity('major')).toBe('major')
      expect(normalizeSeverity('catastrophic')).toBe('catastrophic')
    })

    it('should handle unknown values with fallback', () => {
      // @ts-expect-error Testing invalid input
      expect(normalizeSeverity('invalid')).toBe('moderate')
      expect(console.warn).toHaveBeenCalledWith('[normalize] Unknown severity value: invalid, falling back to \'moderate\'')
    })
  })

  describe('normalizeHumanImpact', () => {
    it('should pass through valid human impact values unchanged', () => {
      expect(normalizeHumanImpact('none')).toBe('none')
      expect(normalizeHumanImpact('limited')).toBe('limited')
      expect(normalizeHumanImpact('significant')).toBe('significant')
      expect(normalizeHumanImpact('mass_casualty')).toBe('mass_casualty')
    })

    it('should handle unknown values with fallback', () => {
      // @ts-expect-error Testing invalid input
      expect(normalizeHumanImpact('invalid')).toBe('none')
      expect(console.warn).toHaveBeenCalledWith('[normalize] Unknown human_impact value: invalid, falling back to \'none\'')
    })
  })

  describe('normalizeTimeSensitivity', () => {
    it('should pass through valid time sensitivity values unchanged', () => {
      expect(normalizeTimeSensitivity('long_term')).toBe('long_term')
      expect(normalizeTimeSensitivity('short_term')).toBe('short_term')
      expect(normalizeTimeSensitivity('immediate')).toBe('immediate')
      expect(normalizeTimeSensitivity('critical')).toBe('critical')
    })

    it('should handle unknown values with fallback', () => {
      // @ts-expect-error Testing invalid input
      expect(normalizeTimeSensitivity('invalid')).toBe('long_term')
      expect(console.warn).toHaveBeenCalledWith('[normalize] Unknown time_sensitivity value: invalid, falling back to \'long_term\'')
    })
  })

  describe('normalizeRiskScoring', () => {
    it('should normalize a complete risk scoring object', () => {
      const riskScoring = {
        scope: 'individual' as const,
        severity: 'major' as const,
        human_impact: 'significant' as const,
        time_sensitivity: 'immediate' as const,
      }

      const result = normalizeRiskScoring(riskScoring)

      expect(result).toEqual({
        scope: 'single',
        severity: 'major',
        human_impact: 'significant',
        time_sensitivity: 'immediate',
      })
    })

    it('should handle mixed valid and invalid values', () => {
      const riskScoring = {
        scope: 'individual' as any,
        severity: 'invalid' as any,
        human_impact: 'limited' as any,
        time_sensitivity: 'bad' as any,
      }

      const result = normalizeRiskScoring(riskScoring)

      expect(result).toEqual({
        scope: 'single',
        severity: 'moderate', // fallback
        human_impact: 'limited',
        time_sensitivity: 'long_term', // fallback
      })

      expect(console.warn).toHaveBeenCalledTimes(2)
    })

    it('should preserve valid non-individual scope values', () => {
      const riskScoring = {
        scope: 'organization' as const,
        severity: 'catastrophic' as const,
        human_impact: 'mass_casualty' as const,
        time_sensitivity: 'critical' as const,
      }

      const result = normalizeRiskScoring(riskScoring)

      expect(result).toEqual({
        scope: 'organization',
        severity: 'catastrophic',
        human_impact: 'mass_casualty',
        time_sensitivity: 'critical',
      })
    })
  })

  describe('Type Guards', () => {
    describe('isValidScope', () => {
      it('should return true for valid scope values', () => {
        expect(isValidScope('single')).toBe(true)
        expect(isValidScope('team')).toBe(true)
        expect(isValidScope('organization')).toBe(true)
        expect(isValidScope('national')).toBe(true)
        expect(isValidScope('global')).toBe(true)
      })

      it('should return false for invalid values', () => {
        expect(isValidScope('individual')).toBe(false)
        expect(isValidScope('invalid')).toBe(false)
        expect(isValidScope(null)).toBe(false)
        expect(isValidScope(undefined)).toBe(false)
        expect(isValidScope(123)).toBe(false)
      })
    })

    describe('isValidSeverity', () => {
      it('should return true for valid severity values', () => {
        expect(isValidSeverity('minor')).toBe(true)
        expect(isValidSeverity('moderate')).toBe(true)
        expect(isValidSeverity('major')).toBe(true)
        expect(isValidSeverity('catastrophic')).toBe(true)
      })

      it('should return false for invalid values', () => {
        expect(isValidSeverity('invalid')).toBe(false)
        expect(isValidSeverity(null)).toBe(false)
        expect(isValidSeverity(undefined)).toBe(false)
        expect(isValidSeverity(123)).toBe(false)
      })
    })

    describe('isValidHumanImpact', () => {
      it('should return true for valid human impact values', () => {
        expect(isValidHumanImpact('none')).toBe(true)
        expect(isValidHumanImpact('limited')).toBe(true)
        expect(isValidHumanImpact('significant')).toBe(true)
        expect(isValidHumanImpact('mass_casualty')).toBe(true)
      })

      it('should return false for invalid values', () => {
        expect(isValidHumanImpact('invalid')).toBe(false)
        expect(isValidHumanImpact(null)).toBe(false)
        expect(isValidHumanImpact(undefined)).toBe(false)
        expect(isValidHumanImpact(123)).toBe(false)
      })
    })

    describe('isValidTimeSensitivity', () => {
      it('should return true for valid time sensitivity values', () => {
        expect(isValidTimeSensitivity('long_term')).toBe(true)
        expect(isValidTimeSensitivity('short_term')).toBe(true)
        expect(isValidTimeSensitivity('immediate')).toBe(true)
        expect(isValidTimeSensitivity('critical')).toBe(true)
      })

      it('should return false for invalid values', () => {
        expect(isValidTimeSensitivity('invalid')).toBe(false)
        expect(isValidTimeSensitivity(null)).toBe(false)
        expect(isValidTimeSensitivity(undefined)).toBe(false)
        expect(isValidTimeSensitivity(123)).toBe(false)
      })
    })
  })

  describe('Integration with Evaluator Types', () => {
    it('should produce types that match evaluator expectations', () => {
      const riskScoring = {
        scope: 'individual' as const,
        severity: 'major' as const,
        human_impact: 'significant' as const,
        time_sensitivity: 'immediate' as const,
      }

      const result = normalizeRiskScoring(riskScoring)

      // Type assertions to ensure the result matches evaluator types
      const scope: Scope = result.scope
      const severity: Severity = result.severity
      const humanImpact: HumanImpact = result.human_impact
      const timeSensitivity: TimeSensitivity = result.time_sensitivity

      expect(scope).toBe('single')
      expect(severity).toBe('major')
      expect(humanImpact).toBe('significant')
      expect(timeSensitivity).toBe('immediate')
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty string inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(normalizeScope('')).toBe('single')
      // @ts-expect-error Testing invalid input
      expect(normalizeSeverity('')).toBe('moderate')
      // @ts-expect-error Testing invalid input
      expect(normalizeHumanImpact('')).toBe('none')
      // @ts-expect-error Testing invalid input
      expect(normalizeTimeSensitivity('')).toBe('long_term')

      expect(console.warn).toHaveBeenCalledTimes(4)
    })

    it('should handle case sensitivity issues', () => {
      // Note: The normalizer is case-sensitive by design for strict validation
      // @ts-expect-error Testing invalid input
      expect(normalizeScope('Individual')).toBe('single') // fallback due to case mismatch
      // @ts-expect-error Testing invalid input
      expect(normalizeSeverity('MAJOR')).toBe('moderate') // fallback due to case mismatch

      expect(console.warn).toHaveBeenCalledTimes(2)
    })

    it('should handle whitespace and special characters', () => {
      // @ts-expect-error Testing invalid input
      expect(normalizeScope(' individual ')).toBe('single') // fallback due to whitespace
      // @ts-expect-error Testing invalid input
      expect(normalizeScope('individual\n')).toBe('single') // fallback due to newline

      expect(console.warn).toHaveBeenCalledTimes(2)
    })

    it('should not mutate input objects', () => {
      const originalRiskScoring = {
        scope: 'individual' as const,
        severity: 'major' as const,
        human_impact: 'significant' as const,
        time_sensitivity: 'immediate' as const,
      }

      const original = { ...originalRiskScoring }
      const result = normalizeRiskScoring(originalRiskScoring)

      // Verify original is unchanged
      expect(originalRiskScoring).toEqual(original)

      // Verify result is different (normalized)
      expect(result.scope).toBe('single')
      expect(originalRiskScoring.scope).toBe('individual')
    })
  })
})