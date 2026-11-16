import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/session'
import { loadObject, signPhotos } from '@/lib/data'
import { calcObject, crewBalance, dshort, expCost, money, pct, RATE_LABEL, short } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { marginClass, objectStatus } from '@/lib/status'
import { Chart } from '@/components/Chart'
import { addCrew } from '../../actions'

export default async function ObjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile(['owner'])
  const { id } = await params
  const d = await loadObject(id)
  if (!d.obj) notFound()

  const c = calcObject(d.items, d.crews, d.reps, todayAlmaty())
  const [k, label] = objectStatus(c)
  const photos = await signPhotos(d.reps.flatMap(r => r.photos ?? []))
  const itemName = new Map(d.items.map(i => [i.id, i]))
  const crewName = new Map(d.crews.map(x => [x.id, x.name]))

  return (
    <>
      <div className="row"><Link href="/" className="btn">← Объекты</Link><span className="sp" /><span className={'pill ' + k}>{label}</span></div>
      <h1>{d.obj.name}</h1>
      <div className="mut">{d.obj.customer} · договор {money(c.contract)} без НДС</div>
      <div style={{ height: 10 }} />
      {c.sigs.map((s, i) => <div key={i} className={'sig ' + s.kind}>{s.kind === 'bad' ? '●' : s.kind === 'warn' ? '▲' : 'ℹ'} {s.text}</div>)}

      <div className="grid card">
        <div className="kpi"><div className="l">Освоено</div><div className="v">{short(c.osv)}</div><div className="mut">{pct(c.ready)} договора</div></div>
        <div className="kpi"><div className="l">Потрачено</div><div className="v">{short(c.spent)}</div></div>
        <div className="kpi"><div className="l">Прибыль сейчас</div><div className={'v ' + (c.profit < 0 ? 'tc-bad' : 'tc-ok')}>{short(c.profit)}</div><div className="mut">маржа {pct(c.margin)}</div></div>
        <div className="kpi"><div className="l">Прогноз прибыли</div><div className={'v ' + (c.fcProfit < 0 ? 'tc-bad' : 'tc-ok')}>{short(c.fcProfit)}</div><div className="mut">маржа {pct(c.fcMargin)} (план {pct(c.planMargin)})</div></div>
        <div className="kpi"><div className="l">Прогноз завершения</div><div className="v">{c.finishDate ? c.finishDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}</div><div className="mut">по темпу 6 дней</div></div>
      </div>

      <div className="card"><h2>Освоено и потрачено по дням</h2><Chart series={c.series} /></div>

      <div className="card">
        <h2>Позиции КП</h2>
        <div className="scroll">
          <table className="cards">
            <tbody>
              <tr><th>Позиция</th><th>Готово</th><th>Освоено</th><th>План с/с</th><th>Факт с/с</th><th>Маржа</th><th>План</th></tr>
              {c.rows.map(r => (
                <tr key={r.id}>
                  <td>{r.name}<div className="mut">{r.q} из {r.qty} {r.unit}</div></td>
                  <td data-l="Готово">{pct(r.ready)}</td>
                  <td data-l="Освоено">{short(r.osv)}</td>
                  <td data-l="Плановая себестоимость">{short(r.planDone)}</td>
                  <td data-l="Фактическая себестоимость">{short(r.fact)}</td>
                  <td data-l="Маржа" className={marginClass(r.margin)}>{r.margin === null ? '—' : pct(r.margin)}</td>
                  <td data-l="Маржа по плану" className="mut">{pct(r.planMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mut" style={{ marginTop: 6 }}>Общие расходы (техника, топливо, поденщики) распределены по позициям пропорционально освоению. Расходы с ЭСФ считаются без НДС.</div>
      </div>

      <div className="card">
        <h2>Бригады на объекте</h2>
        <table className="cards">
          <tbody>
            <tr><th>Кто</th><th>Оплата</th><th>Начислено</th><th>Выдано</th><th>Долг</th></tr>
            {d.crews.map(cr => {
              const b = crewBalance(cr.id, d.reps, d.paidBy.get(cr.id) ?? 0)
              return (
                <tr key={cr.id}>
                  <td>{cr.name}</td>
                  <td data-l="Оплата" className="mut">{RATE_LABEL[cr.rate_type]}, {money(cr.rate)}</td>
                  <td data-l="Начислено">{short(b.acc)}</td>
                  <td data-l="Выдано">{short(b.paid)}</td>
                  <td data-l={b.debt < 0 ? 'Переплата' : 'Долг'} className={b.debt < 0 ? 'tc-bad' : ''}>{short(Math.abs(b.debt))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!d.crews.length && <p className="mut">Бригад пока нет. Добавьте ниже, и прораб увидит их в отчёте.</p>}
        <details>
          <summary><b>+ Добавить бригаду или технику</b></summary>
          <form action={addCrew} style={{ marginTop: 10 }}>
            <input type="hidden" name="object_id" value={id} />
            <label className="field"><span>Название</span><input name="name" type="text" placeholder="Бригада Ерлана" required /></label>
            <label className="field"><span>Как оплачиваем</span>
              <select name="rate_type" defaultValue="day">
                <option value="hour">За час</option><option value="day">За день</option><option value="volume">За объём (метры, кубы)</option><option value="fixed">Фикс за этап</option>
              </select>
            </label>
            <label className="field"><span>Ставка в тенге (за час, день, единицу объёма или весь этап)</span><input name="rate" type="number" inputMode="numeric" min={1} required /></label>
            <label className="field"><span>Позиция КП (для оплаты за объём и фикса)</span>
              <select name="kp_item_id" defaultValue=""><option value="">Без привязки</option>{d.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
            </label>
            <button className="btn pri">Добавить</button>
          </form>
        </details>
      </div>

      <div className="card">
        <h2>Журнал отчётов</h2>
        {d.reps.map(r => {
          const lab = r.labor_entries.reduce((a, l) => a + l.amount, 0)
          const ex = r.expenses.reduce((a, e) => a + expCost(e), 0)
          const osv = r.progress_entries.reduce((a, p) => a + p.qty * (itemName.get(p.kp_item_id)?.price ?? 0), 0)
          return (
            <details key={r.id}>
              <summary>
                <b>{dshort(r.report_date)}</b> · {r.author}{r.backdated && <> <span className="pill warn">задним числом</span></>} · освоено {short(osv)}, потрачено {short(lab + ex)}
              </summary>
              <div className="mut">Выполнение</div>
              {r.progress_entries.map((p, i) => <div key={i}>• {itemName.get(p.kp_item_id)?.name}: {p.qty} {itemName.get(p.kp_item_id)?.unit}</div>)}
              <div className="mut" style={{ marginTop: 6 }}>Люди</div>
              {r.labor_entries.map((l, i) => <div key={i}>• {crewName.get(l.crew_id)}: {money(l.amount)}</div>)}
              <div className="mut" style={{ marginTop: 6 }}>Расходы</div>
              {r.expenses.map((e, i) => (
                <div key={i}>• {e.category}: {money(e.amount)} {e.has_esf ? '(ЭСФ)' : '(без ЭСФ)'} · {e.funding === 'imprest' ? 'подотчёт' : e.funding === 'office' ? 'офис' : 'перечисление'}
                  {!e.has_receipt && <span className="tc-bad"> · без чека</span>}{e.comment ? ' · ' + e.comment : ''}</div>
              ))}
              <div>{(r.photos ?? []).map(path => photos[path] && <a key={path} href={photos[path]} target="_blank" rel="noreferrer" className="photo"><img src={photos[path]} alt="Фото с объекта" /></a>)}</div>
            </details>
          )
        })}
        {!d.reps.length && <p className="mut">Отчётов пока нет.</p>}
      </div>
    </>
  )
}
