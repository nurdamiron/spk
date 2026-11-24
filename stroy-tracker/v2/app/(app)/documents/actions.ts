'use server'
import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/session'
import { db as getDb } from '@/lib/db'
import { DEMO_MSG } from '@/lib/demo'

export type DocState = { error: string; ok?: string }
const KINDS = ['contract', 'invoice', 'act', 'other']
const STATUSES = ['waiting', 'paid', 'overdue', 'cancelled']
const date = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '')
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export async function createDocument(_: DocState, form: FormData): Promise<DocState> {
  const me = await requireProfile(['owner', 'cashier'])
  if (me.demo) return { error: DEMO_MSG }
  const object_id = String(form.get('object_id') ?? '')
  const kind = String(form.get('kind') ?? '')
  const amountRaw = String(form.get('amount') ?? '').replace(/\s/g, '').replace(',', '.')
  const amount = amountRaw ? Math.round(Number(amountRaw)) : null
  if (!object_id) return { error: 'Выберите объект' }
  if (!KINDS.includes(kind)) return { error: 'Выберите тип документа' }
  if (amount !== null && !(amount >= 0 && amount < 1e12)) return { error: 'Сумма указана неверно' }

  const db = await getDb()
  const { error } = await db.from('documents').insert({
    object_id, kind,
    number: String(form.get('number') ?? '').trim().slice(0, 60) || null,
    counterparty: String(form.get('counterparty') ?? '').trim().slice(0, 120) || null,
    amount,
    doc_date: date(form.get('doc_date')),
    due_date: date(form.get('due_date')),
    created_by: me.id,
  })
  if (error) return { error: 'Не удалось сохранить документ' }
  revalidatePath('/documents')
  return { error: '', ok: 'Документ добавлен' }
}

export async function setDocumentStatus(form: FormData): Promise<void> {
  const me = await requireProfile(['owner', 'cashier'])
  if (me.demo) return
  const id = String(form.get('id') ?? '')
  const status = String(form.get('status') ?? '')
  if (!id || !STATUSES.includes(status)) return
  const db = await getDb()
  const old = await db.from('documents').select('status').eq('id', id).maybeSingle()
  await db.from('documents').update({ status }).eq('id', id)
  await db.from('audit_log').insert({ table_name: 'documents', row_id: id, field: 'status', old_value: old.data?.status ?? null, new_value: status, changed_by: me.id, source: 'site' })
  revalidatePath('/documents')
}
