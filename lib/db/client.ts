import { createClient } from '@supabase/supabase-js'

// Build-time placeholder constants
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-key'

// Environment variable validation
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

// Only validate environment variables at runtime, not during build
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL

if (!isBuildTime) {
  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL environment variable is missing. Please add it to your .env.local file.'
    )
  }

  if (!supabaseKey) {
    throw new Error(
      'SUPABASE_KEY environment variable is missing. Please add it to your .env.local file. ' +
      'This should be the service role key for server-side operations only.'
    )
  }
}

// Server-side Supabase client with service key for write operations
// Use placeholder values during build time
export const sb = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseKey || PLACEHOLDER_KEY
)

// Type definitions for database operations (matches actual schema)
export interface ChangeSimImpactAnalysisRunInsert {
  // Direct columns
  process: string // text not null
  role: string
  change_description: string
  context?: string | null  // text column in DB
  analysis_summary: string
  risk_level: string
  risk_factors: string[] // JSONB array
  risk_scoring: Record<string, unknown> // JSONB object
  decision_trace: string[] // JSONB array (not wrapped in object)
  sources: Array<{title: string, url: string}> // JSONB array
  meta: Record<string, unknown> // JSONB object containing model, temperature, etc.
  session_id?: string | null
  input_hash?: string | null
}

