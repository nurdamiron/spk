'use client'
import { useActionState } from 'react'
import { createObject, type State } from '../../actions'

export function NewObjectForm() {
  const [s, action, pending] = useActionState<State, FormData>(createObject, { error: '' })
  return (
    <form action={action}>
      <label className="field"><span>Название объекта</span><input name="name" type="text" placeholder="Коктобе 138, НВК" required /></label>
      <label className="field"><span>Заказчик</span><input name="customer" type="text" placeholder="ТОО Заказчик" /></label>
      <label className="field"><span>КП или ВОР в Excel</span><input name="file" type="file" accept=".xlsx,.xls" required /></label>
      <label className="field"><span>Плановая себестоимость в процентах от цены, если нет колонки</span><input name="cost_pct" type="number" inputMode="numeric" defaultValue={70} min={1} max={99} /></label>
      {s.error && <div className="err" role="alert">{s.error}</div>}
      <button className="btn pri big" disabled={pending}>{pending ? 'Загружаем…' : 'Создать объект'}</button>
    </form>
  )
}
