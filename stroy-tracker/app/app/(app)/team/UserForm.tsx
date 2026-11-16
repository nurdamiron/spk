'use client'
import { useActionState } from 'react'
import { createUser, type State } from '../actions'

export function UserForm({ objects }: { objects: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState<State, FormData>(createUser, { error: '' })
  return (
    <form action={action}>
      <label className="field"><span>Имя (по нему человек входит)</span><input name="name" type="text" placeholder="Ерлан" required /></label>
      <label className="field"><span>Пароль (не короче 6 символов)</span><input name="password" type="text" autoComplete="off" required /></label>
      <label className="field"><span>Кто это</span>
        <select name="role" defaultValue="foreman"><option value="foreman">Прораб</option><option value="cashier">Кассир</option><option value="owner">Владелец</option></select>
      </label>
      <label className="field"><span>Объект (для прораба)</span>
        <select name="object_id" defaultValue=""><option value="">Назначу позже</option>{objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
      </label>
      {s.error && <div className="err" role="alert">{s.error}</div>}
      {s.ok && <div className="sig ok" role="status">{s.ok}</div>}
      <button className="btn pri big" disabled={pending}>{pending ? 'Создаём…' : 'Создать аккаунт'}</button>
    </form>
  )
}
