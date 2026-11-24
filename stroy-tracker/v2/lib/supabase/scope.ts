import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { admin } from '@/lib/supabase/admin'

/** Клиент демо-схемы: учебные данные. Права те же серверные, но только на схему demo. */
export function demoAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'demo' },
  })
}

/** Для демо-профиля данные берутся из схемы demo, для обычного из боевой. */
export const dbFor = (p?: { demo?: boolean } | null) => (p?.demo ? demoAdmin() : admin())
