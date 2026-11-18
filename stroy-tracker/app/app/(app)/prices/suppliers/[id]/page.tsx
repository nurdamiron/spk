import { notFound } from 'next/navigation'
import { admin } from '@/lib/supabase/admin'
import { type PRecord, type Supplier } from '@/lib/prices'
import { SupplierView } from '../../parts'

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = admin()
  const { data } = await db.from('price_suppliers').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const { data: recs } = await db.from('price_records').select('*').eq('supplier_id', id).order('position_key').order('cls')
  const records = (recs ?? []) as PRecord[]
  const keys = Array.from(new Set(records.map(r => r.pid)))
  const { data: poss } = keys.length ? await db.from('price_positions').select('pid, name, base_unit').in('pid', keys) : { data: [] }
  const pos = new Map((poss ?? []).map(p => [p.pid as string, { name: p.name as string, base_unit: (p.base_unit as string | null) ?? null }]))
  return <SupplierView s={data as Supplier} records={records} pos={pos} />
}
