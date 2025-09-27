/**
 * Decision trace bounds management
 *
 * Ensures decision trace arrays stay within schema limits even when
 * system notes are appended, preventing prompt/contract drift.
 */

const MAX_DECISION_TRACE_LENGTH = 5
const MIN_DECISION_TRACE_LENGTH = 3

/**
 * Bounds a decision trace array to the maximum allowed length
 * @param trace - The decision trace array
 * @param maxLength - Maximum allowed length (default: 5)
 * @returns Bounded decision trace array
 */
export function boundDecisionTrace(
  trace: string[],
  maxLength: number = MAX_DECISION_TRACE_LENGTH
): string[] {
  if (trace.length <= maxLength) {
    return trace
  }

  return trace.slice(0, maxLength)
}

/**
 * Safely appends a system note to decision trace while maintaining bounds
 * @param originalTrace - Original decision trace from AI
 * @param systemNote - System note to append
 * @param maxLength - Maximum allowed final length (default: 5)
 * @returns Bounded decision trace with system note
 */
export function appendSystemNoteWithBounds(
  originalTrace: string[],
  systemNote: string,
  maxLength: number = MAX_DECISION_TRACE_LENGTH
): string[] {
  // Reserve space for the system note by keeping maxLength - 1 original items
  const maxOriginalItems = maxLength - 1
  const boundedOriginal = originalTrace.slice(0, maxOriginalItems)

  // Append system note and ensure final bounds
  const result = [...boundedOriginal, systemNote]
  return boundDecisionTrace(result, maxLength)
}

/**
 * Validates that a decision trace meets schema requirements
 * @param trace - Decision trace to validate
 * @returns Validation result
 */
export function validateDecisionTrace(trace: string[]): { valid: boolean; error?: string } {
  if (trace.length < MIN_DECISION_TRACE_LENGTH) {
    return {
      valid: false,
      error: `Decision trace must have at least ${MIN_DECISION_TRACE_LENGTH} items, got ${trace.length}`,
    }
  }

  if (trace.length > MAX_DECISION_TRACE_LENGTH) {
    return {
      valid: false,
      error: `Decision trace must have at most ${MAX_DECISION_TRACE_LENGTH} items, got ${trace.length}`,
    }
  }

  return { valid: true }
}

export { MAX_DECISION_TRACE_LENGTH, MIN_DECISION_TRACE_LENGTH }
