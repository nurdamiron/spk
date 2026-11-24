'use client'
import { useActionState } from 'react'
import { login } from './actions'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: '' })
  return (
    <form action={action}>
      <label className="field">
        <span>Имя</span>
        <input name="login" type="text" autoComplete="username" autoCapitalize="words" placeholder="Например: Ерлан" required />
      </label>
      <label className="field">
        <span>Пароль</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <div className="err" role="alert">{state.error}</div>}
      <button className="btn pri big" disabled={pending}>{pending ? 'Входим…' : 'Войти'}</button>
    </form>
  )
}
