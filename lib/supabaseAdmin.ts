import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/server/env'

const supabaseAdmin = createClient(
  env('NEXT_PUBLIC_SUPABASE_URL'),
  env('SUPABASE_SERVICE_ROLE_KEY')
)

export function getSupabaseAdmin() {
  return supabaseAdmin
}
