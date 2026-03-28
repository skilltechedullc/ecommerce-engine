import { createClient } from '@supabase/supabase-js'

// Browser-safe client: uses static env access so Next.js can inline the values
// at build time. Do NOT use lib/supabase.ts in 'use client' components.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
