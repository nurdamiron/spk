import { admin } from '@/lib/supabase/admin'
import { type Position } from '@/lib/prices'
import { ListView } from './parts'

const PAGE = 30
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const clean = (s: string) => s.replace(/[%_,()*]/g, ' ').trim().slice(0, 60)

export default async function PricesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const q = clean(str(sp.q))
  const g = str(sp.g)
  const st = str(sp.st)
  const page = Math.max(1, Number(str(sp.p)) || 1)
  const db = admin()

  let qb = db.from('price_positions').select('*', { count: 'exact' }).order('pid').range((page - 1) * PAGE, page * PAGE - 1)
  if (g) qb = qb.eq('grp', g)
  if (q) qb = qb.ilike('name', `%${q}%`)
  if (st === 'price') qb = qb.gt('n_records', 0)
  if (st === 'none') qb = qb.eq('n_records', 0)
  if (st === 'ready') qb = qb.eq('status', 'готово')
  if (st === 'partial') qb = qb.like('status', 'частично%')

  const [list, groups, nRec, nSup, nA, meta] = await Promise.all([
    qb,
    db.from('price_positions').select('grp'),
    db.from('price_records').select('id', { count: 'exact', head: true }),
    db.from('price_suppliers').select('id', { count: 'exact', head: true }),
    db.from('price_records').select('id', { count: 'exact', head: true }).eq('cls', 'A'),
    db.from('price_meta').select('built_at').eq('id', 1).maybeSingle(),
  ])
  const gcount = new Map<string, number>()
  for (const r of groups.data ?? []) gcount.set(r.grp, (gcount.get(r.grp) ?? 0) + 1)
  const total = list.count ?? 0

  return (
    <ListView
      rows={(list.data ?? []) as Position[]}
      total={total}
      page={page}
      pages={Math.max(1, Math.ceil(total / PAGE))}
      q={q}
      g={g}
      st={st}
      groups={Array.from(gcount.entries()).sort((a, b) => b[1] - a[1])}
      stats={{ pos: Array.from(gcount.values()).reduce((a, b) => a + b, 0), sup: nSup.count ?? 0, rec: nRec.count ?? 0, a: nA.count ?? 0 }}
      builtAt={meta.data?.built_at ? String(meta.data.built_at) : null}
    />
  )
}
