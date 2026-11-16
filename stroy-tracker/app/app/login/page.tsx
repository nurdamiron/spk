import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="loginwrap">
      <div className="loginbox">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Строй Трекер</h1>
          <p className="mut" style={{ marginTop: 0 }}>Войдите по имени и паролю, которые вам дал владелец.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
