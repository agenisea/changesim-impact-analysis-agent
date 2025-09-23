// lib/supabase-server.ts
// Server-only Supabase client with Service Role key

import { createClient } from '@supabase/supabase-js'

export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY

  if (!url || !key) {
    throw new Error('Supabase environment variables missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false // Server-side client doesn't need auth persistence
    }
  })
}