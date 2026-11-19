import { notFound } from 'next/navigation'
import { admin } from '@/lib/supabase/admin'
import { type PRecord, type Position, type Supplier } from '@/lib/prices'
import { PositionView } from '../parts'

export default async function PositionPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ s?: string }> }) {
  const { key } = await params
  const { s } = await searchParams
  const sort = s === 'fresh' ? 'fresh' : 'price'
  const db = admin()
  const { data: pos } = await db.from('price_positions').select('*').eq('key', key).maybeSingle()
  if (!pos) notFound()
  const p = pos as Position

  // только цены, подтверждённые на странице источника
  let q = db.from('price_records').select('*').eq('pid', p.pid).eq('live', true).not('ex_vat', 'is', null)
  q = sort === 'fresh' ? q.order('price_date', { ascending: false, nullsFirst: false }).order('ex_vat') : q.order('ex_vat')
  const { data: recs } = await q
  const records = (recs ?? []) as PRecord[]
  const ids = Array.from(new Set(records.map(r => r.supplier_id)))
  const { data: sups } = ids.length ? await db.from('price_suppliers').select('*').in('id', ids) : { data: [] }
  const sm = new Map(((sups ?? []) as Supplier[]).map(x => [x.id, x]))
  return <PositionView p={p} records={records} sups={sm} sort={sort} />
}
