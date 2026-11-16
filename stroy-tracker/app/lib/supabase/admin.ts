import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Доступ к базе с полными правами. Только на сервере, после проверки роли. */
export function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
