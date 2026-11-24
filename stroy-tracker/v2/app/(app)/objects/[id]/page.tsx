import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChartLine, ChevronDown, ClipboardList, TriangleAlert, Users } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { loadObject, signPhotos } from '@/lib/data'
import { calcObject, crewBalance, dshort, expCost, money, pct, RATE_LABEL, short } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { objectStatus } from '@/lib/status'
import { Chart } from '@/components/Chart'
import { Back, SigIcon } from '@/components/Icons'
import { addCrew } from '../../actions'
import './object.css'

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
  const profitCls = c.profit < 0 ? 'tc-bad' : 'tc-ok'

  const attention = c.sigs.filter(x => x.kind !== 'info').length
  const doneRows = c.rows.filter(r => r.q > 0)

  return (
    <div className="ob">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link href="/" className="btn"><Back />Объекты</Link>
        <span className={'pill ' + k}>{label}</span>
      </div>
      <h1>{d.obj.name}</h1>
      {d.obj.customer && <p className="mut sub">{d.obj.customer}</p>}

      {/* главное: прибыль и сколько сделано */}
      <section className="card hero">
        <div className="l">Прибыль сейчас</div>
        <div className={'big2 ' + profitCls}>{short(c.profit)}</div>
        <div className="meterwrap">
          <div className="meter lg"><i style={{ width: Math.min(100, c.ready * 100) + '%' }} /></div>
          <div className="meterlbl"><span>Выполнено {pct(c.ready)}</span><span>{short(c.osv)} из {short(c.contract)}</span></div>
        </div>
        <div className="two"><span>Потрачено <b>{short(c.spent)}</b></span><span>Маржа <b>{pct(c.margin)}</b> из {pct(c.planMargin)}</span></div>
      </section>

      {c.sigs.length > 0 && (
        <details className="dc">
          <summary><TriangleAlert size={20} aria-hidden="true" /><span className="grow">Требует внимания</span><span className={'cnt' + (attention > 0 ? ' warn' : '')}>{c.sigs.length}</span><ChevronDown size={18} className="chv" aria-hidden="true" /></summary>
          <div className="dc-body">{c.sigs.map((x, i) => <div key={i} className={'sig ' + x.kind}><SigIcon kind={x.kind} /><span>{x.text}</span></div>)}</div>
        </details>
      )}

      <section className="card pos">
        <h2>Что сделано</h2>
        <div className="plist">
          {c.rows.filter(r => r.q > 0).sort((a, b) => b.osv - a.osv).map(r => {
            const bad = r.margin !== null && r.margin < 0 && r.ready >= 0.1
            return (
              <div key={r.id} className="prow">
                <div className="ptop">
                  <span className="pname">{r.name}</span>
                  <span className="pfig">{r.ready > 1 && <span className="pill warn" style={{ marginRight: 8 }}>больше КП</span>}{pct(r.ready)}</span>
                </div>
                <div className={'meter' + (bad ? ' bad' : '')}><i style={{ width: Math.min(100, r.ready * 100) + '%' }} /></div>
                <div className="psub">
                  <span>{r.q} из {r.qty} {r.unit}</span>
                  <span className={bad ? 'tc-bad' : r.margin !== null && r.margin >= 0.15 ? 'tc-ok' : ''}>маржа {r.margin === null ? 'нет данных' : pct(r.margin)}</span>
                </div>
              </div>
            )
          })}
          {!c.rows.some(r => r.q > 0) && <p className="mut" style={{ margin: 0 }}>Выполнения пока нет. Позиции появятся здесь после первого отчёта.</p>}
        </div>
        {c.rows.some(r => r.q === 0) && (
          <details className="notstarted">
            <summary className="act">Ещё не начаты: {c.rows.filter(r => r.q === 0).length}</summary>
            {c.rows.filter(r => r.q === 0).map(r => (
              <div key={r.id} className="lrow" style={{ padding: '8px 0' }}>
                <span className="grow pname">{r.name}</span>
                <span className="mut" style={{ flex: 'none' }}>{r.qty} {r.unit}</span>
              </div>
            ))}
          </details>
        )}
      </section>

      <details className="dc">
        <summary><ChartLine size={20} aria-hidden="true" /><span className="grow">График и прогноз</span><ChevronDown size={18} className="chv" aria-hidden="true" /></summary>
        <div className="dc-body">
          <Chart series={c.series} />
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Освоено</dt><dd>{short(c.osv)}</dd>
            <dt>Прогноз прибыли</dt><dd className={c.fcProfit < 0 ? 'tc-bad' : ''}>{short(c.fcProfit)} (маржа {pct(c.fcMargin)})</dd>
            {c.finishDate && <><dt>Закончим</dt><dd>примерно {c.finishDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} при текущем темпе</dd></>}
            <dt>Договор</dt><dd>{money(c.contract)} без НДС</dd>
          </dl>
          <p className="mut" style={{ margin: '12px 0 0', fontSize: 13 }}>Общие расходы (техника, топливо, поденщики) распределены по позициям пропорционально освоению. Расходы с ЭСФ считаются без НДС.</p>
        </div>
      </details>

      <details className="dc">
        <summary><Users size={20} aria-hidden="true" /><span className="grow">Бригады</span><span className="cnt">{d.crews.length}</span><ChevronDown size={18} className="chv" aria-hidden="true" /></summary>
        <div className="dc-body">
        {d.crews.map(cr => {
          const b = crewBalance(cr.id, d.reps, d.paidBy.get(cr.id) ?? 0)
          return (
            <div key={cr.id} className="lrow">
              <div className="grow"><b>{cr.name}</b><div className="mut">{RATE_LABEL[cr.rate_type]}, {money(cr.rate)}</div></div>
              <div style={{ textAlign: 'right' }}>
                <div className={b.debt < 0 ? 'tc-bad' : ''}><b>{b.debt < 0 ? 'переплата ' : 'долг '}{short(Math.abs(b.debt))}</b></div>
                <div className="mut">начислено {short(b.acc)}, выдано {short(b.paid)}</div>
              </div>
            </div>
          )
        })}
        {!d.crews.length && <p className="mut" style={{ margin: 0 }}>Бригад пока нет. Добавьте ниже, и прораб увидит их в отчёте.</p>}
        <details>
          <summary className="act">Добавить бригаду или технику</summary>
          <form action={addCrew} style={{ marginTop: 12 }}>
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
      </details>

      <details className="dc">
        <summary><ClipboardList size={20} aria-hidden="true" /><span className="grow">Журнал отчётов</span><span className="cnt">{d.reps.length}</span><ChevronDown size={18} className="chv" aria-hidden="true" /></summary>
        <div className="dc-body">
        {d.reps.map(r => {
          const lab = r.labor_entries.reduce((a, l) => a + l.amount, 0)
          const ex = r.expenses.reduce((a, e) => a + expCost(e), 0)
          const osv = r.progress_entries.reduce((a, p) => a + p.qty * (itemName.get(p.kp_item_id)?.price ?? 0), 0)
          return (
            <details key={r.id}>
              <summary className="jrow">
                <span className="jdate">{dshort(r.report_date)}</span>
                <span className="grow">
                  <b>{r.author}</b>{r.backdated && <> <span className="pill warn">задним числом</span></>}
                  <div className="mut">освоено {short(osv)}, потрачено {short(lab + ex)}</div>
                </span>
              </summary>
              <div className="jbody">
                <div className="mut">Выполнение</div>
                {r.progress_entries.map((p, i) => <div key={i}>{itemName.get(p.kp_item_id)?.name}: <b>{p.qty} {itemName.get(p.kp_item_id)?.unit}</b></div>)}
                <div className="mut" style={{ marginTop: 8 }}>Люди</div>
                {r.labor_entries.map((l, i) => <div key={i}>{crewName.get(l.crew_id)}: <b>{money(l.amount)}</b></div>)}
                <div className="mut" style={{ marginTop: 8 }}>Расходы</div>
                {r.expenses.map((e, i) => (
                  <div key={i}>{e.category}: <b>{money(e.amount)}</b> {e.has_esf ? '(ЭСФ)' : '(без ЭСФ)'} · {e.funding === 'imprest' ? 'подотчёт' : e.funding === 'office' ? 'офис' : 'перечисление'}
                    {!e.has_receipt && <span className="tc-bad"> · без чека</span>}{e.comment ? ' · ' + e.comment : ''}</div>
                ))}
                <div>{(r.photos ?? []).map(path => photos[path] && <a key={path} href={photos[path]} target="_blank" rel="noreferrer" className="photo"><img src={photos[path]} alt="Фото с объекта" /></a>)}</div>
              </div>
            </details>
          )
        })}
        {!d.reps.length && <p className="mut" style={{ margin: 0 }}>Отчётов пока нет.</p>}
        </div>
      </details>
    </div>
  )
}
