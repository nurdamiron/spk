import { HardHat, Crown, Wallet, Sparkles } from 'lucide-react'
import { LoginForm } from './LoginForm'
import { startDemo } from './actions'
import { DEMO_ENABLED } from '@/lib/demo'
import './demo.css'

const ROLES = [
  { role: 'owner', label: 'Владелец', hint: 'объекты, деньги, цены', Icon: Crown },
  { role: 'foreman', label: 'Прораб', hint: 'отчёт за день', Icon: HardHat },
  { role: 'cashier', label: 'Кассир', hint: 'выдачи и баланс', Icon: Wallet },
] as const

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

        {DEMO_ENABLED && (
          <section className="demo-card" aria-label="Демо">
            <div className="demo-h"><Sparkles size={18} aria-hidden="true" /><b>Посмотреть демо</b></div>
            <p className="mut">Без пароля. Объекты, бригады и деньги учебные, поставщики и цены настоящие. Ничего не сохраняется.</p>
            <div className="demo-roles">
              {ROLES.map(({ role, label, hint, Icon }) => (
                <form key={role} action={startDemo}>
                  <input type="hidden" name="role" value={role} />
                  <button className="demo-btn">
                    <Icon size={22} aria-hidden="true" />
                    <span><b>{label}</b><small>{hint}</small></span>
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
