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
export const MAX_OUTPUT_TOKENS = 2500

export const EMBEDDING_MODEL = 'text-embedding-3-small'

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

export const RAG_CONFIG = {
  MATCH_COUNT: 4,
  MATCH_THRESHOLD: 0.72,
  MIN_RESULTS: 1, // Allow single strong match to provide context
  FALLBACK_SIMILARITY: 0.72, // Use same threshold as Supabase RPC to avoid redundant filtering
} as const

// Composite chunk types for semantic organization
export const COMPOSITE_CHUNK_TYPES = {
  ROLE_CHANGE_CONTEXT: 'role_change_context',
  CONTEXT_ANALYSIS: 'context_analysis',
  CHANGE_RISKS: 'change_risks',
  RISK_ASSESSMENT: 'risk_assessment',
  DECISION_PROCESS: 'decision_process',
  RISK_CONTEXT: 'risk_context',
  SOURCES: 'sources'
} as const

export type CompositeChunkType = typeof COMPOSITE_CHUNK_TYPES[keyof typeof COMPOSITE_CHUNK_TYPES]

// Agent type constants
export const AGENT_TYPE = {
  AGENTIC_RAG: 'agentic-rag',
  SINGLE_AGENT: 'single-agent'
} as const

export type AgentType = typeof AGENT_TYPE[keyof typeof AGENT_TYPE]
