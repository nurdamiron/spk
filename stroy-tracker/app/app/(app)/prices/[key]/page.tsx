import { notFound } from 'next/navigation'
import { admin } from '@/lib/supabase/admin'
import { type PRecord, type Position, type Supplier } from '@/lib/prices'
import { PositionView } from '../parts'

export default async function PositionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const db = admin()
  const { data: pos } = await db.from('price_positions').select('*').eq('key', key).maybeSingle()
  if (!pos) notFound()
  const p = pos as Position
  const { data: recs } = await db.from('price_records').select('*').eq('pid', p.pid).order('cls').order('ex_vat')
  const records = (recs ?? []) as PRecord[]
  const ids = Array.from(new Set(records.map(r => r.supplier_id)))
  const { data: sups } = ids.length ? await db.from('price_suppliers').select('*').in('id', ids) : { data: [] }
  const sm = new Map(((sups ?? []) as Supplier[]).map(s => [s.id, s]))
  return <PositionView p={p} records={records} sups={sm} />
}
