'use client'
import { useActionState } from 'react'
import { createDocument, type DocState } from './actions'

export function DocForm({ objects }: { objects: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState<DocState, FormData>(createDocument, { error: '' })
  return (
    <form action={action}>
      <label className="field"><span>Объект</span>
        <select name="object_id" required defaultValue=""><option value="" disabled>Выберите</option>{objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
      </label>
      <label className="field"><span>Тип</span>
        <select name="kind" defaultValue="invoice"><option value="invoice">Счёт</option><option value="contract">Договор</option><option value="act">Акт</option><option value="other">Другое</option></select>
      </label>
      <label className="field"><span>Номер</span><input name="number" type="text" /></label>
      <label className="field"><span>Контрагент</span><input name="counterparty" type="text" /></label>
      <label className="field"><span>Сумма, ₸</span><input name="amount" type="text" inputMode="numeric" /></label>
      <label className="field"><span>Дата документа</span><input name="doc_date" type="date" /></label>
      <label className="field"><span>Срок оплаты</span><input name="due_date" type="date" /></label>
      {s.error && <div className="err" role="alert">{s.error}</div>}
      {s.ok && <div className="sig ok" role="status">{s.ok}</div>}
      <button className="btn pri big" disabled={pending}>{pending ? 'Сохраняем…' : 'Добавить'}</button>
    </form>
  )
}
