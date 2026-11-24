'use client'
import { useActionState, useState } from 'react'
import { createUser, type State } from '../actions'

const ROLES = [['foreman', 'Прораб'], ['cashier', 'Кассир'], ['owner', 'Владелец']] as const

export function UserForm({ objects }: { objects: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState<State, FormData>(createUser, { error: '' })
  const [role, setRole] = useState<string>('foreman')
  return (
    <form action={action}>
      <div className="lbl">Кто это</div>
      <div className="roles" role="radiogroup" aria-label="Роль">
        {ROLES.map(([v, label]) => (
          <label key={v}><input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} /><span>{label}</span></label>
        ))}
      </div>
      <label className="field"><span>Имя (по нему входит)</span><input name="name" type="text" placeholder="Ерлан" required /></label>
      <label className="field"><span>Пароль, от 6 символов</span><input name="password" type="text" autoComplete="off" required /></label>
      {role === 'foreman' && (
        <label className="field"><span>Объект</span>
          <select name="object_id" defaultValue=""><option value="">Назначу позже</option>{objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        </label>
      )}
      {s.error && <div className="err" role="alert">{s.error}</div>}
      {s.ok && <div className="sig ok" role="status">{s.ok}</div>}
      <button className="btn pri big" disabled={pending}>{pending ? 'Создаём…' : 'Создать аккаунт'}</button>
    </form>
  )
}
