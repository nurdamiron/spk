import Link from 'next/link'
import { notFound } from 'next/navigation'
import { admin } from '@/lib/supabase/admin'
import { Back } from '@/components/Icons'
import { dmy, fmt, pctFmt, statusInfo, type PRecord, type Position, type Supplier } from '@/lib/prices'
import { Offer } from '../parts'

export default async function PositionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const db = admin()
  const { data: pos } = await db.from('price_positions').select('*').eq('key', key).maybeSingle()
  if (!pos) notFound()
  const p = pos as Position
  const { data: recs } = await db.from('price_records').select('*').eq('pid', p.pid).order('cls').order('ex_vat')
  const records = (recs ?? []) as PRecord[]
  const ids = Array.from(new Set(records.map(r => r.supplier_id)))
  const { data: sups } = ids.length ? await db.from('price_suppliers').select('*').in('id', ids) : { data: [] }
  const sm = new Map(((sups ?? []) as Supplier[]).map(s => [s.id, s]))
  const s = statusInfo(p.status)
  const byCls = (c: string) => records.filter(r => r.cls === c)

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link href="/prices" className="btn"><Back />База цен</Link>
        <span className={'pill ' + s.pill}>{s.label}</span>
      </div>
      <h1>{p.name}</h1>
      <p className="mut" style={{ margin: '-4px 2px 14px' }}>{p.grp} · цены за {p.base_unit ?? 'единицу'}, без НДС · срок актуальности {p.fresh_days} дн.{p.volatile ? ' (волатильная)' : ''}</p>

      <section className="card">
        <dl className="pr-kv" style={{ marginTop: 0 }}>
          <dt>Цена в расчёт</dt><dd>{p.rec_price != null ? `${fmt(p.rec_price)} ₸ (медиана подтверждённых, A)` : 'нет подтверждённой цены'}</dd>
          <dt>Ориентир</dt><dd>{p.ref_price != null ? `${fmt(p.ref_price)} ₸ (не подтверждена, дата или НДС не выяснены)` : 'нет'}</dd>
          {p.min_a != null && <><dt>Диапазон A</dt><dd>{fmt(p.min_a)} – {fmt(p.max_a)} ₸, разброс {pctFmt(p.spread_a)}</dd></>}
          <dt>Подтверждено</dt><dd>поставщиков: {p.a_suppliers}; предложений всего: {p.n_records}</dd>
          <dt>Свежая дата</dt><dd>{dmy(p.newest)}</dd>
          {p.old_price != null && <><dt>Цена в прошлом ВОР</dt><dd>{fmt(p.old_price)} ₸</dd></>}
          {p.spread_all != null && <><dt>Разброс всех цен</dt><dd>{pctFmt(p.spread_all)}</dd></>}
        </dl>
        {p.explanation && <div className="pr-quote">{p.explanation}</div>}
      </section>

      {(['A', 'B', 'C', 'D'] as const).map(c => byCls(c).length > 0 && (
        <div key={c}>
          <div className="sec"><h2>{{ A: 'Подтверждённые (A)', B: 'Ориентиры (B)', C: 'Цена по запросу (C)', D: 'Не приняты, справочно (D)' }[c]} · {byCls(c).length}</h2></div>
          <div className="group">
            {byCls(c).map(r => <Offer key={r.id} r={r} sup={sm.get(r.supplier_id)} />)}
          </div>
        </div>
      ))}
      {!records.length && <p className="empty-hint">Предложений по этой позиции пока нет. Нужен запрос поставщикам, тексты писем в базе price-base.</p>}
    </>
  )
}
