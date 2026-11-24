'use server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { authClient } from '@/lib/supabase/server'
import { normalizeLogin, loginToEmail } from '@/lib/config'
import { admin } from '@/lib/supabase/admin'
import { homeFor, type Role } from '@/lib/session'
import { DEMO_COOKIE, DEMO_ENABLED, isDemoRole } from '@/lib/demo'

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
  ;(await cookies()).delete(DEMO_COOKIE) // настоящий вход заменяет демо
  redirect(homeFor(p.role as Role))
}

/** Демо без пароля: учебные данные, ничего не сохраняется. Роль выбирает посетитель. */
export async function startDemo(form: FormData) {
  if (!DEMO_ENABLED) redirect('/login')
  const role = String(form.get('role'))
  if (!isDemoRole(role)) redirect('/login')
  ;(await cookies()).set(DEMO_COOKIE, role, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 })
  redirect(homeFor(role))
}

export async function logout() {
  const s = await authClient()
  await s.auth.signOut()
  ;(await cookies()).delete(DEMO_COOKIE)
  redirect('/login')
}
