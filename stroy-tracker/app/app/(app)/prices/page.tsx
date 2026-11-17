import Link from 'next/link'
import { admin } from '@/lib/supabase/admin'
import { dmy, fmt, pctFmt, statusInfo, type Position } from '@/lib/prices'

const PAGE = 40
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const clean = (s: string) => s.replace(/[%_,()*]/g, ' ').trim().slice(0, 60)

const STATUS_TABS = [
  ['', 'Все'],
  ['price', 'Есть цены'],
  ['partial', 'Частично'],
  ['ready', 'Готово'],
  ['none', 'Цен нет'],
] as const

export default async function PricesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const q = clean(str(sp.q))
  const g = str(sp.g)
  const st = str(sp.st)
  const page = Math.max(1, Number(str(sp.p)) || 1)
  const db = admin()

  let qb = db.from('price_positions').select('*', { count: 'exact' }).order('pid').range((page - 1) * PAGE, page * PAGE - 1)
  if (g) qb = qb.eq('grp', g)
  if (q) qb = qb.ilike('name', `%${q}%`)
  if (st === 'price') qb = qb.gt('n_records', 0)
  if (st === 'none') qb = qb.eq('n_records', 0)
  if (st === 'ready') qb = qb.eq('status', 'готово')
  if (st === 'partial') qb = qb.like('status', 'частично%')

  const [list, groups, nRec, nSup, nA, meta] = await Promise.all([
    qb,
    db.from('price_positions').select('grp'),
    db.from('price_records').select('id', { count: 'exact', head: true }),
    db.from('price_suppliers').select('id', { count: 'exact', head: true }),
    db.from('price_records').select('id', { count: 'exact', head: true }).eq('cls', 'A'),
    db.from('price_meta').select('built_at').eq('id', 1).maybeSingle(),
  ])
  const rows = (list.data ?? []) as Position[]
  const total = list.count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const gcount = new Map<string, number>()
  for (const r of groups.data ?? []) gcount.set(r.grp, (gcount.get(r.grp) ?? 0) + 1)

  const href = (o: Record<string, string | number>) => {
    const p = new URLSearchParams()
    const m = { q, g, st, p: '', ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }
    for (const [k, v] of Object.entries(m)) if (v && !(k === 'p' && v === '1')) p.set(k, v)
    const s = p.toString()
    return '/prices' + (s ? '?' + s : '')
  }

  return (
    <>
      <h1>База цен</h1>
      <div className="pr-sub">
        <Link href="/prices" className="on">Позиции</Link>
        <Link href="/prices/suppliers">Поставщики</Link>
      </div>
      <div className="pr-stats">
        <div><b>{gcount.size ? Array.from(gcount.values()).reduce((a, b) => a + b, 0) : 0}</b><span>позиций</span></div>
        <div><b>{nSup.count ?? 0}</b><span>поставщиков</span></div>
        <div><b>{nRec.count ?? 0}</b><span>цен</span></div>
        <div><b>{nA.count ?? 0}</b><span>подтверждённых (A)</span></div>
      </div>

      <form className="pr-search" action="/prices">
        <input type="text" name="q" defaultValue={q} placeholder="Поиск: арматура, бетон, люк, экскаватор" aria-label="Поиск по позициям" />
        {g && <input type="hidden" name="g" value={g} />}
        {st && <input type="hidden" name="st" value={st} />}
        <button className="btn">Найти</button>
      </form>

      <div className="pr-chips" aria-label="Группы">
        <Link href={href({ g: '', p: 1 })} className={'pr-chip' + (!g ? ' on' : '')}>Все группы</Link>
        {Array.from(gcount.entries()).sort((a, b) => b[1] - a[1]).map(([name, n]) => (
          <Link key={name} href={href({ g: name, p: 1 })} className={'pr-chip' + (g === name ? ' on' : '')}>{name} · {n}</Link>
        ))}
      </div>
      <div className="pr-chips" aria-label="Статус">
        {STATUS_TABS.map(([v, label]) => (
          <Link key={v} href={href({ st: v, p: 1 })} className={'pr-chip' + (st === v ? ' on' : '')}>{label}</Link>
        ))}
      </div>

      <p className="pr-note">
        Все цены в тенге за базовую единицу позиции, без НДС. Класс A: свежая дата документа, НДС указан, цена подтверждена при проверке, регион Алматы.
        Позиция «готово», когда подтверждена тремя независимыми поставщиками. Остальные цены это ориентиры, их нужно уточнять запросом.
        {meta.data?.built_at ? ` База собрана ${dmy(String(meta.data.built_at))}.` : ''}
      </p>

      <div className="group">
        {rows.map(p => {
          const s = statusInfo(p.status)
          return (
            <Link key={p.pid} href={`/prices/${p.key}`} className="gi pr-item">
              <div className="row">
                <b className="grow">{p.name}</b>
                <span className={'pill ' + s.pill}>{s.label}</span>
              </div>
              <div className="mut">{p.grp} · {p.n_records} предложений{p.a_suppliers ? ` · подтверждено поставщиков: ${p.a_suppliers}` : ''}{p.newest ? ` · свежая дата ${dmy(p.newest)}` : ''}</div>
              {p.rec_price != null ? (
                <div className="pr-price tc-ok">{fmt(p.rec_price)} ₸ <span className="mut" style={{ fontWeight: 500 }}>{p.base_unit}, без НДС, в расчёт</span></div>
              ) : p.ref_price != null ? (
                <div className="pr-price">{fmt(p.ref_price)} ₸ <span className="mut" style={{ fontWeight: 500 }}>{p.base_unit}, ориентир, не подтверждена</span></div>
              ) : (
                <div className="mut" style={{ marginTop: 4 }}>цен пока нет, нужен запрос поставщикам ({p.base_unit ?? 'ед. не указана'})</div>
              )}
              {p.spread_all != null && p.spread_all > 0.3 && <div className="mut">разброс цен {pctFmt(p.spread_all)}</div>}
            </Link>
          )
        })}
        {!rows.length && <p className="empty-hint">Ничего не найдено. Измените поиск или фильтры.</p>}
      </div>

      <div className="pr-pager">
        {page > 1 ? <Link className="btn" href={href({ p: page - 1 })}>Назад</Link> : <span />}
        <span className="mut">{page} из {pages} · найдено {total}</span>
        {page < pages ? <Link className="btn" href={href({ p: page + 1 })}>Дальше</Link> : <span />}
      </div>
    </>
  )
}
