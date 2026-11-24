import { ChevronDown } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { db as getDb } from '@/lib/db'
import { imprestFor } from '@/lib/data'
import { money, RATE_LABEL, short } from '@/lib/calc'
import { addImprest, addPayout } from '../actions'
import './money.css'

export default async function MoneyPage() {
  await requireProfile(['owner', 'cashier'])
  const db = await getDb()
  const [foremen, crews, labor, payouts, objects] = await Promise.all([
    db.from('profiles').select('id, name').eq('role', 'foreman').eq('active', true).order('name'),
    db.from('crews').select('id, name, rate_type, rate, object_id').order('name'),
    db.from('labor_entries').select('crew_id, amount'),
    db.from('payouts').select('crew_id, amount'),
    db.from('objects').select('id, name'),
  ])
  const sum = (rows: { crew_id: string; amount: number }[] | null) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.crew_id, (m.get(r.crew_id) ?? 0) + Number(r.amount))
    return m
  }
  const acc = sum(labor.data)
  const paid = sum(payouts.data)
  const objName = new Map((objects.data ?? []).map(o => [o.id, o.name.split(' · ')[0]]))
  const imprests = await Promise.all((foremen.data ?? []).map(async f => ({ f, i: await imprestFor(f.id) })))

  const crewRows = (crews.data ?? []).map(c => ({ c, a: acc.get(c.id) ?? 0, p: paid.get(c.id) ?? 0 }))
  const owed = crewRows.reduce((t, r) => t + Math.max(0, r.a - r.p), 0)
  const onHands = imprests.reduce((t, x) => t + x.i.left, 0)

  return (
    <div className="mny">
      <h1>Деньги</h1>

      <div className="duo">
        <div><span>Бригадам должны</span><b>{short(owed)}</b></div>
        <div><span>У прорабов на руках</span><b>{short(onHands)}</b></div>
      </div>

      <div className="sec"><h2>Бригады</h2></div>
      <div className="list">
        {crewRows.map(({ c, a, p }) => {
          const debt = a - p
          return (
            <details key={c.id} className="mr">
              <summary>
                <span className="mr-name"><b>{c.name}</b><small>{objName.get(c.object_id)} · {RATE_LABEL[c.rate_type]}</small></span>
                <span className="mr-val"><b className={debt < 0 ? 'tc-bad' : ''}>{short(Math.abs(debt))}</b><small>{debt < 0 ? 'переплата' : 'долг'}</small></span>
                <ChevronDown size={18} className="mr-chev" aria-hidden="true" />
              </summary>
              <div className="mr-body">
                <dl className="kv2"><dt>Начислено</dt><dd>{money(a)}</dd><dt>Выдано</dt><dd>{money(p)}</dd></dl>
                <form action={addPayout} className="pay">
                  <input type="hidden" name="crew_id" value={c.id} />
                  <input type="number" name="amount" inputMode="numeric" placeholder="Сумма ₸" min={1} required />
                  <button className="btn pri">Выдать</button>
                </form>
              </div>
            </details>
          )
        })}
        {!crewRows.length && <p className="empty-hint">Бригад пока нет. Их добавляют на странице объекта.</p>}
      </div>

      <div className="sec"><h2>Подотчёт прорабов</h2></div>
      <div className="list">
        {imprests.map(({ f, i }) => (
          <details key={f.id} className="mr">
            <summary>
              <span className="mr-name"><b>{f.name}</b>{i.noReceipt > 0 && <small className="tc-bad">без чеков {short(i.noReceipt)}</small>}</span>
              <span className="mr-val"><b>{short(i.left)}</b><small>на руках</small></span>
              <ChevronDown size={18} className="mr-chev" aria-hidden="true" />
            </summary>
            <div className="mr-body">
              <dl className="kv2"><dt>Выдано</dt><dd>{money(i.issued)}</dd><dt>Возвращено</dt><dd>{money(i.back)}</dd><dt>Потрачено</dt><dd>{money(i.spent)}</dd></dl>
              <form action={addImprest} className="pay">
                <input type="hidden" name="holder_id" value={f.id} />
                <input type="number" name="amount" inputMode="numeric" placeholder="Сумма ₸" min={1} required />
                <input type="text" name="comment" placeholder="Комментарий" />
                <button className="btn pri" name="kind" value="issue">Выдать</button>
                <button className="btn" name="kind" value="return">Вернул</button>
              </form>
            </div>
          </details>
        ))}
        {!imprests.length && <p className="empty-hint">Прорабов пока нет. Добавьте их на вкладке «Команда».</p>}
      </div>
    </div>
  )
}
