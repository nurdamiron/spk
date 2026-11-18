import 'server-only'
import { getProfile } from '@/lib/session'
import { dbFor } from '@/lib/supabase/scope'

/** База для текущего пользователя: демо-посетитель видит учебные данные, остальные боевые. */
export async function db() {
  return dbFor(await getProfile())
}
