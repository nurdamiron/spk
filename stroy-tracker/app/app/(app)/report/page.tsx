import { requireProfile, objectIdsFor } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { imprestFor } from '@/lib/data'
import { money } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { ReportForm } from './ReportForm'

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const p = await requireProfile(['foreman', 'owner'])
  const ids = await objectIdsFor(p)
  const { o } = await searchParams
  const db = admin()
  const { data: objs } = await db.from('objects').select('id, name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']).order('created_at')

  if (!objs?.length) {
    return (
      <div className="card">
        <h2>Вам пока не назначен объект</h2>
        <p className="mut">Попросите владельца добавить вас на объект, и он появится здесь.</p>
      </div>
    )
  }
  const obj = objs.find(x => x.id === o) ?? objs[0]

  const [items, crews, recent, progress] = await Promise.all([
    db.from('kp_items').select('id, name, unit, qty').eq('object_id', obj.id).order('sort'),
    db.from('crews').select('id, name, rate_type').eq('object_id', obj.id).order('name'),
    db.from('reports').select('id, labor_entries(crew_id)').eq('object_id', obj.id).order('report_date', { ascending: false }).limit(3),
    db.from('progress_entries').select('kp_item_id, qty, reports!inner(object_id)').eq('reports.object_id', obj.id),
  ])
  const done: Record<string, number> = {}
  for (const x of progress.data ?? []) done[x.kp_item_id] = (done[x.kp_item_id] ?? 0) + Number(x.qty)
  const recentCrews = new Set((recent.data ?? []).flatMap((r: any) => (r.labor_entries ?? []).map((l: any) => l.crew_id as string)))
  const imp = await imprestFor(p.id)

  return (
    <>
      <h1>Отчёт за день</h1>
      {objs.length > 1 && (
        <div className="card">
          <div className="mut">Объект</div>
          <div className="row" style={{ marginTop: 6 }}>
            {objs.map(x => <a key={x.id} href={`/report?o=${x.id}`} className={'btn' + (x.id === obj.id ? ' pri' : '')}>{x.name}</a>)}
          </div>
        </div>
      )}
      <ReportForm
        key={obj.id}
        objectId={obj.id}
        objectName={obj.name}
        today={todayAlmaty()}
        imprestLeft={money(imp.left)}
        items={(items.data ?? []).map(i => ({ id: i.id, name: i.name, unit: i.unit, qty: Number(i.qty), done: done[i.id] ?? 0 }))}
        crews={(crews.data ?? []).map(c => ({ id: c.id, name: c.name, type: c.rate_type, on: recentCrews.has(c.id) }))}
      />
    </>
  )
}
