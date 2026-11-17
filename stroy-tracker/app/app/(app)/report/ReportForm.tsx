'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { enqueue, sendReport, shrinkPhoto } from '@/lib/queue'
import { Check, Clock, Plus, Camera, X, Trash2 } from 'lucide-react'
import { Back } from '@/components/Icons'

type Item = { id: string; name: string; unit: string; qty: number; done: number }
type CrewOpt = { id: string; name: string; type: 'hour' | 'day' | 'volume' | 'fixed'; on: boolean }
type Row = { item: string; qty: string }
type Person = { crew: string; on: boolean; val: string }
type Exp = { category: string; amount: string; funding: string; esf: boolean; item: string; comment: string; receipt: boolean }
type Photo = { blob: Blob; url: string }

const TYPE_LBL = { hour: 'за час', day: 'за день', volume: 'за объём', fixed: 'фикс за этап' } as const
const emptyExp = (): Exp => ({ category: 'Материал', amount: '', funding: 'imprest', esf: true, item: '', comment: '', receipt: true })
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function ReportForm(props: { objectId: string; objectName: string; today: string; imprestLeft: string; items: Item[]; crews: CrewOpt[] }) {
  const { items, crews } = props
  const fresh = () => ({
    date: props.today,
    rows: [{ item: '', qty: '' }] as Row[],
    people: crews.map(c => ({ crew: c.id, on: c.on, val: c.type === 'hour' ? '8' : '1' })) as Person[],
    exps: [] as Exp[],
    photos: [] as Photo[],
  })
  const [f, setF] = useState(fresh)
  const [picker, setPicker] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<'sent' | 'queued' | null>(null)
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const up = () => setOnline(navigator.onLine)
    up()
    window.addEventListener('online', up)
    window.addEventListener('offline', up)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', up) }
  }, [])

  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const inForm = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of f.rows) if (r.item) m.set(r.item, (m.get(r.item) ?? 0) + (parseFloat(r.qty) || 0))
    return m
  }, [f.rows])
  const set = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }))

  async function addPhotos(files: FileList | null) {
    if (!files) return
    const added: Photo[] = []
    for (const file of Array.from(files)) {
      const blob = await shrinkPhoto(file)
      added.push({ blob, url: URL.createObjectURL(blob) })
    }
    setF(prev => ({ ...prev, photos: [...prev.photos, ...added].slice(0, 10) }))
  }

  async function submit() {
    setError('')
    const progress = f.rows.filter(r => r.item && parseFloat(r.qty) > 0).map(r => ({ kp_item_id: r.item, qty: parseFloat(r.qty) }))
    const labor = f.people.filter(p => p.on).map(p => ({ crew_id: p.crew, value: parseFloat(p.val) || 0 }))
      .filter(l => { const c = crews.find(x => x.id === l.crew_id)!; return c.type === 'hour' || c.type === 'day' ? l.value > 0 : true })
    const expenses = f.exps.filter(e => parseFloat(e.amount) > 0).map(e => ({
      category: e.category, amount: Math.round(parseFloat(e.amount)), has_esf: e.esf, funding: e.funding,
      kp_item_id: e.item || null, has_receipt: e.receipt, comment: e.comment.trim(),
    }))
    if (f.rows.some(r => r.item && !(parseFloat(r.qty) > 0))) return setError('У выбранной позиции укажите объём')
    if (!progress.length && !labor.length && !expenses.length) return setError('Заполните хотя бы выполнение, людей или расход')

    const item = { clientId: uid(), payload: { clientId: '', object_id: props.objectId, report_date: f.date, progress, labor, expenses }, photos: f.photos.map(p => p.blob) }
    item.payload.clientId = item.clientId
    setBusy(true)
    const r = navigator.onLine ? await sendReport(item) : 'later'
    if (r === 'ok') setResult('sent')
    else if (r === 'later') {
      try { await enqueue(item); setResult('queued') } catch { setError('Нет связи, и в телефоне нет места сохранить отчёт. Освободите память и повторите') }
    } else setError(r.error)
    setBusy(false)
  }

  if (result) {
    return (
      <div className={'card done' + (result === 'queued' ? ' q' : '')}>
        <div className="ic">{result === 'sent' ? <Check size={36} strokeWidth={2.5} /> : <Clock size={34} strokeWidth={2.2} />}</div>
        <h2>{result === 'sent' ? 'Отчёт отправлен' : 'Сохранено в телефоне'}</h2>
        <p className="mut" style={{ fontSize: 16 }}>{result === 'sent' ? 'Владелец уже видит цифры.' : 'Связи нет. Отчёт уйдёт сам, когда появится интернет. Приложение можно закрыть.'}</p>
        <div className="row">
          <button className="btn pri" onClick={() => { setF(fresh()); setResult(null) }}>Новый отчёт</button>
          <Link className="btn" href="/history">История</Link>
        </div>
      </div>
    )
  }

  const list = items.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase()))
  const nProg = f.rows.filter(r => r.item && parseFloat(r.qty) > 0).length
  const nPeople = f.people.filter(p => p.on).length
  const nExp = f.exps.filter(e => parseFloat(e.amount) > 0).length

  return (
    <>
      <div className="card rhead">
        <div className="obj">{props.objectName}</div>
        <div className="meta">
          <input type="date" value={f.date} max={props.today} onChange={e => set({ date: e.target.value })} aria-label="Дата отчёта" />
          {f.date !== props.today && <span className="pill warn">задним числом</span>}
          <span className="pill info">В подотчёте: {props.imprestLeft}</span>
        </div>
      </div>
      <div className="hint">Цен и прибыли здесь нет. Люди подставлены из прошлых отчётов.</div>

      <div className="sec"><span className="num">1</span><h2>Что сделали</h2></div>
      <div className="group">
        {f.rows.map((r, i) => {
          const it = byId.get(r.item)
          const after = it ? it.done + (inForm.get(it.id) ?? 0) : 0
          return (
            <div key={i} className="gi">
              <button type="button" className={'pick' + (it ? '' : ' empty')} onClick={() => { setQ(''); setPicker(i) }}>
                <span className="t">{it ? it.name : 'Выбрать позицию из КП'}</span>
              </button>
              <div className="qtyrow">
                <input type="number" inputMode="decimal" placeholder="0" value={r.qty} aria-label="Объём"
                  onChange={e => set({ rows: f.rows.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)) })} />
                <span className="unit">{it ? it.unit : ''}</span>
                <button type="button" className="btn" aria-label="Убрать строку" onClick={() => set({ rows: f.rows.length > 1 ? f.rows.filter((_, j) => j !== i) : [{ item: '', qty: '' }] })}><Trash2 size={20} /></button>
              </div>
              {it && (
                <>
                  <div className="after">
                    <span>Всего будет {Math.round(after * 10) / 10} из {it.qty} {it.unit}</span>
                    {after > it.qty && <span className="pill bad">больше КП, это доп. работа?</span>}
                  </div>
                  <div className={'meter' + (after > it.qty ? ' bad' : '')} style={{ marginTop: 6 }}><i style={{ width: Math.min(100, (after / it.qty) * 100) + '%' }} /></div>
                </>
              )}
            </div>
          )
        })}
        <button type="button" className="addrow" onClick={() => set({ rows: [...f.rows, { item: '', qty: '' }] })}><Plus size={20} />Ещё позиция из КП</button>
        <label className="shotbtn">
          <Camera size={20} />Сфотографировать{f.photos.length > 0 && <span className="mut" style={{ marginLeft: 'auto' }}>{f.photos.length}</span>}
          <input type="file" accept="image/*" capture="environment" multiple onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
        </label>
        {f.photos.length > 0 && (
          <div className="thumbs">
            {f.photos.map((p, i) => (
              <span key={i} className="photo"><img src={p.url} alt={`Фото ${i + 1}`} />
                <button type="button" aria-label="Убрать фото" onClick={() => set({ photos: f.photos.filter((_, j) => j !== i) })}><X size={14} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sec"><span className="num">2</span><h2>Люди и техника</h2></div>
      <div className="group">
        {crews.length === 0 && <div className="empty-hint">Владелец ещё не добавил бригады на этот объект.</div>}
        {f.people.map((p, i) => {
          const c = crews[i]
          const hasVal = c.type === 'hour' || c.type === 'day'
          return (
            <div key={c.id} className="gi">
              <label className="crew">
                <span className="nm">{c.name}<br /><span className="mut">{TYPE_LBL[c.type]}</span></span>
                <input type="checkbox" className="sw" checked={p.on} aria-label={c.name} onChange={e => set({ people: f.people.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)) })} />
              </label>
              {p.on && hasVal && (
                <div className="val">
                  <input type="number" inputMode="decimal" step={c.type === 'day' ? 0.5 : 1} value={p.val} aria-label={c.type === 'hour' ? 'Часы' : 'Дни'}
                    onChange={e => set({ people: f.people.map((x, j) => (j === i ? { ...x, val: e.target.value } : x)) })} />
                  <span className="mut">{c.type === 'hour' ? 'часов' : 'дней'}</span>
                </div>
              )}
              {p.on && !hasVal && <div className="mut" style={{ marginTop: 6 }}>Сумма посчитается из выполнения</div>}
            </div>
          )
        })}
      </div>

      <div className="sec"><span className="num">3</span><h2>Расходы</h2></div>
      <div className="group">
        {f.exps.map((e, i) => {
          const upd = (patch: Partial<Exp>) => set({ exps: f.exps.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
          return (
            <div key={i} className="gi">
              <div className="qtyrow" style={{ marginTop: 0 }}>
                <input type="number" inputMode="numeric" placeholder="Сумма, ₸" value={e.amount} onChange={ev => upd({ amount: ev.target.value })} aria-label="Сумма" />
                <button type="button" className="btn" aria-label="Убрать расход" onClick={() => set({ exps: f.exps.filter((_, j) => j !== i) })}><Trash2 size={20} /></button>
              </div>
              <div className="f2">
                <select value={e.category} onChange={ev => upd({ category: ev.target.value })} aria-label="Категория">{['Материал', 'Топливо', 'Доставка', 'Техника', 'Прочее'].map(c => <option key={c}>{c}</option>)}</select>
                <select value={e.funding} onChange={ev => upd({ funding: ev.target.value })} aria-label="Откуда деньги">
                  <option value="imprest">Из подотчёта</option><option value="office">Оплатил офис</option><option value="transfer">Перечисление</option>
                </select>
                <select value={e.esf ? '1' : '0'} onChange={ev => upd({ esf: ev.target.value === '1' })} aria-label="НДС">
                  <option value="1">Есть ЭСФ с НДС</option><option value="0">Без НДС, без ЭСФ</option>
                </select>
                <select value={e.item} onChange={ev => upd({ item: ev.target.value })} aria-label="Позиция">
                  <option value="">Общий расход</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input type="text" className="full" placeholder="Комментарий, например: труба ПЭ 110, 40 м" value={e.comment} onChange={ev => upd({ comment: ev.target.value })} />
              </div>
              <label className="chk"><input type="checkbox" className="sw" checked={e.receipt} onChange={ev => upd({ receipt: ev.target.checked })} />Чек есть</label>
            </div>
          )
        })}
        {f.exps.length === 0 && <div className="empty-hint">Расходов за день нет. Добавьте, если что-то покупали.</div>}
        <button type="button" className="addrow" onClick={() => set({ exps: [...f.exps, emptyExp()] })}><Plus size={20} />Добавить расход</button>
      </div>

      {error && <div className="err" role="alert">{error}</div>}
      <div className="stickybar">
        <div className="sum">Выполнение: {nProg} · Людей: {nPeople} · Расходов: {nExp}</div>
        <button className="btn pri big" disabled={busy} onClick={submit}>
          {busy ? 'Отправляем…' : online ? 'Отправить отчёт' : 'Сохранить, отправится при связи'}
        </button>
      </div>

      {picker !== null && (
        <div className="sheet" role="dialog" aria-label="Выбор позиции">
          <div className="top">
            <button type="button" className="btn" aria-label="Назад" onClick={() => setPicker(null)}><Back /></button>
            <input type="text" className="grow" placeholder="Найти позицию" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          </div>
          <div className="list">
            {list.map(i => (
              <button key={i.id} type="button" className="opt" onClick={() => { set({ rows: f.rows.map((x, j) => (j === picker ? { ...x, item: i.id } : x)) }); setPicker(null) }}>
                <b>{i.name}</b>
                <div className="mut">Сделано {Math.round(i.done * 10) / 10} из {i.qty} {i.unit}</div>
              </button>
            ))}
            {!list.length && <div className="mut" style={{ padding: 16 }}>Такой позиции нет в КП. Если это дополнительная работа, скажите владельцу.</div>}
          </div>
        </div>
      )}
    </>
  )
}
