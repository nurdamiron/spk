import { requireProfile } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { dshort } from '@/lib/calc'

export default async function HistoryPage() {
  const p = await requireProfile(['foreman', 'owner'])
  const { data } = await admin()
    .from('reports')
    .select('id, report_date, backdated, objects(name), progress_entries(qty, kp_items(name, unit)), labor_entries(id), expenses(id), report_photos(id)')
    .eq('author_id', p.id)
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <>
      <h1>Мои отчёты</h1>
      {(data ?? []).map((r: any) => (
        <div key={r.id} className="card">
          <div className="row">
            <b className="grow">{dshort(r.report_date)} · {r.objects?.name}</b>
            <span className={'pill ' + (r.backdated ? 'warn' : 'ok')}>{r.backdated ? 'задним числом' : 'отправлен'}</span>
          </div>
          {r.progress_entries.map((x: any, i: number) => <div key={i}>• {x.kp_items?.name}: {Number(x.qty)} {x.kp_items?.unit}</div>)}
          {!r.progress_entries.length && <div className="mut">Выполнения нет</div>}
          <div className="mut">Людей: {r.labor_entries.length} · расходов: {r.expenses.length} · фото: {r.report_photos.length}</div>
        </div>
      ))}
      {!data?.length && <div className="card"><h2>Отчётов пока нет</h2><p className="mut">Первый отчёт вы отправите на вкладке «Отчёт».</p></div>}
    </>
  )
}
