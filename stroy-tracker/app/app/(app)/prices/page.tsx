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
  const page = Math.max(1, Number(str(sp.p)) || 1)
  const db = admin()

  // сначала товары, по которым есть подтверждённые цены, потом остальные
  let qb = db.from('price_positions').select('*', { count: 'exact' }).order('n_live', { ascending: false }).order('pid').range((page - 1) * PAGE, page * PAGE - 1)
  if (g) qb = qb.eq('grp', g)
  if (q) qb = qb.ilike('name', `%${q}%`)

  const [list, groups] = await Promise.all([qb, db.from('price_positions').select('grp')])
  const gcount = new Map<string, number>()
  for (const r of groups.data ?? []) gcount.set(r.grp, (gcount.get(r.grp) ?? 0) + 1)
  const total = list.count ?? 0

  return <ListView rows={(list.data ?? []) as Position[]} total={total} page={page} pages={Math.max(1, Math.ceil(total / PAGE))} q={q} g={g} groups={Array.from(gcount.entries()).sort((a, b) => b[1] - a[1])} />
}
