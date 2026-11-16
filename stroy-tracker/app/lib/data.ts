import 'server-only'
import { admin } from '@/lib/supabase/admin'
import type { Crew, Item, Rep } from '@/lib/calc'

const num = (x: unknown) => Number(x ?? 0)

export async function loadObject(objectId: string) {
  const db = admin()
  const [obj, items, crews, reps, payouts] = await Promise.all([
    db.from('objects').select('*').eq('id', objectId).maybeSingle(),
    db.from('kp_items').select('*').eq('object_id', objectId).order('sort'),
    db.from('crews').select('*').eq('object_id', objectId).order('name'),
    db
      .from('reports')
      .select('id, report_date, backdated, created_at, profiles(name), progress_entries(kp_item_id, qty), labor_entries(crew_id, qty, amount), expenses(*), report_photos(path)')
      .eq('object_id', objectId)
      .order('report_date', { ascending: false }),
    db.from('payouts').select('crew_id, amount'),
  ])

  const itemList: Item[] = (items.data ?? []).map(i => ({ id: i.id, name: i.name, unit: i.unit, qty: num(i.qty), price: num(i.price), cost: num(i.cost), sort: i.sort }))
  const crewList: Crew[] = (crews.data ?? []).map(c => ({ id: c.id, name: c.name, rate_type: c.rate_type, rate: num(c.rate), kp_item_id: c.kp_item_id }))
  const repList: Rep[] = (reps.data ?? []).map((r: any) => ({
    id: r.id,
    report_date: r.report_date,
    backdated: r.backdated,
    author: r.profiles?.name,
    progress_entries: (r.progress_entries ?? []).map((p: any) => ({ kp_item_id: p.kp_item_id, qty: num(p.qty) })),
    labor_entries: (r.labor_entries ?? []).map((l: any) => ({ crew_id: l.crew_id, qty: num(l.qty), amount: num(l.amount) })),
    expenses: (r.expenses ?? []).map((e: any) => ({ ...e, amount: num(e.amount) })),
    photos: (r.report_photos ?? []).map((p: any) => p.path),
  }))
  const paidBy = new Map<string, number>()
  for (const p of payouts.data ?? []) paidBy.set(p.crew_id, (paidBy.get(p.crew_id) ?? 0) + num(p.amount))
  return { obj: obj.data, items: itemList, crews: crewList, reps: repList, paidBy }
}

/** Подотчёт одного человека: выдано, потрачено из подотчёта, без чеков, на руках. */
export async function imprestFor(holderId: string) {
  const db = admin()
  const [moves, exp] = await Promise.all([
    db.from('imprest_moves').select('amount, kind').eq('holder_id', holderId),
    db.from('expenses').select('amount, has_receipt, reports!inner(author_id)').eq('funding', 'imprest').eq('reports.author_id', holderId),
  ])
  const issued = (moves.data ?? []).filter(m => m.kind === 'issue').reduce((a, m) => a + num(m.amount), 0)
  const back = (moves.data ?? []).filter(m => m.kind === 'return').reduce((a, m) => a + num(m.amount), 0)
  const spent = (exp.data ?? []).reduce((a, e: any) => a + num(e.amount), 0)
  const noReceipt = (exp.data ?? []).filter((e: any) => !e.has_receipt).reduce((a, e: any) => a + num(e.amount), 0)
  return { issued, back, spent, noReceipt, left: issued - back - spent }
}

/** Подписанные ссылки на фото, действуют час. */
export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await admin().storage.from('photos').createSignedUrls(paths, 3600)
  const out: Record<string, string> = {}
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}
