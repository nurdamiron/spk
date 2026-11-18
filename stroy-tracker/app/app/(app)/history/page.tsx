import { requireProfile } from '@/lib/session'
import { db as getDb } from '@/lib/db'
import { dshort } from '@/lib/calc'

export default async function HistoryPage() {
  const p = await requireProfile(['foreman', 'owner'])
  const { data } = await (await getDb())
    .from('reports')
    .select('id, report_date, backdated, objects(name), progress_entries(qty, kp_items(name, unit)), labor_entries(id), expenses(id), report_photos(id)')
    .eq('author_id', p.id)
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <>
      <h1>Мои отчёты</h1>
      <div className="group">
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="gi">
            <div className="jrow" style={{ alignItems: 'flex-start' }}>
              <span className="jdate">{dshort(r.report_date)}</span>
              <div className="grow">
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <b className="grow">{r.objects?.name}</b>
                  <span className={'pill ' + (r.backdated ? 'warn' : 'ok')}>{r.backdated ? 'задним числом' : 'отправлен'}</span>
                </div>
                {r.progress_entries.map((x: any, i: number) => <div key={i} style={{ marginTop: 4 }}>{x.kp_items?.name}: <b>{Number(x.qty)} {x.kp_items?.unit}</b></div>)}
                {!r.progress_entries.length && <div className="mut">Выполнения нет</div>}
                <div className="mut" style={{ marginTop: 6 }}>Людей: {r.labor_entries.length} · расходов: {r.expenses.length} · фото: {r.report_photos.length}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!data?.length && <div className="card"><h2>Отчётов пока нет</h2><p className="mut">Первый отчёт вы отправите на вкладке «Отчёт».</p></div>}
    </>
  )
}
