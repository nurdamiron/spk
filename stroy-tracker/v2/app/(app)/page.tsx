import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { requireProfile, homeFor } from '@/lib/session'
import { db as getDb } from '@/lib/db'
import { loadObject } from '@/lib/data'
import { calcObject, pct, short } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { objectStatus } from '@/lib/status'
import { Add } from '@/components/Icons'
import './home.css'

export default async function Home() {
  const p = await requireProfile()
  if (p.role !== 'owner') redirect(homeFor(p.role))

  const { data: objs } = await (await getDb()).from('objects').select('id, name, customer').neq('status', 'archived').order('created_at')
  const today = todayAlmaty()
  const cards = await Promise.all(
    (objs ?? []).map(async o => {
      const d = await loadObject(o.id)
      return { o, c: calcObject(d.items, d.crews, d.reps, today) }
    })
  )
  const profit = cards.reduce((a, x) => a + x.c.osv - x.c.spent, 0)

  return (
    <div className="home">
      <h1>Объекты</h1>

      {cards.length > 1 && (
        <div className="hline">
          <span>Прибыль по всем</span>
          <b className={profit < 0 ? 'tc-bad' : 'tc-ok'}>{short(profit)}</b>
        </div>
      )}

      {cards.map(({ o, c }) => {
        const [k, label] = objectStatus(c)
        const alerts = c.sigs.filter(s => s.kind !== 'info').length
        return (
          <Link key={o.id} href={`/objects/${o.id}`} className="card ocard">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <b className="otitle">{o.name}</b>
                {o.customer && <div className="mut">{o.customer}</div>}
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
                <div className="l">Выполнено</div>
                <div className="mid">{pct(c.ready)}</div>
              </div>
            </div>
            <div className="meter"><i style={{ width: Math.min(100, c.ready * 100) + '%' }} /></div>
            {alerts > 0 && <div className="hn"><TriangleAlert size={16} aria-hidden="true" />Требует внимания: {alerts}</div>}
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
    </div>
  )
}
