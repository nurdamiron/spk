// Загружает базу цен в Supabase: node scripts/import_prices.mjs [путь к price_base.json]
// По умолчанию ../../price-base/data/export/price_base.json. Перезаписывает ТОЛЬКО таблицы price_* (в одной транзакции).
import { readFileSync } from 'node:fs'
import pg from 'pg'

const file = process.argv[2] || new URL('../../../price-base/data/export/price_base.json', import.meta.url).pathname
const data = JSON.parse(readFileSync(file, 'utf8'))

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL
if (!url) { console.error('Нет POSTGRES_URL в .env.local'); process.exit(1) }

const c = new pg.Client({ connectionString: url.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } })
await c.connect()
try {
  await c.query('begin')
  await c.query('delete from price_records')
  await c.query('delete from price_suppliers')
  await c.query('delete from price_positions')
  const ins = (table, rows) => c.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`, [JSON.stringify(rows)])
  await ins('price_positions', data.positions)
  await ins('price_suppliers', data.suppliers)
  // записи вставляем пачками по 500
  for (let i = 0; i < data.records.length; i += 500) await ins('price_records', data.records.slice(i, i + 500))
  const counts = { positions: data.positions.length, suppliers: data.suppliers.length, records: data.records.length }
  await c.query(
    `insert into price_meta (id, built_at, counts) values (1, $1, $2::jsonb)
     on conflict (id) do update set built_at = excluded.built_at, imported_at = now(), counts = excluded.counts`,
    [data.built_at, JSON.stringify(counts)])
  await c.query('commit')
  console.log('Импортировано:', counts)
} catch (e) {
  await c.query('rollback')
  console.error('Ошибка, откат:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}
