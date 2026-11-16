import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireProfile, homeFor } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { loadObject } from '@/lib/data'
import { calcObject, pct, short } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { objectStatus } from '@/lib/status'

export default async function Home() {
  const p = await requireProfile()
  if (p.role !== 'owner') redirect(homeFor(p.role))

  const { data: objs } = await admin().from('objects').select('id, name, customer').neq('status', 'archived').order('created_at')
  const today = todayAlmaty()
  const cards = await Promise.all(
    (objs ?? []).map(async o => {
      const d = await loadObject(o.id)
      return { o, c: calcObject(d.items, d.crews, d.reps, today) }
    })
  )
  const tot = cards.reduce((a, x) => ({ osv: a.osv + x.c.osv, spent: a.spent + x.c.spent }), { osv: 0, spent: 0 })

  return (
    <>
      <h1>Все объекты</h1>
      <div className="grid" style={{ marginBottom: 12 }}>
        <div className="kpi card" style={{ margin: 0 }}><div className="l">Освоено по всем</div><div className="v">{short(tot.osv)}</div></div>
        <div className="kpi card" style={{ margin: 0 }}><div className="l">Потрачено по всем</div><div className="v">{short(tot.spent)}</div></div>
        <div className="kpi card" style={{ margin: 0 }}><div className="l">Прибыль сейчас</div><div className={'v ' + (tot.osv - tot.spent < 0 ? 'tc-bad' : 'tc-ok')}>{short(tot.osv - tot.spent)}</div></div>
      </div>

      {cards.map(({ o, c }) => {
        const [k, label] = objectStatus(c)
        return (
          <Link key={o.id} href={`/objects/${o.id}`} className="card ocard">
            <div className="row"><b className="grow">{o.name}</b><span className={'pill ' + k}>{label}</span></div>
            <div className="mut">{o.customer} · договор {short(c.contract)} без НДС</div>
            <div className="bar" style={{ margin: '8px 0' }}><i style={{ width: Math.min(100, c.ready * 100) + '%' }} /></div>
            <div className="grid">
              <div className="kpi"><div className="l">Освоено ({pct(c.ready)})</div><div className="v">{short(c.osv)}</div></div>
              <div className="kpi"><div className="l">Потрачено</div><div className="v">{short(c.spent)}</div></div>
              <div className="kpi"><div className="l">Прибыль сейчас</div><div className={'v ' + (c.profit < 0 ? 'tc-bad' : 'tc-ok')}>{short(c.profit)}</div></div>
              <div className="kpi"><div className="l">Маржа факт / план</div><div className="v">{pct(c.margin)} <span className="mut">/ {pct(c.planMargin)}</span></div></div>
            </div>
            {c.sigs.filter(s => s.kind !== 'info').slice(0, 2).map((s, i) => (
              <div key={i} className={'sig ' + s.kind}>{s.kind === 'bad' ? '●' : '▲'} {s.text}</div>
            ))}
          </Link>
        )
      })}

      {!cards.length && (
        <div className="card">
          <h2>Начните с первого объекта</h2>
          <p className="mut">Загрузите КП из Excel, и объект появится здесь.</p>
        </div>
      )}
      <Link href="/objects/new" className="btn big" style={{ textAlign: 'center' }}>+ Новый объект из КП</Link>
    </>
  )
}
