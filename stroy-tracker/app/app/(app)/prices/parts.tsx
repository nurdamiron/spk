import Link from 'next/link'
import {
  ArrowLeft, BadgeCheck, Boxes, Cable, CalendarX, ChevronDown, ChevronRight, CircleDashed, CircleHelp, Clock, Cog, Droplets, ExternalLink, Factory,
  Globe, Hammer, HardHat, Hourglass, Info, Layers, ListFilter, Mail, MapPin, MessageCircle, PaintRoller, Phone, Quote, Route, Search, Store,
  Tags, TreePine, Truck, Users, Warehouse, X, Zap, BrickWall, Box, type LucideIcon,
} from 'lucide-react'
import {
  dmy, dmyShort, fmt, groupShort, parseContacts, pctFmt, safeUrl, shortUnit, statusInfo, telHref, typeKind, TYPE_LABEL, waHref,
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

const CLS: Record<string, { label: string; icon: LucideIcon }> = {
  A: { label: 'Подтверждена', icon: BadgeCheck },
  B: { label: 'Ориентир', icon: Info },
  C: { label: 'По запросу', icon: CircleHelp },
  D: { label: 'Не принята', icon: CircleDashed },
}
export const ClassBadge = ({ c }: { c: string }) => {
  const x = CLS[c] ?? CLS.D
  const I = x.icon
  return <span className={'cb cb-' + c}><I aria-hidden="true" strokeWidth={2} />{x.label}</span>
}

const ACT: Record<string, { label: string; icon: LucideIcon }> = {
  actual: { label: 'Свежая', icon: Clock }, stale: { label: 'Устарела', icon: Hourglass },
  expired: { label: 'Срок истёк', icon: CalendarX }, nodate: { label: 'Нет даты', icon: CircleHelp },
}
export const ActBadge = ({ kind, date }: { kind: PRecord['act_kind']; date?: string | null }) => {
  const x = ACT[kind]
  const I = x.icon
  return <span className={'cb ab-' + kind}><I aria-hidden="true" strokeWidth={2} />{x.label}{date && kind !== 'nodate' ? ` · ${dmyShort(date)}` : ''}</span>
}

/* ============ общие куски ============ */

export const Segment = ({ active }: { active: 'pos' | 'sup' }) => (
  <div className="seg" role="tablist">
    <Link href="/prices" className={active === 'pos' ? 'on' : ''}><Tags size={18} aria-hidden="true" />Позиции</Link>
    <Link href="/prices/suppliers" className={active === 'sup' ? 'on' : ''}><Users size={18} aria-hidden="true" />Поставщики</Link>
  </div>
)

export const Pager = ({ page, pages, total, prev, next }: { page: number; pages: number; total: number; prev: string | null; next: string | null }) => (
  <div className="pg">
    {prev ? <Link className="ab" href={prev} aria-label="Назад"><ArrowLeft size={20} aria-hidden="true" /></Link> : <span className="ab off"><ArrowLeft size={20} aria-hidden="true" /></span>}
    <span className="mut">{page} из {pages} · {total}</span>
    {next ? <Link className="ab" href={next} aria-label="Дальше"><ChevronRight size={20} aria-hidden="true" /></Link> : <span className="ab off"><ChevronRight size={20} aria-hidden="true" /></span>}
  </div>
)

/* ============ список позиций ============ */

export function PositionCard({ p }: { p: Position }) {
  const s = statusInfo(p.status)
  const unit = shortUnit(p.base_unit)
  return (
    <Link href={`/prices/${p.key}`} className="pc">
      <span className="pc-ic"><GroupIcon g={p.grp} /></span>
      <span className="pc-body">
        <span className="pc-name">{p.name}</span>
        <span className="pc-meta">
          <span>{groupShort(p.grp)}</span>
          <span className="mini">{p.n_records} {p.n_records === 1 ? 'цена' : 'цен'}</span>
          {s.label === 'готово' && <span className="cb cb-A"><BadgeCheck aria-hidden="true" strokeWidth={2} />Готово</span>}
          {s.label === 'частично' && <span className="cb cb-B"><Info aria-hidden="true" strokeWidth={2} />Частично</span>}
        </span>
      </span>
      <span className="pc-price">
        {p.rec_price != null ? (
          <><b className="tok">{fmt(p.rec_price)} ₸</b><small>за {unit} · в расчёт</small></>
        ) : p.ref_price != null ? (
          <><b>~{fmt(p.ref_price)} ₸</b><small>за {unit} · ориентир</small></>
        ) : (
          <small>нужен запрос</small>
        )}
      </span>
      <ChevronRight className="pc-chev" aria-hidden="true" />
    </Link>
  )
}

const STATUS_TABS: [string, string][] = [['', 'Все'], ['price', 'Есть цены'], ['partial', 'Частично'], ['ready', 'Готово'], ['none', 'Цен нет']]

export type ListProps = {
  rows: Position[]; total: number; page: number; pages: number
  q: string; g: string; st: string
  groups: [string, number][]
  stats: { pos: number; sup: number; rec: number; a: number }
  builtAt?: string | null
}

export function ListView(p: ListProps) {
  const href = (o: Record<string, string | number>) => {
    const sp = new URLSearchParams()
    const m: Record<string, string> = { q: p.q, g: p.g, st: p.st, p: '', ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }
    for (const [k, v] of Object.entries(m)) if (v && !(k === 'p' && v === '1')) sp.set(k, v)
    const s = sp.toString()
    return '/prices' + (s ? '?' + s : '')
  }
  const activeCount = (p.g ? 1 : 0) + (p.st ? 1 : 0)
  const stLabel = STATUS_TABS.find(t => t[0] === p.st)?.[1]
  return (
    <div className="pv">
      <h1>База цен</h1>
      <Segment active="pos" />

      <div className="strip">
        <div><Boxes size={18} aria-hidden="true" /><span><b>{p.stats.pos}</b>позиций</span></div>
        <div><Users size={18} aria-hidden="true" /><span><b>{p.stats.sup}</b>поставщиков</span></div>
        <div><Tags size={18} aria-hidden="true" /><span><b>{p.stats.rec}</b>цен</span></div>
      </div>

      <form className="sb" action="/prices">
        <label className="sb-field">
          <Search size={20} aria-hidden="true" />
          <input type="text" name="q" defaultValue={p.q} placeholder="Арматура, бетон, люк…" aria-label="Поиск по позициям" enterKeyHint="search" />
          {p.q && <Link href={href({ q: '', p: 1 })} className="sb-x" aria-label="Очистить поиск"><X size={18} aria-hidden="true" /></Link>}
        </label>
        {p.g && <input type="hidden" name="g" value={p.g} />}
        {p.st && <input type="hidden" name="st" value={p.st} />}
      </form>

      <details className="flt">
        <summary>
          <ListFilter size={20} aria-hidden="true" />
          <span className="grow">Фильтры</span>
          {activeCount > 0 && <span className="flt-n">{activeCount}</span>}
          <ChevronDown size={18} className="flt-chev" aria-hidden="true" />
        </summary>
        <div className="flt-body">
          <div className="flt-t">Группа</div>
          <div className="flt-chips">
            <Link href={href({ g: '', p: 1 })} className={'fc' + (!p.g ? ' on' : '')}>Все</Link>
            {p.groups.map(([name, n]) => (
              <Link key={name} href={href({ g: name, p: 1 })} className={'fc' + (p.g === name ? ' on' : '')}>
                <GroupIcon g={name} size={16} />{groupShort(name)}<i>{n}</i>
              </Link>
            ))}
          </div>
          <div className="flt-t">Статус</div>
          <div className="flt-chips">
            {STATUS_TABS.map(([v, label]) => <Link key={v} href={href({ st: v, p: 1 })} className={'fc' + (p.st === v ? ' on' : '')}>{label}</Link>)}
          </div>
        </div>
      </details>

      {(p.g || p.st) && (
        <div className="tags">
          {p.g && <Link href={href({ g: '', p: 1 })} className="tag"><GroupIcon g={p.g} size={14} />{groupShort(p.g)}<X size={14} aria-hidden="true" /></Link>}
          {p.st && <Link href={href({ st: '', p: 1 })} className="tag">{stLabel}<X size={14} aria-hidden="true" /></Link>}
        </div>
      )}

      <details className="info2">
        <summary><Info size={18} aria-hidden="true" />Как читать цены<ChevronDown size={18} className="flt-chev" aria-hidden="true" /></summary>
        <ul>
          <li><ClassBadge c="A" /><span>Свежая дата, НДС указан, цена проверена, Алматы</span></li>
          <li><ClassBadge c="B" /><span>Есть цена, но чего-то не хватает: даты, НДС или она старая</span></li>
          <li><ClassBadge c="C" /><span>Цена только по запросу</span></li>
          <li><ClassBadge c="D" /><span>Нет даты или не подтверждена. Только для ориентира</span></li>
        </ul>
        <p>Все цены в тенге без НДС за базовую единицу. «Готово» значит три независимых поставщика с подтверждённой ценой.{p.builtAt ? ` База собрана ${dmy(p.builtAt)}.` : ''}</p>
      </details>

      <div className="pcs">
        {p.rows.map(r => <PositionCard key={r.pid} p={r} />)}
        {!p.rows.length && <p className="empty-hint">Ничего не найдено. Измените поиск или фильтры.</p>}
      </div>

      <Pager page={p.page} pages={p.pages} total={p.total} prev={p.page > 1 ? href({ p: p.page - 1 }) : null} next={p.page < p.pages ? href({ p: p.page + 1 }) : null} />
    </div>
  )
}

/* ============ контакты и кнопки ============ */

/** Кнопки связи: позвонить, WhatsApp, письмо, сайт. Источник цены добавляется отдельно. */
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
      {(phone || mail) && web && <a className="ab" href={web} target="_blank" rel="noopener noreferrer" aria-label="Сайт"><Globe size={20} aria-hidden="true" /></a>}
    </div>
  )
}

/** Полный список контактов, показывается внутри «Подробнее». */
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
      {s.bin && <li><BadgeCheck size={16} aria-hidden="true" /><span>БИН {s.bin}</span></li>}
      {!c.phones.length && !c.emails.length && !site && !comp && <li className="mut">публичных контактов нет</li>}
    </ul>
  )
}

/* ============ карточка предложения ============ */

export function OfferCard({ r, sup, unit, showSupplier = true, posName }: { r: PRecord; sup?: Supplier; unit: string; showSupplier?: boolean; posName?: string }) {
  const title = showSupplier ? sup?.name ?? r.id : posName ?? r.id
  const titleHref = showSupplier ? (sup ? `/prices/suppliers/${sup.id}` : null) : `/prices/${r.position_key}`
  const sub = showSupplier ? sup?.type : null
  return (
    <article className={'oc oc-' + r.cls}>
      <div className="oc-head">
        <div className="oc-sup">
          <span className="oc-ic">{showSupplier ? <TypeIcon t={sup?.type} /> : <Tags size={20} aria-hidden="true" />}</span>
          <div className="oc-t">
            <div className="oc-name">{titleHref ? <Link href={titleHref}>{title}</Link> : title}</div>
            <div className="oc-sub">
              {showSupplier ? <>{TYPE_LABEL[typeKind(sub)]}</> : sup ? <Link href={`/prices/suppliers/${sup.id}`}>{sup.name}</Link> : null}
              <span className="dot">·</span><MapPin size={13} aria-hidden="true" />{r.region ?? sup?.city ?? 'город не указан'}
            </div>
          </div>
        </div>
      </div>
      <div className="oc-price"><b>{fmt(r.ex_vat)} ₸</b><span>за {unit}, без НДС</span></div>
      <div className="oc-site">
        {r.price != null && r.unit && <span>на сайте {fmt(r.price)} ₸ {r.unit.replace(/^₸\s*\/\s*/, '/ ')}{r.vat === 'с НДС' ? ', с НДС' : r.vat === 'без НДС' ? ', без НДС' : ', НДС не указан'}</span>}
        {safeUrl(r.url) && <a href={safeUrl(r.url)!} target="_blank" rel="noopener noreferrer" className="oc-src"><ExternalLink size={14} aria-hidden="true" />источник</a>}
      </div>
      <div className="oc-badges"><ClassBadge c={r.cls} /><ActBadge kind={r.act_kind} date={r.price_date} /></div>
      {sup && showSupplier ? <ContactButtons s={sup} /> : null}
      <details className="oc-more">
        <summary>Подробнее<ChevronDown size={18} aria-hidden="true" /></summary>
        <dl className="kv">
          <dt>НДС</dt><dd>{r.vat ?? 'нет данных'}</dd>
          <dt>Доставка</dt><dd>{r.delivery ?? 'нет данных'}</dd>
          {r.price_date && <><dt>Дата цены</dt><dd>{dmy(r.price_date)}{r.date_type ? `, ${r.date_type}` : ''}{r.valid_until ? `, до ${dmy(r.valid_until)}` : ''}</dd></>}
          <dt>Статус</dt><dd>{r.actuality}</dd>
          {r.check_text && <><dt>Сверка</dt><dd>{r.check_text}</dd></>}
          {r.class_reason && <><dt>Почему {r.cls}</dt><dd>{r.class_reason}</dd></>}
        </dl>
        {r.quote && <div className="quote"><Quote size={16} aria-hidden="true" /><span>{r.quote}</span></div>}
        {sup && showSupplier && <ContactList s={sup} />}
      </details>
    </article>
  )
}

/* ============ карточка позиции ============ */

export function PositionView({ p, records, sups }: { p: Position; records: PRecord[]; sups: Map<string, Supplier> }) {
  const unit = shortUnit(p.base_unit)
  const s = statusInfo(p.status)
  const by = (c: string) => records.filter(r => r.cls === c)
  const firstOpen = (['A', 'B', 'C', 'D'] as const).find(c => by(c).length > 0)
  return (
    <div className="pv">
      <div className="ph">
        <Link href="/prices" className="ph-back" aria-label="Назад к списку"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <span className="mut">{groupShort(p.grp)}</span>
        <span className="grow" />
        <span className={'cb ' + (s.pill === 'ok' ? 'cb-A' : s.pill === 'warn' ? 'cb-B' : 'cb-D')}>{s.label}</span>
      </div>
      <h1>{p.name}</h1>

      <section className="hero2">
        {p.rec_price != null ? (
          <>
            <div className="h2-l"><BadgeCheck size={16} aria-hidden="true" />Цена в расчёт</div>
            <div className="h2-big tok">{fmt(p.rec_price)} ₸<small>за {unit}, без НДС</small></div>
          </>
        ) : p.ref_price != null ? (
          <>
            <div className="h2-l"><Info size={16} aria-hidden="true" />Ориентир, не подтверждена</div>
            <div className="h2-big">~{fmt(p.ref_price)} ₸<small>за {unit}, без НДС</small></div>
          </>
        ) : (
          <>
            <div className="h2-l"><CircleHelp size={16} aria-hidden="true" />Цен пока нет</div>
            <div className="h2-big mutc">нужен запрос</div>
          </>
        )}
        <div className="h2-stats">
          <div><b>{p.a_suppliers}</b><span>подтвердили</span></div>
          <div><b>{p.n_records}</b><span>предложений</span></div>
          <div><b>{p.spread_all != null ? pctFmt(p.spread_all) : 'нет'}</b><span>разброс цен</span></div>
        </div>
        <dl className="kv" style={{ marginTop: 12 }}>
          <dt>Свежая дата</dt><dd>{dmy(p.newest)}</dd>
          <dt>Актуальность</dt><dd>{p.fresh_days} дней{p.volatile ? ', цена быстро меняется' : ''}</dd>
          {p.old_price != null && <><dt>Прошлый ВОР</dt><dd>{fmt(p.old_price)} ₸</dd></>}
        </dl>
        {p.explanation && <details className="oc-more"><summary>Откуда разброс<ChevronDown size={18} aria-hidden="true" /></summary><div className="quote"><Info size={16} aria-hidden="true" /><span>{p.explanation}</span></div></details>}
      </section>

      {(['A', 'B', 'C', 'D'] as const).map(c => by(c).length > 0 && (
        <details key={c} className="cs" open={c === firstOpen || c === 'A' || c === 'B'}>
          <summary><ClassBadge c={c} /><span className="grow" /><span className="cnt">{by(c).length}</span><ChevronDown size={18} className="flt-chev" aria-hidden="true" /></summary>
          {by(c).map(r => <OfferCard key={r.id} r={r} sup={sups.get(r.supplier_id)} unit={unit} />)}
        </details>
      ))}
      {!records.length && <p className="empty-hint">Предложений пока нет. Нужен запрос поставщикам.</p>}
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
          <span className="pc-meta"><span className="mini">{s.n_records} {s.n_records === 1 ? 'цена' : 'цен'}</span>{s.last_price_date && <span>последняя {dmyShort(s.last_price_date)}</span>}</span>
        </span>
      </Link>
      {phone ? <a className="sr-call" href={telHref(phone)} aria-label={`Позвонить ${s.name}`}><Phone size={20} aria-hidden="true" /></a>
        : <span className="sr-call off" aria-hidden="true"><Phone size={20} /></span>}
    </div>
  )
}

const SUP_TABS: [string, string][] = [['', 'Все'], ['tel', 'С телефоном'], ['maker', 'Заводы и базы'], ['nocontact', 'Без контактов']]

export function SuppliersView({ rows, total, page, pages, q, f }: { rows: Supplier[]; total: number; page: number; pages: number; q: string; f: string }) {
  const href = (o: Record<string, string | number>) => {
    const sp = new URLSearchParams()
    const m: Record<string, string> = { q, f, p: '', ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }
    for (const [k, v] of Object.entries(m)) if (v && !(k === 'p' && v === '1')) sp.set(k, v)
    const s = sp.toString()
    return '/prices/suppliers' + (s ? '?' + s : '')
  }
  return (
    <div className="pv">
      <h1>Поставщики</h1>
      <Segment active="sup" />
      <form className="sb" action="/prices/suppliers">
        <label className="sb-field">
          <Search size={20} aria-hidden="true" />
          <input type="text" name="q" defaultValue={q} placeholder="Название, город, товар…" aria-label="Поиск поставщика" enterKeyHint="search" />
          {q && <Link href={href({ q: '', p: 1 })} className="sb-x" aria-label="Очистить поиск"><X size={18} aria-hidden="true" /></Link>}
        </label>
        {f && <input type="hidden" name="f" value={f} />}
      </form>
      <div className="chips">
        {SUP_TABS.map(([v, label]) => <Link key={v} href={href({ f: v, p: 1 })} className={'fc' + (f === v ? ' on' : '')}>{label}</Link>)}
      </div>
      <div className="pcs">
        {rows.map(s => <SupplierRow key={s.id} s={s} />)}
        {!rows.length && <p className="empty-hint">Никого не найдено.</p>}
      </div>
      <Pager page={page} pages={pages} total={total} prev={page > 1 ? href({ p: page - 1 }) : null} next={page < pages ? href({ p: page + 1 }) : null} />
    </div>
  )
}

export function SupplierView({ s, records, pos }: { s: Supplier; records: PRecord[]; pos: Map<string, { name: string; base_unit: string | null }> }) {
  return (
    <div className="pv">
      <div className="ph">
        <Link href="/prices/suppliers" className="ph-back" aria-label="Назад к списку"><ArrowLeft size={20} aria-hidden="true" /></Link>
        <span className="mut">{TYPE_LABEL[typeKind(s.type)]}</span>
        <span className="grow" />
        <span className="cb cb-D">{records.length} цен</span>
      </div>
      <h1>{s.name}</h1>
      <section className="hero2">
        <ContactButtons s={s} />
        <ContactList s={s} />
        <dl className="kv" style={{ marginTop: 12 }}>
          <dt>Город</dt><dd>{s.city ?? 'не указан'}{s.marketplace ? `, площадка ${s.marketplace}` : ''}</dd>
          {s.grp && <><dt>Товары</dt><dd>{s.grp}</dd></>}
          {s.last_price_date && <><dt>Последняя цена</dt><dd>{dmy(s.last_price_date)}</dd></>}
        </dl>
        {s.note && <details className="oc-more"><summary>Заметка<ChevronDown size={18} aria-hidden="true" /></summary><div className="quote"><Info size={16} aria-hidden="true" /><span>{s.note}</span></div></details>}
      </section>
      <div className="sec"><h2>Его цены</h2></div>
      <div className="pcs">
        {records.map(r => {
          const p = pos.get(r.pid)
          return (
            <Link key={r.id} href={`/prices/${r.position_key}`} className="pc">
              <span className="pc-body">
                <span className="pc-name">{p?.name ?? r.position_key}</span>
                <span className="pc-meta"><ClassBadge c={r.cls} /><ActBadge kind={r.act_kind} date={r.price_date} /></span>
              </span>
              <span className="pc-price"><b>{fmt(r.ex_vat)} ₸</b><small>за {shortUnit(p?.base_unit)}</small></span>
              <ChevronRight className="pc-chev" aria-hidden="true" />
            </Link>
          )
        })}
        {!records.length && <p className="empty-hint">Цен нет.</p>}
      </div>
    </div>
  )
}
