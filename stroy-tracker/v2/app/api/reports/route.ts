import { NextResponse } from 'next/server'
import { getProfile, canSeeObject } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { todayAlmaty } from '@/lib/config'

export const maxDuration = 60

type Payload = {
  clientId: string
  object_id: string
  report_date: string
  progress: { kp_item_id: string; qty: number }[]
  labor: { crew_id: string; value: number }[]
  expenses: { category: string; amount: number; has_esf: boolean; funding: string; kp_item_id: string | null; has_receipt: boolean; comment: string }[]
  notes?: { done?: string; not_done?: string; reason?: string }
  headcount?: { label: string; people: number; hours?: number | null }[]
  equipment?: { name: string; qty: number }[]
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(+new Date(s))
const CATS = ['Материал', 'Топливо', 'Доставка', 'Техника', 'Прочее']

export async function POST(req: Request) {
  const p = await getProfile()
  if (!p || !p.active) return fail('Нужно войти', 401)
  if (p.role !== 'foreman' && p.role !== 'owner') return fail('Нет доступа', 403)
  if (p.demo) return NextResponse.json({ id: 'demo', demo: true }) // демо: отчёт принимаем, но не сохраняем и фото не грузим

  let body: Payload
  let photos: File[] = []
  try {
    const fd = await req.formData()
    body = JSON.parse(String(fd.get('payload')))
    photos = fd.getAll('photo').filter((x): x is File => x instanceof File && x.size > 0)
  } catch {
    return fail('Отчёт повреждён, соберите его заново')
  }

  const today = todayAlmaty()
  if (!body.clientId || typeof body.clientId !== 'string' || body.clientId.length > 80) return fail('Нет номера отчёта')
  if (!isDate(body.report_date) || body.report_date > today) return fail('Дата отчёта указана неверно')
  if (!(await canSeeObject(p, body.object_id))) return fail('Этот объект вам не назначен', 403)
  if (photos.length > 10 || photos.some(f => f.size > 4_000_000)) return fail('Слишком много или слишком тяжёлые фото')

  const db = admin()
  const dup = await db.from('reports').select('id').eq('client_id', body.clientId).maybeSingle()
  if (dup.data) return NextResponse.json({ id: dup.data.id, duplicate: true })

  const [items, crews] = await Promise.all([
    db.from('kp_items').select('id, qty').eq('object_id', body.object_id),
    db.from('crews').select('id, rate_type, rate, kp_item_id').eq('object_id', body.object_id),
  ])
  const itemQty = new Map((items.data ?? []).map(i => [i.id, Number(i.qty)]))
  const crewById = new Map((crews.data ?? []).map(c => [c.id, c]))

  const progress = (body.progress ?? []).filter(x => itemQty.has(x.kp_item_id) && x.qty > 0 && x.qty < 1e7)
  if ((body.progress ?? []).length !== progress.length) return fail('В отчёте есть позиция, которой нет в КП этого объекта')

  const doneToday = new Map<string, number>()
  for (const x of progress) doneToday.set(x.kp_item_id, (doneToday.get(x.kp_item_id) ?? 0) + Number(x.qty))

  const labor: { crew_id: string; qty: number; amount: number }[] = []
  for (const l of body.labor ?? []) {
    const c = crewById.get(l.crew_id)
    if (!c) return fail('В отчёте есть бригада, которой нет на этом объекте')
    const v = Number(l.value)
    if (c.rate_type === 'hour' || c.rate_type === 'day') {
      const max = c.rate_type === 'hour' ? 24 : 3
      if (!(v > 0 && v <= max)) return fail(`Укажите ${c.rate_type === 'hour' ? 'часы (до 24)' : 'дни (до 3)'}`)
      labor.push({ crew_id: c.id, qty: v, amount: Math.round(v * Number(c.rate)) })
    } else if (c.kp_item_id) {
      const q = doneToday.get(c.kp_item_id) ?? 0
      if (q <= 0) continue
      labor.push({
        crew_id: c.id, qty: q,
        amount: c.rate_type === 'volume' ? Math.round(q * Number(c.rate)) : Math.round((Number(c.rate) * q) / (itemQty.get(c.kp_item_id) || 1)),
      })
    }
  }

  const expenses = []
  for (const e of body.expenses ?? []) {
    const amount = Math.round(Number(e.amount))
    if (!(amount > 0 && amount < 1e10)) return fail('Сумма расхода указана неверно')
    if (e.kp_item_id && !itemQty.has(e.kp_item_id)) return fail('Расход привязан к позиции, которой нет в КП')
    expenses.push({
      object_id: body.object_id,
      category: CATS.includes(e.category) ? e.category : 'Прочее',
      amount, has_esf: !!e.has_esf,
      funding: ['imprest', 'office', 'transfer'].includes(e.funding) ? e.funding : 'imprest',
      kp_item_id: e.kp_item_id || null, has_receipt: !!e.has_receipt,
      comment: String(e.comment ?? '').slice(0, 300) || null,
    })
  }
  const clip = (v: unknown) => String(v ?? '').trim().slice(0, 1000)
  const notes = { done: clip(body.notes?.done), not_done: clip(body.notes?.not_done), reason: clip(body.notes?.reason) }
  const hasNotes = !!(notes.done || notes.not_done || notes.reason)
  const headcount = (body.headcount ?? [])
    .map(h => ({ label: clip(h.label).slice(0, 80), people: Math.round(Number(h.people)), hours: h.hours ? Number(h.hours) : null }))
    .filter(h => h.label && h.people >= 0 && h.people < 10000 && (h.hours === null || (h.hours > 0 && h.hours <= 24)))
  const equipment = (body.equipment ?? [])
    .map(e => ({ name: clip(e.name).slice(0, 80), qty: Number(e.qty) }))
    .filter(e => e.name && e.qty > 0 && e.qty < 1000)
  if (!progress.length && !labor.length && !expenses.length && !hasNotes && !headcount.length && !equipment.length) return fail('Отчёт пустой')

  const { data: rep, error } = await db
    .from('reports')
    .insert({ client_id: body.clientId, object_id: body.object_id, report_date: body.report_date, author_id: p.id, backdated: body.report_date < today })
    .select('id')
    .single()
  if (error || !rep) return fail('Не удалось сохранить отчёт', 500)

  try {
    const steps = []
    if (progress.length) steps.push(db.from('progress_entries').insert(progress.map(x => ({ report_id: rep.id, kp_item_id: x.kp_item_id, qty: x.qty }))))
    if (labor.length) steps.push(db.from('labor_entries').insert(labor.map(x => ({ ...x, report_id: rep.id }))))
    if (expenses.length) steps.push(db.from('expenses').insert(expenses.map(x => ({ ...x, report_id: rep.id }))))
    if (hasNotes) steps.push(db.from('report_notes').insert({ report_id: rep.id, ...notes }))
    if (headcount.length) steps.push(db.from('headcount_entries').insert(headcount.map(x => ({ ...x, report_id: rep.id }))))
    if (equipment.length) steps.push(db.from('equipment_entries').insert(equipment.map(x => ({ report_id: rep.id, name: x.name, qty: x.qty }))))
    for (const r of await Promise.all(steps)) if (r.error) throw r.error

    for (let i = 0; i < photos.length; i++) {
      const path = `${body.object_id}/${rep.id}/${i}.jpg`
      const up = await db.storage.from('photos').upload(path, await photos[i].arrayBuffer(), { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      await db.from('report_photos').insert({ report_id: rep.id, path })
    }
  } catch {
    await db.from('reports').delete().eq('id', rep.id)
    return fail('Не удалось сохранить отчёт, попробуйте ещё раз', 500)
  }
  return NextResponse.json({ id: rep.id })
}
