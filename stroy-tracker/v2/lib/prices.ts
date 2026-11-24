// Общие помощники раздела «Цены». Только отображение, без обращения к базе.

export type Position = {
  pid: string; key: string; grp: string; name: string; base_unit: string | null; volatile: boolean; fresh_days: number
  n_records: number; a_suppliers: number; median_a: number | null; min_a: number | null; max_a: number | null; spread_a: number | null
  newest: string | null; rec_price: number | null; ref_price: number | null; old_price: number | null
  status: string | null; explanation: string | null; spread_all: number | null
}
export type Supplier = {
  id: string; name: string; form: string | null; bin: string | null; type: string | null; marketplace: string | null; city: string | null
  site: string | null; company_url: string | null; contacts_raw: string | null; grp: string | null; n_records: number
  reliability: string | null; contact_status: string | null; last_price_date: string | null; note: string | null
}
export type PRecord = {
  id: string; pid: string; position_key: string; supplier_id: string; price: number | null; unit: string | null; vat: string | null
  delivery: string | null; conv: number | null; ex_vat: number | null; price_date: string | null; date_type: string | null
  valid_until: string | null; age_days: number | null; fresh_days: number | null; actuality: string | null
  act_kind: 'actual' | 'stale' | 'expired' | 'nodate'; cls: 'A' | 'B' | 'C' | 'D'; class_reason: string | null; in_calc: boolean
  url: string | null; final_url: string | null; quote: string | null; check_text: string | null; live: boolean
  region: string | null; note: string | null
}

export const fmt = (n: number | null | undefined) => (n == null ? 'нет' : Math.round(Number(n)).toLocaleString('ru-RU'))
export const pctFmt = (n: number | null | undefined) => (n == null ? 'нет' : Math.round(Number(n) * 100) + '%')

/** ISO 2026-11-16 в 16.11.2026 */
export const dmy = (d: string | null | undefined) => {
  if (!d) return 'нет'
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d
}

/** Ссылку показываем только если это http(s): данные собраны с чужих сайтов. */
export const safeUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : null)

export const CLS_LABEL: Record<string, string> = { A: 'A · подтверждена', B: 'B · ориентир', C: 'C · по запросу', D: 'D · не принята' }
export const CLS_PILL: Record<string, string> = { A: 'ok', B: 'warn', C: 'info', D: 'mute' }
export const ACT_PILL: Record<string, string> = { actual: 'ok', stale: 'warn', expired: 'bad', nodate: 'mute' }
export const ACT_SHORT: Record<string, string> = { actual: 'актуально', stale: 'устарело', expired: 'срок истёк', nodate: 'нет даты' }

export function statusInfo(status: string | null): { label: string; pill: string } {
  const s = status ?? ''
  if (s === 'готово') return { label: 'готово', pill: 'ok' }
  if (s.startsWith('частично')) return { label: 'частично', pill: 'warn' }
  return { label: 'нужен запрос', pill: 'mute' }
}

export type Contacts = { phones: string[]; emails: string[]; other: string[]; source: string | null }

/** «+7 775 506-27-74; mail@x.kz; Алматы, ул. … (источник: https://…)» в части. */
export function parseContacts(raw: string | null | undefined): Contacts {
  const out: Contacts = { phones: [], emails: [], other: [], source: null }
  if (!raw) return out
  let s = raw
  const src = /\((?:источник|source)[:\s]+(https?:\/\/[^)\s]+)\)/i.exec(s)
  if (src) { out.source = src[1]; s = s.replace(src[0], '') }
  for (const part of s.split(/;/).map(x => x.trim()).filter(Boolean)) {
    if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(part)) out.emails.push(part)
    else if (/^\+?[\d\s()\-]{9,}$/.test(part)) out.phones.push(part)
    else if (/WhatsApp/i.test(part)) out.phones.push(part.replace(/^WhatsApp\s*/i, '') + ' (WhatsApp)')
    else out.other.push(part)
  }
  return out
}
export const telHref = (p: string) => 'tel:' + p.replace(/[^\d+]/g, '')

// ---------- Отображение для телефона ----------

/** Короткие названия групп, чтобы заголовки не занимали пол-экрана. */
export const GROUP_SHORT: Record<string, string> = {
  'Дорожные и нерудные материалы': 'Дороги и нерудка',
  'Бетон': 'Бетон',
  'Металл, прокат, трубы': 'Металл и трубы',
  'ЖБИ, плитка, благоустройство (изделия)': 'ЖБИ и плитка',
  'Гидроизоляция, утеплитель': 'Гидроизоляция',
  'Оборудование и арматура НС/ВК/ПТ': 'Оборудование',
  'Озеленение (растения, газон)': 'Озеленение',
  'Работы и услуги': 'Работы',
  'Электрика и слаботочные системы': 'Электрика',
  'Трубы и фитинги инженерных сетей': 'Сети и фитинги',
  'Спецтехника и транспорт (аренда)': 'Спецтехника',
  'Общестроительные и отделочные материалы': 'Общестрой',
}
export const groupShort = (g: string | null | undefined) => (g ? GROUP_SHORT[g] ?? g : 'Прочее')

/** «₸/м³ (₸/рейс ÷ вместимость)» в «м³»; «₸/т» в «т». */
export function shortUnit(u: string | null | undefined): string {
  if (!u) return 'ед.'
  const first = u.split(/\s*\(/)[0].trim()
  return first.replace(/^₸\s*\/\s*/, '') || 'ед.'
}

/** Тип поставщика в одну категорию для значка. */
export type TypeKind = 'maker' | 'dealer' | 'shop' | 'contractor' | 'unknown'
export function typeKind(t: string | null | undefined): TypeKind {
  const s = (t ?? '').toLowerCase()
  if (s.includes('производ')) return 'maker'
  if (s.includes('оптов') || s.includes('дилер') || s.includes('база')) return 'dealer'
  if (s.includes('подряд')) return 'contractor'
  if (s.includes('розниц') || s.includes('маркетплейс')) return 'shop'
  return 'unknown'
}
export const TYPE_LABEL: Record<TypeKind, string> = { maker: 'Производитель', dealer: 'База или дилер', shop: 'Магазин', contractor: 'Подрядчик', unknown: 'Тип не определён' }

/** Короткая дата: 16.11.26 */
export const dmyShort = (d: string | null | undefined) => {
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : ''
}

/** Номер для WhatsApp: только казахстанские мобильные +7 7xx. */
export function waHref(p: string): string | null {
  const d = p.replace(/[^\d]/g, '')
  const n = d.length === 11 && (d.startsWith('7') || d.startsWith('8')) ? '7' + d.slice(1) : d.length === 10 ? '7' + d : ''
  return n.startsWith('77') && n.length === 11 ? `https://wa.me/${n}` : null
}
