import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_COOKIE, DEMO_ENABLED, isDemoRole } from '@/lib/demo'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/** Обновляет сессию на каждом запросе и отправляет невошедших на страницу входа. */
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const supabase = createServerClient(URL_, KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  const { data } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  // демо-посетитель без пароля: пускаем (данные ему отдаёт только схема demo)
  const demo = DEMO_ENABLED && isDemoRole(req.cookies.get(DEMO_COOKIE)?.value)

  if (!data.user && !demo && path !== '/login') {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Нужно войти' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (data.user && path === '/login') return NextResponse.redirect(new URL('/', req.url))
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|splash/|sw.js|manifest.webmanifest).*)'],
}
