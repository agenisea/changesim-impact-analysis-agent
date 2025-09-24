/**
 * ChangeSim application constants
 */

// LLM prompt version for tracking prompt iterations
export const PROMPT_VERSION = 'v0.3'

// Default process identifier for run logging
export const PROCESS_NAME = 'changesim_impact_analysis_v1'

// Model configuration
export const MODEL = 'gpt-4o-mini'
export const TEMPERATURE = 0.2
export const MAX_OUTPUT_TOKENS = 1500

// Cache status constants for headers and meta consistency
export const CACHE_STATUS = {
  HIT: 'hit',
  RACE: 'race',
  MISS: 'miss',
  NEW_SESSION: 'session'
} as const

export type CacheStatus = typeof CACHE_STATUS[keyof typeof CACHE_STATUS]

// Analysis status constants for UI and API consistency
export const ANALYSIS_STATUS = {
  COMPLETE: 'complete',
  PENDING: 'pending',
  ERROR: 'error'
} as const

export type AnalysisStatus = typeof ANALYSIS_STATUS[keyof typeof ANALYSIS_STATUS]