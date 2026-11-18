import { admin } from '@/lib/supabase/admin'
import { type Supplier } from '@/lib/prices'
import { SuppliersView } from '../parts'

const PAGE = 30
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const clean = (s: string) => s.replace(/[%_,()*]/g, ' ').trim().slice(0, 60)

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const q = clean(str(sp.q))
  const f = str(sp.f)
  const page = Math.max(1, Number(str(sp.p)) || 1)
  const db = admin()
  let qb = db.from('price_suppliers').select('*', { count: 'exact' }).order('n_records', { ascending: false }).order('name').range((page - 1) * PAGE, page * PAGE - 1)
  if (q) qb = qb.or(`name.ilike.%${q}%,city.ilike.%${q}%,grp.ilike.%${q}%`)
  if (f === 'tel') qb = qb.eq('contact_status', 'есть телефон/e-mail')
  if (f === 'maker') qb = qb.or('type.ilike.%производител%,type.ilike.%оптов%,type.ilike.%дилер%')
  if (f === 'nocontact') qb = qb.neq('contact_status', 'есть телефон/e-mail')
  const { data, count } = await qb
  return <SuppliersView rows={(data ?? []) as Supplier[]} total={count ?? 0} page={page} pages={Math.max(1, Math.ceil((count ?? 0) / PAGE))} q={q} f={f} />
}
