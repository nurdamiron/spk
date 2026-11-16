import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="loginwrap">
      <div className="loginbox">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/icons/icon-192.png" alt="" width={84} height={84} />
        <h1>Строй Трекер</h1>
        <p className="mut sub">Войдите по имени и паролю, которые вам дал владелец.</p>
        <div className="card">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
