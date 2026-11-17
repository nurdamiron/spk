import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { requireProfile, homeFor } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { loadObject } from '@/lib/data'
import { calcObject, pct, short } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { objectStatus } from '@/lib/status'
import { SigIcon, Add } from '@/components/Icons'

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
  const profit = tot.osv - tot.spent

  return (
    <>
      <h1>Объекты</h1>

      {cards.length > 0 && (
        <section className="card hero">
          <div className="l">Прибыль по всем объектам сейчас</div>
          <div className={'big ' + (profit < 0 ? 'tc-bad' : 'tc-ok')}>{short(profit)}</div>
          <div className="stats two">
            <div><div className="l">Освоено</div><div className="n">{short(tot.osv)}</div></div>
            <div><div className="l">Потрачено</div><div className="n">{short(tot.spent)}</div></div>
          </div>
        </section>
      )}

      {cards.map(({ o, c }) => {
        const [k, label] = objectStatus(c)
        const alerts = c.sigs.filter(s => s.kind !== 'info')
        return (
          <Link key={o.id} href={`/objects/${o.id}`} className="card ocard">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <b className="otitle">{o.name}</b>
                <div className="mut">{o.customer ?? 'Без заказчика'} · договор {short(c.contract)}</div>
              </div>
              <span className={'pill ' + k}>{label}</span>
              <ChevronRight size={20} className="chev" aria-hidden="true" />
            </div>
            <div className="ofig">
              <div>
                <div className="l">Прибыль сейчас</div>
                <div className={'mid ' + (c.profit < 0 ? 'tc-bad' : 'tc-ok')}>{short(c.profit)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="l">Маржа</div>
                <div className="mid">{pct(c.margin)} <span className="mut" style={{ fontSize: 14, fontWeight: 500 }}>из {pct(c.planMargin)}</span></div>
              </div>
            </div>
            <div className="meter"><i style={{ width: Math.min(100, c.ready * 100) + '%' }} /></div>
            <div className="meterlbl"><span>Выполнено {pct(c.ready)}</span><span>{short(c.osv)} из {short(c.contract)}</span></div>
            {alerts.slice(0, 2).map((s, i) => (
              <div key={i} className={'sig ' + s.kind} style={{ marginTop: 10, marginBottom: 0 }}><SigIcon kind={s.kind} /><span>{s.text}</span></div>
            ))}
          </Link>
        )
      })}

      {!cards.length && (
        <div className="card">
          <h2>Начните с первого объекта</h2>
          <p className="mut" style={{ marginTop: 0 }}>Загрузите КП из Excel, и объект появится здесь.</p>
        </div>
      )}
      <Link href="/objects/new" className="btn big"><Add /> Новый объект из КП</Link>
    </>
  )
}
