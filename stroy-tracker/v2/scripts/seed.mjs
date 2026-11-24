// Первый запуск: создаёт владельца и закрытое хранилище для фото.
// node scripts/seed.mjs "Ваше имя" "пароль не короче 6 символов"
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const [name, password] = process.argv.slice(2)
// те же правила, что в lib/config.ts
const login = (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
if (login.length < 2 || login.length > 40 || !password || password.length < 6) {
  console.error('Нужно: имя (от 2 букв) и пароль не короче 6 символов')
  process.exit(1)
}
const email = `${createHash('sha256').update(login).digest('hex').slice(0, 32)}@users.stroytracker.app`

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const b = await db.storage.createBucket('photos', { public: false, fileSizeLimit: 4_000_000, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] })
console.log(b.error && !/exists/i.test(b.error.message) ? 'Хранилище: ' + b.error.message : 'Хранилище фото готово')

const u = await db.auth.admin.createUser({ email, password, email_confirm: true })
if (u.error) { console.error('Аккаунт: ' + u.error.message); process.exit(1) }
const p = await db.from('profiles').insert({ id: u.data.user.id, name: name.trim(), login, role: 'owner' })
if (p.error) { console.error('Профиль: ' + p.error.message); process.exit(1) }
console.log(`Владелец создан. Вход по имени: ${name.trim()}`)
