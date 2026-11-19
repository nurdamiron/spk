import Link from 'next/link'
import {
  ArrowLeft, BrickWall, Box, Cable, ChevronDown, ChevronRight, Cog, Droplets, Globe, Hammer, HardHat, Layers, Mail, MapPin, MessageCircle,
  PaintRoller, Phone, Quote, Route, Search, Store, Tags, TreePine, Truck, Users, Warehouse, Factory, X, Zap, ExternalLink, type LucideIcon,
} from 'lucide-react'
import {
  dmy, dmyShort, fmt, groupShort, parseContacts, safeUrl, shortUnit, telHref, typeKind, TYPE_LABEL, waHref,
  type PRecord, type Position, type Supplier, type TypeKind,
} from '@/lib/prices'

/* ============ значки ============ */

const GROUP_ICON: Record<string, LucideIcon> = {
  'Дорожные и нерудные материалы': Route, 'Бетон': Box, 'Металл, прокат, трубы': Hammer, 'ЖБИ, плитка, благоустройство (изделия)': BrickWall,
  'Гидроизоляция, утеплитель': Droplets, 'Оборудование и арматура НС/ВК/ПТ': Cog, 'Озеленение (растения, газон)': TreePine, 'Работы и услуги': HardHat,
  'Электрика и слаботочные системы': Zap, 'Трубы и фитинги инженерных сетей': Cable, 'Спецтехника и транспорт (аренда)': Truck,
  'Общестроительные и отделочные материалы': PaintRoller,
}
export const GroupIcon = ({ g, size = 20 }: { g: string | null | undefined; size?: number }) => {
  const I = (g && GROUP_ICON[g]) || Layers
  return <I size={size} strokeWidth={1.9} aria-hidden="true" />
}

const TYPE_ICON: Record<TypeKind, LucideIcon> = { maker: Factory, dealer: Warehouse, shop: Store, contractor: HardHat, unknown: Store }
export const TypeIcon = ({ t, size = 20 }: { t: string | null | undefined; size?: number }) => {
  const I = TYPE_ICON[typeKind(t)]
  return <I size={size} strokeWidth={1.9} aria-hidden="true" />
}

/** Одна простая отметка свежести: свежая, старая или без даты. */
export const AgeTag = ({ kind, date }: { kind: PRecord['act_kind']; date?: string | null }) => {
  if (kind === 'actual') return <span className="tg tg-fresh">свежая · {dmyShort(date)}</span>
  if (kind === 'nodate') return <span className="tg tg-none">без даты</span>
  return <span className="tg tg-old">старая · {dmyShort(date)}</span>
}

/* ============ общие куски ============ */

export const Segment = ({ active }: { active: 'pos' | 'sup' }) => (
  <div className="seg" role="tablist">
    <Link href="/prices" className={active === 'pos' ? 'on' : ''}><Tags size={18} aria-hidden="true" />Товары</Link>
    <Link href="/prices/suppliers" className={active === 'sup' ? 'on' : ''}><Users size={18} aria-hidden="true" />Поставщики</Link>
  </div>
)

export const Pager = ({ page, pages, prev, next }: { page: number; pages: number; prev: string | null; next: string | null }) =>
  pages > 1 ? (
    <div className="pg">
      {prev ? <Link className="ab" href={prev} aria-label="Назад"><ArrowLeft size={20} aria-hidden="true" /></Link> : <span className="ab off"><ArrowLeft size={20} aria-hidden="true" /></span>}
      <span className="mut">{page} из {pages}</span>
      {next ? <Link className="ab" href={next} aria-label="Дальше"><ChevronRight size={20} aria-hidden="true" /></Link> : <span className="ab off"><ChevronRight size={20} aria-hidden="true" /></span>}
    </div>
  ) : null

const SearchBar = ({ action, q, placeholder, hidden, clearHref }: { action: string; q: string; placeholder: string; hidden?: Record<string, string>; clearHref: string }) => (
  <form className="sb" action={action}>
    <label className="sb-field">
      <Search size={20} aria-hidden="true" />
      <input type="text" name="q" defaultValue={q} placeholder={placeholder} aria-label="Поиск" enterKeyHint="search" />
      {q && <Link href={clearHref} className="sb-x" aria-label="Очистить поиск"><X size={18} aria-hidden="true" /></Link>}
    </label>
    {Object.entries(hidden ?? {}).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
  </form>
)

/* ============ список товаров ============ */

export function PositionCard({ p }: { p: Position & { n_live?: number; med_live?: number | null } }) {
  const unit = shortUnit(p.base_unit)
  const n = p.n_live ?? 0
  return (
    <Link href={`/prices/${p.key}`} className="pc">
      <span className="pc-ic"><GroupIcon g={p.grp} /></span>
      <span className="pc-body">
        <span className="pc-name">{p.name}</span>
        <span className="pc-meta"><span>{groupShort(p.grp)}</span>{n > 0 && <span className="mini">{n} {n === 1 ? 'цена' : 'цен'}</span>}</span>
      </span>
      <span className="pc-price">
        {p.med_live != null ? <><b>~{fmt(p.med_live)} ₸</b><small>за {unit}</small></> : <small>цен нет</small>}
      </span>
      <ChevronRight className="pc-chev" aria-hidden="true" />
    </Link>
  )
}

export type ListProps = {
  rows: Position[]; total: number; page: number; pages: number
  q: string; g: string
  groups: [string, number][]
}

export function ListView(p: ListProps) {
  const href = (o: Record<string, string | number>) => {
    const sp = new URLSearchParams()
    const m: Record<string, string> = { q: p.q, g: p.g, p: '', ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }
    for (const [k, v] of Object.entries(m)) if (v && !(k === 'p' && v === '1')) sp.set(k, v)
    const s = sp.toString()
    return '/prices' + (s ? '?' + s : '')
  }
  return (
    <div className="pv">
      <h1>Цены</h1>
      <Segment active="pos" />
      <SearchBar action="/prices" q={p.q} placeholder="Арматура, бетон, люк…" hidden={{ g: p.g }} clearHref={href({ q: '', p: 1 })} />
      <div className="chips-row">
        <Link href={href({ g: '', p: 1 })} className={'fc' + (!p.g ? ' on' : '')}>Все</Link>
        {p.groups.map(([name]) => (
          <Link key={name} href={href({ g: name, p: 1 })} className={'fc' + (p.g === name ? ' on' : '')}><GroupIcon g={name} size={16} />{groupShort(name)}</Link>
        ))}
      </div>
      <div className="pcs">
        {p.rows.map(r => <PositionCard key={r.pid} p={r} />)}
        {!p.rows.length && <p className="empty-hint">Ничего не найдено.</p>}
      </div>
      <Pager page={p.page} pages={p.pages} prev={p.page > 1 ? href({ p: p.page - 1 }) : null} next={p.page < p.pages ? href({ p: p.page + 1 }) : null} />
    </div>
  )
}

/* ============ кнопки связи ============ */

/** Позвонить, WhatsApp, письмо. Остальное в «Подробнее». */
export function ContactButtons({ s }: { s: Pick<Supplier, 'contacts_raw' | 'site' | 'company_url'> }) {
  const c = parseContacts(s.contacts_raw)
  const phone = c.phones[0]
  const wa = c.phones.map(waHref).find(Boolean) ?? null
  const mail = c.emails[0]
  const web = safeUrl(s.site) ?? safeUrl(s.company_url)
  return (
    <div className="oc-act">
      {phone ? <a className="ab ab-main" href={telHref(phone)}><Phone size={20} aria-hidden="true" />Позвонить</a>
        : mail ? <a className="ab ab-main" href={'mailto:' + mail}><Mail size={20} aria-hidden="true" />Написать</a>
          : web ? <a className="ab ab-main" href={web} target="_blank" rel="noopener noreferrer"><Globe size={20} aria-hidden="true" />Открыть сайт</a>
            : <span className="ab ab-none">Контактов нет</span>}
      {wa && <a className="ab ab-wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={20} aria-hidden="true" /></a>}
      {phone && mail && <a className="ab" href={'mailto:' + mail} aria-label="Написать на почту"><Mail size={20} aria-hidden="true" /></a>}
    </div>
  )
}

export function ContactList({ s }: { s: Pick<Supplier, 'contacts_raw' | 'site' | 'company_url' | 'bin'> }) {
  const c = parseContacts(s.contacts_raw)
  const site = safeUrl(s.site)
  const comp = safeUrl(s.company_url)
  return (
    <ul className="cl">
      {c.phones.map(p => <li key={p}><Phone size={16} aria-hidden="true" /><a href={telHref(p)}>{p}</a></li>)}
      {c.emails.map(e => <li key={e}><Mail size={16} aria-hidden="true" /><a href={'mailto:' + e}>{e}</a></li>)}
      {c.other.map(o => <li key={o}><MapPin size={16} aria-hidden="true" /><span>{o}</span></li>)}
      {site && <li><Globe size={16} aria-hidden="true" /><a href={site} target="_blank" rel="noopener noreferrer">{site.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></li>}
      {comp && <li><Store size={16} aria-hidden="true" /><a href={comp} target="_blank" rel="noopener noreferrer">страница компании</a></li>}
      {s.bin && <li><span className="mut">БИН {s.bin}</span></li>}
      {!c.phones.length && !c.emails.length && !site && !comp && <li className="mut">публичных контактов нет</li>}
    </ul>
  )
}

/* ============ карточка товара: предложения ============ */

export function OfferCard({ r, sup, unit }: { r: PRecord; sup?: Supplier; unit: string }) {
  const link = safeUrl(r.url)
  return (
    <article className="oc">
      <div className="oc-top">
        <span className="oc-ic"><TypeIcon t={sup?.type} /></span>
        <div className="oc-t">
          <div className="oc-name">{sup ? <Link href={`/prices/suppliers/${sup.id}`}>{sup.name}</Link> : r.id}</div>
          <div className="oc-sub"><MapPin size={13} aria-hidden="true" />{r.region ?? sup?.city ?? 'город не указан'}<AgeTag kind={r.act_kind} date={r.price_date} /></div>
        </div>
      </div>
      <div className="oc-price"><b>{fmt(r.ex_vat)} ₸</b><span>за {unit}, без НДС</span></div>
      {sup && <ContactButtons s={sup} />}
      <details className="oc-more">
        <summary>Подробнее<ChevronDown size={18} aria-hidden="true" /></summary>
        <dl className="kv">
          {r.price != null && r.unit && <><dt>На сайте</dt><dd>{fmt(r.price)} ₸ {r.unit.replace(/^₸\s*\/\s*/, '/ ')}{r.vat === 'с НДС' ? ', с НДС' : r.vat === 'без НДС' ? ', без НДС' : ', НДС не указан'}</dd></>}
          <dt>Доставка</dt><dd>{r.delivery ?? 'нет данных'}</dd>
          <dt>Дата цены</dt><dd>{r.price_date ? `${dmy(r.price_date)}${r.date_type ? `, ${r.date_type}` : ''}` : 'на источнике не указана'}</dd>
        </dl>
        {link && <a className="oc-src" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />Открыть источник цены</a>}
        {r.quote && <div className="quote"><Quote size={16} aria-hidden="true" /><span>{r.quote}</span></div>}
        {sup && <ContactList s={sup} />}
      </details>
    </article>
  )
}

export function PositionView({ p, records, sups, sort }: { p: Position; records: PRecord[]; sups: Map<string, Supplier>; sort: 'price' | 'fresh' }) {
  const unit = shortUnit(p.base_unit)
  const med = (p as { med_live?: number | null }).med_live
  const mn = (p as { min_live?: number | null }).min_live
  const mx = (p as { max_live?: number | null }).max_live
  return (
    <div className="pv">
      <div className="ph">
        <Link href="/prices" className="ph-back" aria-label="Назад к списку"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <span className="mut">{groupShort(p.grp)}</span>
      </div>
      <h1>{p.name}</h1>

      <section className="hero2">
        {med != null ? (
          <>
            <div className="h2-l">Обычно</div>
            <div className="h2-big">~{fmt(med)} ₸<small>за {unit}, без НДС</small></div>
            <div className="h2-r">от {fmt(mn)} до {fmt(mx)} ₸ · {records.length} {records.length === 1 ? 'предложение' : 'предложений'}</div>
          </>
        ) : (
          <div className="h2-big mutc">цен пока нет</div>
        )}
      </section>

      {records.length > 1 && (
        <div className="sortrow">
          <Link href={`/prices/${p.key}`} className={'fc' + (sort === 'price' ? ' on' : '')}>Сначала дешевле</Link>
          <Link href={`/prices/${p.key}?s=fresh`} className={'fc' + (sort === 'fresh' ? ' on' : '')}>Сначала свежие</Link>
        </div>
      )}

      {records.map(r => <OfferCard key={r.id} r={r} sup={sups.get(r.supplier_id)} unit={unit} />)}
      {!records.length && <p className="empty-hint">Подтверждённых цен пока нет.</p>}
    </div>
  )
}

/* ============ поставщики ============ */

export function SupplierRow({ s }: { s: Supplier }) {
  const c = parseContacts(s.contacts_raw)
  const phone = c.phones[0]
  return (
    <div className="sr">
      <Link className="sr-main" href={`/prices/suppliers/${s.id}`}>
        <span className="pc-ic"><TypeIcon t={s.type} /></span>
        <span className="pc-body">
          <span className="pc-name">{s.name}</span>
          <span className="pc-meta"><span>{TYPE_LABEL[typeKind(s.type)]} · {s.city ?? 'город не указан'}</span></span>
        </span>
      </Link>
      {phone ? <a className="sr-call" href={telHref(phone)} aria-label={`Позвонить ${s.name}`}><Phone size={20} aria-hidden="true" /></a>
        : <span className="sr-call off" aria-hidden="true"><Phone size={20} /></span>}
    </div>
  )
}

export function SuppliersView({ rows, page, pages, q }: { rows: Supplier[]; page: number; pages: number; q: string }) {
  const href = (o: Record<string, string | number>) => {
    const sp = new URLSearchParams()
    const m: Record<string, string> = { q, p: '', ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }
    for (const [k, v] of Object.entries(m)) if (v && !(k === 'p' && v === '1')) sp.set(k, v)
    const s = sp.toString()
    return '/prices/suppliers' + (s ? '?' + s : '')
  }
  return (
    <div className="pv">
      <h1>Поставщики</h1>
      <Segment active="sup" />
      <SearchBar action="/prices/suppliers" q={q} placeholder="Название, город, товар…" clearHref={href({ q: '', p: 1 })} />
      <div className="pcs">
        {rows.map(s => <SupplierRow key={s.id} s={s} />)}
        {!rows.length && <p className="empty-hint">Никого не найдено.</p>}
      </div>
      <Pager page={page} pages={pages} prev={page > 1 ? href({ p: page - 1 }) : null} next={page < pages ? href({ p: page + 1 }) : null} />
    </div>
  )
}

export function SupplierView({ s, records, pos }: { s: Supplier; records: PRecord[]; pos: Map<string, { name: string; base_unit: string | null }> }) {
  return (
    <div className="pv">
      <div className="ph">
        <Link href="/prices/suppliers" className="ph-back" aria-label="Назад к списку"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <span className="mut">{TYPE_LABEL[typeKind(s.type)]}</span>
      </div>
      <h1>{s.name}</h1>
      <section className="hero2">
        <ContactButtons s={s} />
        <ContactList s={s} />
        <dl className="kv" style={{ marginTop: 12 }}>
          <dt>Город</dt><dd>{s.city ?? 'не указан'}</dd>
          {s.grp && <><dt>Товары</dt><dd>{s.grp}</dd></>}
        </dl>
      </section>
      <div className="sec"><h2>Его цены</h2></div>
      <div className="pcs">
        {records.map(r => {
          const p = pos.get(r.pid)
          return (
            <Link key={r.id} href={`/prices/${r.position_key}`} className="pc">
              <span className="pc-body">
                <span className="pc-name">{p?.name ?? r.position_key}</span>
                <span className="pc-meta"><AgeTag kind={r.act_kind} date={r.price_date} /></span>
              </span>
              <span className="pc-price"><b>{fmt(r.ex_vat)} ₸</b><small>за {shortUnit(p?.base_unit)}</small></span>
              <ChevronRight className="pc-chev" aria-hidden="true" />
            </Link>
          )
        })}
        {!records.length && <p className="empty-hint">Подтверждённых цен нет.</p>}
      </div>
    </div>
  )
}
