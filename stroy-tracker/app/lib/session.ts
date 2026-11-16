import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/supabase/server'
import { admin } from '@/lib/supabase/admin'

export type Role = 'owner' | 'foreman' | 'cashier'
export type Profile = { id: string; name: string; login: string; role: Role; active: boolean }

export const getProfile = cache(async (): Promise<Profile | null> => {
  const s = await authClient()
  const { data } = await s.auth.getUser()
  if (!data.user) return null
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
  const db = admin()
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
