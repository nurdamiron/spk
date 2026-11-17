import Link from 'next/link'
import { ACT_PILL, ACT_SHORT, CLS_LABEL, CLS_PILL, dmy, fmt, parseContacts, safeUrl, telHref, type PRecord, type Supplier } from '@/lib/prices'

export function Contacts({ s }: { s: Pick<Supplier, 'contacts_raw' | 'site' | 'company_url' | 'bin'> }) {
  const c = parseContacts(s.contacts_raw)
  const site = safeUrl(s.site)
  const comp = safeUrl(s.company_url)
  const src = safeUrl(c.source)
  const nothing = !c.phones.length && !c.emails.length && !site && !comp
  return (
    <div className="pr-links">
      {c.phones.map(p => <a key={p} href={telHref(p)}>{p}</a>)}
      {c.emails.map(e => <a key={e} href={'mailto:' + e}>{e}</a>)}
      {site && <a href={site} target="_blank" rel="noopener noreferrer">сайт</a>}
      {comp && <a href={comp} target="_blank" rel="noopener noreferrer">страница компании</a>}
      {src && src !== site && <a href={src} target="_blank" rel="noopener noreferrer">источник контактов</a>}
      {c.other.map(o => <span key={o} className="mut">{o}</span>)}
      {s.bin && <span className="mut">БИН {s.bin}</span>}
      {nothing && <span className="mut">публичных контактов нет</span>}
    </div>
  )
}

/** Одно предложение: цена, дата и актуальность, класс, источник, цитата. */
export function Offer({ r, sup, showSupplier = true, posName }: { r: PRecord; sup?: Supplier; showSupplier?: boolean; posName?: string }) {
  const link = safeUrl(r.url)
  const same = r.unit && r.price != null
  return (
    <div className="gi">
      <div className="row">
        <b className="grow">
          {showSupplier && sup ? <Link href={`/prices/suppliers/${sup.id}`}>{sup.name}</Link> : posName ? <Link href={`/prices/${r.position_key}`}>{posName}</Link> : r.id}
        </b>
        <span className={'pill ' + CLS_PILL[r.cls]}>{CLS_LABEL[r.cls]}</span>
      </div>
      {showSupplier && sup && <div className="mut">{sup.type ?? 'тип не определён'} · {r.region ?? sup.city ?? 'город не указан'}</div>}
      {!showSupplier && sup && <div className="mut"><Link href={`/prices/suppliers/${sup.id}`}>{sup.name}</Link> · {r.region ?? sup.city ?? 'город не указан'}</div>}
      <div className="pr-price">
        {fmt(r.ex_vat)} ₸ <span className="mut" style={{ fontWeight: 500 }}>без НДС за базовую единицу</span>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className={'pill ' + ACT_PILL[r.act_kind]}>{ACT_SHORT[r.act_kind]}</span>
        <span className="mut">{r.act_kind === 'nodate' ? 'дата цены не указана на источнике' : `цена от ${dmy(r.price_date)}${r.age_days != null ? `, ${r.age_days} дн.` : ''}`}</span>
      </div>
      <dl className="pr-kv">
        {same && <><dt>На сайте</dt><dd>{fmt(r.price)} {r.unit}{r.conv && r.conv !== 1 ? ` (пересчёт ×${Number(r.conv).toPrecision(4).replace(/\.?0+$/, '')})` : ''}</dd></>}
        <dt>НДС</dt><dd>{r.vat ?? 'нет данных'}</dd>
        <dt>Доставка</dt><dd>{r.delivery ?? 'нет данных'}</dd>
        {r.price_date && <><dt>Дата цены</dt><dd>{dmy(r.price_date)}{r.date_type ? `, ${r.date_type}` : ''}{r.valid_until ? `, действует до ${dmy(r.valid_until)}` : ''}</dd></>}
        <dt>Статус</dt><dd>{r.actuality}</dd>
        {r.check_text && <><dt>Сверка</dt><dd>{r.check_text}</dd></>}
        {r.class_reason && <><dt>Почему класс {r.cls}</dt><dd>{r.class_reason}</dd></>}
      </dl>
      {r.quote && <div className="pr-quote">Цитата: {r.quote}</div>}
      {r.note && <div className="pr-note">{r.note.slice(0, 400)}</div>}
      <div className="pr-links">
        {link ? <a href={link} target="_blank" rel="noopener noreferrer">открыть источник цены</a> : <span className="mut">ссылки нет</span>}
      </div>
      {sup && showSupplier && <Contacts s={sup} />}
    </div>
  )
}
