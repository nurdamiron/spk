// Применяет схему к базе: node scripts/db.mjs supabase/schema.sql
import { readFileSync } from 'node:fs'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL
if (!url) { console.error('Нет POSTGRES_URL в .env.local'); process.exit(1) }
const sql = readFileSync(process.argv[2], 'utf8')
const c = new pg.Client({ connectionString: url.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } })
await c.connect()
await c.query(sql)
console.log('Схема применена')
await c.end()
