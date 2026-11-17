import Link from 'next/link'
import { admin } from '@/lib/supabase/admin'
import { dmy, type Supplier } from '@/lib/prices'
import { Contacts } from '../parts'

const PAGE = 40
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const clean = (s: string) => s.replace(/[%_,()*]/g, ' ').trim().slice(0, 60)
const TABS = [['', 'Все'], ['tel', 'С телефоном или e-mail'], ['maker', 'Производители и базы'], ['nocontact', 'Без контактов']] as const

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const q = clean(str(sp.q))
  const f = str(sp.f)
  const page = Math.max(1, Number(str(sp.p)) || 1)
  const db = admin()
  let qb = db.from('price_suppliers').select('*', { count: 'exact' }).order('n_records', { ascending: false }).order('name').range((page - 1) * PAGE, page * PAGE - 1)
  if (q) qb = qb.or(`name.ilike.%${q}%,city.ilike.%${q}%,grp.ilike.%${q}%`)
  if (f === 'tel') qb = qb.eq('contact_status', 'есть телефон/e-mail')
  if (f === 'maker') qb = qb.or('type.ilike.%производител%,type.ilike.%оптов%,type.ilike.%дилер%')
  if (f === 'nocontact') qb = qb.neq('contact_status', 'есть телефон/e-mail')
  const { data, count } = await qb
  const rows = (data ?? []) as Supplier[]
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE))
  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams()
    const m = { q, f, p: '', ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }
    for (const [k, v] of Object.entries(m)) if (v && !(k === 'p' && v === '1')) p.set(k, v)
    const s = p.toString()
    return '/prices/suppliers' + (s ? '?' + s : '')
  }
  return (
    <>
      <h1>Поставщики</h1>
      <div className="pr-sub">
        <Link href="/prices">Позиции</Link>
        <Link href="/prices/suppliers" className="on">Поставщики</Link>
      </div>
      <form className="pr-search" action="/prices/suppliers">
        <input type="text" name="q" defaultValue={q} placeholder="Название, город или товар" aria-label="Поиск поставщика" />
        {f && <input type="hidden" name="f" value={f} />}
        <button className="btn">Найти</button>
      </form>
      <div className="pr-chips">
        {TABS.map(([v, label]) => <Link key={v} href={href({ f: v, p: 1 })} className={'pr-chip' + (f === v ? ' on' : '')}>{label}</Link>)}
      </div>
      <div className="group">
        {rows.map(s => (
          <div key={s.id} className="gi">
            <div className="row">
              <b className="grow"><Link href={`/prices/suppliers/${s.id}`}>{s.name}</Link></b>
              <span className="pill info">{s.n_records} цен</span>
            </div>
            <div className="mut">{s.type ?? 'тип не определён'} · {s.city ?? 'город не указан'}{s.last_price_date ? ` · последняя цена от ${dmy(s.last_price_date)}` : ''}</div>
            {s.grp && <div className="mut">{s.grp}</div>}
            <Contacts s={s} />
          </div>
        ))}
        {!rows.length && <p className="empty-hint">Никого не найдено.</p>}
      </div>
      <div className="pr-pager">
        {page > 1 ? <Link className="btn" href={href({ p: page - 1 })}>Назад</Link> : <span />}
        <span className="mut">{page} из {pages} · найдено {count ?? 0}</span>
        {page < pages ? <Link className="btn" href={href({ p: page + 1 })}>Дальше</Link> : <span />}
      </div>
    </>
  )
}
