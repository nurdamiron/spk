'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as XLSX from 'xlsx'
import { requireProfile } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { db as getDb } from '@/lib/db'
import { DEMO_MSG } from '@/lib/demo'
import { normalizeLogin, loginToEmail } from '@/lib/config'

export type State = { error: string; ok?: string }
const bad = (error: string): State => ({ error })
const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v.replace(/\s/g, '').replace(',', '.'))
  return NaN
}
const refresh = () => revalidatePath('/', 'layout')

/* ---------- объект из КП в Excel ---------- */
export async function createObject(_: State, form: FormData): Promise<State> {
  const me = await requireProfile(['owner'])
  if (me.demo) return bad(DEMO_MSG)
  const name = String(form.get('name') ?? '').trim()
  const customer = String(form.get('customer') ?? '').trim()
  const costPct = toNum(form.get('cost_pct') ?? 70)
  const file = form.get('file')
  if (!name) return bad('Введите название объекта')
  if (!(file instanceof File) || !file.size) return bad('Приложите файл КП или ВОР в формате Excel')
  if (file.size > 5_000_000) return bad('Файл больше 5 МБ')
  if (!(costPct > 0 && costPct < 100)) return bad('Себестоимость укажите в процентах от цены, например 70')

  let rows: unknown[][]
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true })
  } catch {
    return bad('Не удалось прочитать файл. Сохраните его как .xlsx и попробуйте снова')
  }

  const find = (re: RegExp, row: unknown[]) => row.findIndex(c => typeof c === 'string' && re.test(c))
  const hi = rows.findIndex(r => find(/наименован/i, r) >= 0 && find(/кол/i, r) >= 0)
  if (hi < 0) return bad('Не нашёл строку с заголовками. Нужны колонки «Наименование», «Ед.», «Кол-во» и «Цена»')
  const h = rows[hi]
  const col = { name: find(/наименован/i, h), unit: find(/^ед/i, h), qty: find(/кол/i, h), price: find(/цена/i, h), cost: find(/себестоим/i, h) }
  if (col.unit < 0 || col.price < 0) return bad('Не нашёл колонки «Ед.» и «Цена»')

  const items: { name: string; unit: string; qty: number; price: number; cost: number; sort: number }[] = []
  for (const r of rows.slice(hi + 1)) {
    const nm = r[col.name]
    const qty = toNum(r[col.qty])
    const price = toNum(r[col.price])
    const unit = r[col.unit]
    if (typeof nm !== 'string' || !nm.trim() || typeof unit !== 'string' || !(qty > 0) || !(price >= 0)) continue
    const costCell = col.cost >= 0 ? toNum(r[col.cost]) : NaN
    items.push({ name: nm.trim(), unit: unit.trim(), qty, price: Math.round(price), cost: Math.round(Number.isFinite(costCell) ? costCell : (price * costPct) / 100), sort: items.length })
  }
  if (!items.length) return bad('В файле не нашёл ни одной позиции с названием, единицей, объёмом и ценой')
  if (items.length > 500) return bad('В КП больше 500 позиций, это слишком много для одного объекта')

  const db = await getDb()
  const { data: o, error } = await db.from('objects').insert({ name, customer: customer || null }).select('id').single()
  if (error || !o) return bad('Не удалось создать объект')
  const { error: e2 } = await db.from('kp_items').insert(items.map(i => ({ ...i, object_id: o.id })))
  if (e2) {
    await db.from('objects').delete().eq('id', o.id)
    return bad('Не удалось сохранить позиции КП')
  }
  refresh()
  redirect(`/objects/${o.id}`)
}

/* ---------- бригады и выдачи ---------- */
export async function addCrew(form: FormData) {
  const me = await requireProfile(['owner'])
  if (me.demo) return
  const object_id = String(form.get('object_id'))
  const name = String(form.get('name') ?? '').trim()
  const rate_type = String(form.get('rate_type'))
  const rate = Math.round(toNum(form.get('rate')))
  const kp = String(form.get('kp_item_id') ?? '')
  if (!name || !['hour', 'day', 'volume', 'fixed'].includes(rate_type) || !(rate > 0)) return
  await (await getDb()).from('crews').insert({ object_id, name, rate_type, rate, kp_item_id: kp || null })
  refresh()
}

export async function addPayout(form: FormData) {
  const p = await requireProfile(['owner', 'cashier'])
  if (p.demo) return
  const amount = Math.round(toNum(form.get('amount')))
  if (!(amount > 0)) return
  await (await getDb()).from('payouts').insert({ crew_id: String(form.get('crew_id')), amount, kind: 'advance', created_by: p.id })
  refresh()
}

export async function addImprest(form: FormData) {
  const p = await requireProfile(['owner', 'cashier'])
  if (p.demo) return
  const amount = Math.round(toNum(form.get('amount')))
  const kind = String(form.get('kind')) === 'return' ? 'return' : 'issue'
  if (!(amount > 0)) return
  await (await getDb()).from('imprest_moves').insert({
    holder_id: String(form.get('holder_id')), amount, kind,
    comment: String(form.get('comment') ?? '').trim() || null, created_by: p.id,
  })
  refresh()
}

/* ---------- люди ---------- */
export async function createUser(_: State, form: FormData): Promise<State> {
  const me = await requireProfile(['owner'])
  if (me.demo) return bad(DEMO_MSG)
  const name = String(form.get('name') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const role = String(form.get('role'))
  const objectId = String(form.get('object_id') ?? '')
  if (!name) return bad('Введите имя')
  const login = normalizeLogin(name)
  if (!login) return bad('Имя должно быть от 2 до 40 букв')
  if (password.length < 6) return bad('Пароль не короче 6 символов')
  if (!['foreman', 'cashier', 'owner'].includes(role)) return bad('Выберите роль')

  const db = admin()
  const { data, error } = await db.auth.admin.createUser({ email: loginToEmail(login), password, email_confirm: true })
  if (error || !data.user) return bad(error?.message.includes('already') ? 'Такое имя уже есть. Добавьте фамилию' : 'Не удалось создать аккаунт')
  const { error: e2 } = await db.from('profiles').insert({ id: data.user.id, name, login, role })
  if (e2) {
    await db.auth.admin.deleteUser(data.user.id)
    return bad('Такое имя уже есть. Добавьте фамилию')
  }
  if (objectId && role === 'foreman') await db.from('object_members').insert({ object_id: objectId, user_id: data.user.id })
  refresh()
  return { error: '', ok: `Готово. ${name} входит в приложение по имени «${name}» и паролю, который вы задали` }
}

export async function setActive(form: FormData) {
  const me = await requireProfile(['owner'])
  if (me.demo) return
  const id = String(form.get('user_id'))
  if (id === me.id) return
  await admin().from('profiles').update({ active: form.get('active') === '1' }).eq('id', id)
  refresh()
}

export async function assignMember(form: FormData) {
  const me = await requireProfile(['owner'])
  if (me.demo) return
  const user_id = String(form.get('user_id'))
  const object_id = String(form.get('object_id'))
  if (!object_id) return
  await admin().from('object_members').upsert({ user_id, object_id })
  refresh()
}

export async function unassignMember(form: FormData) {
  const me = await requireProfile(['owner'])
  if (me.demo) return
  await admin().from('object_members').delete().eq('user_id', String(form.get('user_id'))).eq('object_id', String(form.get('object_id')))
  refresh()
}
