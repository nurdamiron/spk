'use server'
import { redirect } from 'next/navigation'
import { authClient } from '@/lib/supabase/server'
import { normalizeLogin, loginToEmail } from '@/lib/config'
import { admin } from '@/lib/supabase/admin'
import { homeFor, type Role } from '@/lib/session'

export async function login(_: { error: string }, form: FormData): Promise<{ error: string }> {
  const login = normalizeLogin(String(form.get('login') ?? ''))
  const password = String(form.get('password') ?? '')
  if (!login) return { error: 'Введите своё имя' }
  if (!password) return { error: 'Введите пароль' }

  const s = await authClient()
  const { data, error } = await s.auth.signInWithPassword({ email: loginToEmail(login), password })
  if (error || !data.user) return { error: 'Неверное имя или пароль' }

  const { data: p } = await admin().from('profiles').select('role, active').eq('id', data.user.id).maybeSingle()
  if (!p || !p.active) {
    await s.auth.signOut()
    return { error: 'Доступ закрыт. Обратитесь к владельцу' }
  }
  redirect(homeFor(p.role as Role))
}

export async function logout() {
  const s = await authClient()
  await s.auth.signOut()
  redirect('/login')
}
