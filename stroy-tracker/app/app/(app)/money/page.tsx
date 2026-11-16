import { requireProfile } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { imprestFor } from '@/lib/data'
import { money, RATE_LABEL, short } from '@/lib/calc'
import { addImprest, addPayout } from '../actions'

export default async function MoneyPage() {
  await requireProfile(['owner', 'cashier'])
  const db = admin()
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

  return (
    <>
      <h1>Бригады и деньги</h1>

      <div className="card">
        <h2>Подотчёт прорабов</h2>
        {imprests.map(({ f, i }) => (
          <div key={f.id} className="line">
            <div className="row"><b className="grow">{f.name}</b><span className="pill info">на руках {money(i.left)}</span></div>
            <div className="mut">Выдано {short(i.issued)} · возвращено {short(i.back)} · потрачено {short(i.spent)}{i.noReceipt > 0 && <span className="tc-bad"> · без чеков {short(i.noReceipt)}</span>}</div>
            <form action={addImprest} className="row" style={{ marginTop: 8 }}>
              <input type="hidden" name="holder_id" value={f.id} />
              <input type="number" name="amount" inputMode="numeric" placeholder="Сумма ₸" min={1} required />
              <input type="text" name="comment" className="grow" placeholder="Комментарий" />
              <button className="btn" name="kind" value="issue">Выдать</button>
              <button className="btn" name="kind" value="return">Вернул</button>
            </form>
          </div>
        ))}
        {!imprests.length && <p className="mut">Прорабов пока нет. Добавьте их на вкладке «Команда».</p>}
      </div>

      <div className="card">
        <h2>Баланс по бригадам</h2>
        {(crews.data ?? []).map(c => {
          const a = acc.get(c.id) ?? 0
          const p = paid.get(c.id) ?? 0
          const debt = a - p
          return (
            <div key={c.id} className="line">
              <div className="row"><b className="grow">{c.name}</b><span className={'pill ' + (debt < 0 ? 'bad' : 'ok')}>{debt < 0 ? 'переплата ' : 'долг '}{short(Math.abs(debt))}</span></div>
              <div className="mut">{objName.get(c.object_id)} · {RATE_LABEL[c.rate_type]} · начислено {short(a)} · выдано {short(p)}</div>
              <form action={addPayout} className="row" style={{ marginTop: 8 }}>
                <input type="hidden" name="crew_id" value={c.id} />
                <input type="number" name="amount" inputMode="numeric" placeholder="Сумма ₸" min={1} required />
                <button className="btn">Выдать</button>
              </form>
            </div>
          )
        })}
        {!(crews.data ?? []).length && <p className="mut">Бригад пока нет. Их добавляют на странице объекта.</p>}
      </div>
    </>
  )
}
