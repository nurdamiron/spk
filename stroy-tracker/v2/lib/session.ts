import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { authClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'
import { dbFor } from '@/lib/supabase/scope'
import { DEMO_COOKIE, DEMO_ENABLED, DEMO_IDS, DEMO_NAMES, isDemoRole } from '@/lib/demo'

export type Role = 'owner' | 'foreman' | 'cashier'
export type Profile = { id: string; name: string; login: string; role: Role; active: boolean; demo?: boolean }

export const getProfile = cache(async (): Promise<Profile | null> => {
  const s = await authClient()
  const { data } = await s.auth.getUser()
  if (!data.user) {
    // демо-вход: без пароля, учебные данные (схема demo)
    if (DEMO_ENABLED) {
      const role = (await cookies()).get(DEMO_COOKIE)?.value
      if (isDemoRole(role)) return { id: DEMO_IDS[role], name: DEMO_NAMES[role], login: 'demo', role, active: true, demo: true }
    }
    return null
  }
  const { data: p } = await admin().from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  return (p as Profile | null) ?? null
})

/** Пускает только вошедших и активных. Если указаны роли, то только их. */
export async function requireProfile(roles?: Role[]): Promise<Profile> {
  const p = await getProfile()
  if (!p || !p.active) redirect('/login')
  if (roles && !roles.includes(p.role)) redirect(homeFor(p.role))
  return p
}

export const homeFor = (r: Role) => (r === 'owner' ? '/' : r === 'foreman' ? '/report' : '/money')

/** Ids объектов, к которым есть доступ. Владелец видит все. */
export async function objectIdsFor(p: Profile): Promise<string[]> {
  const db = dbFor(p)
  if (p.role === 'owner') {
    const { data } = await db.from('objects').select('id').neq('status', 'archived')
    return (data ?? []).map(x => x.id)
  }
  const { data } = await db.from('object_members').select('object_id').eq('user_id', p.id)
  return (data ?? []).map(x => x.object_id)
}

export async function canSeeObject(p: Profile, objectId: string): Promise<boolean> {
  return (await objectIdsFor(p)).includes(objectId)
}
