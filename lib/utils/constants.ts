/**
 * ChangeSim application constants
 */

// LLM prompt version for tracking prompt iterations
export const PROMPT_VERSION = 'v0.1'

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

// Embedding configuration constants
export const EMBEDDING_CONFIG = {
  BATCH_SIZE: 10,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 500
} as const

// Composite chunk types for semantic organization
export const COMPOSITE_CHUNK_TYPES = {
  ROLE_CHANGE_CONTEXT: 'role_change_context',
  CONTEXT_ANALYSIS: 'context_analysis',
  CHANGE_RISKS: 'change_risks',
  SOURCES: 'sources'
} as const

export type CompositeChunkType = typeof COMPOSITE_CHUNK_TYPES[keyof typeof COMPOSITE_CHUNK_TYPES]