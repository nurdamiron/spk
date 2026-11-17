import Link from 'next/link'
import { notFound } from 'next/navigation'
import { admin } from '@/lib/supabase/admin'
import { Back } from '@/components/Icons'
import { dmy, type PRecord, type Supplier } from '@/lib/prices'
import { Contacts, Offer } from '../../parts'

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = admin()
  const { data } = await db.from('price_suppliers').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  const s = data as Supplier
  const { data: recs } = await db.from('price_records').select('*').eq('supplier_id', id).order('position_key').order('cls')
  const records = (recs ?? []) as PRecord[]
  const keys = Array.from(new Set(records.map(r => r.pid)))
  const { data: poss } = keys.length ? await db.from('price_positions').select('pid, key, name').in('pid', keys) : { data: [] }
  const pn = new Map((poss ?? []).map(p => [p.pid, p.name as string]))
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link href="/prices/suppliers" className="btn"><Back />Поставщики</Link>
        <span className="pill info">{records.length} цен</span>
      </div>
      <h1>{s.name}</h1>
      <p className="mut" style={{ margin: '-4px 2px 14px' }}>{s.type ?? 'тип не определён'} · {s.city ?? 'город не указан'}{s.marketplace ? ` · площадка ${s.marketplace}` : ''}</p>
      <section className="card">
        <Contacts s={s} />
        <dl className="pr-kv">
          {s.form && <><dt>Форма</dt><dd>{s.form}</dd></>}
          <dt>Товары</dt><dd>{s.grp ?? 'нет данных'}</dd>
          <dt>Последняя цена</dt><dd>{dmy(s.last_price_date)}</dd>
          <dt>Контакты</dt><dd>{s.contact_status ?? 'нет данных'}</dd>
          <dt>Надёжность</dt><dd>{s.reliability ?? 'нет'} (A присваивается вручную после проверки БИН и ЭСФ)</dd>
        </dl>
        {s.note && <div className="pr-note">{s.note}</div>}
      </section>
      <div className="sec"><h2>Его цены</h2></div>
      <div className="group">
        {records.map(r => <Offer key={r.id} r={r} sup={s} showSupplier={false} posName={pn.get(r.pid)} />)}
        {!records.length && <p className="empty-hint">Цен нет.</p>}
      </div>
    </>
  )
}
