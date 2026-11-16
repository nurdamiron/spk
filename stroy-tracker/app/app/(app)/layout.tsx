import { requireProfile } from '@/lib/session'
import { Nav, type NavLink } from '@/components/Nav'
import { PwaBits } from '@/components/PwaBits'
import { LogoutButton } from '@/components/LogoutButton'

const ROLE = { owner: 'Владелец', foreman: 'Прораб', cashier: 'Кассир' } as const

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const p = await requireProfile()
  const links: NavLink[] =
    p.role === 'owner'
      ? [{ href: '/', label: 'Объекты', icon: 'home' }, { href: '/money', label: 'Деньги', icon: 'wallet' }, { href: '/team', label: 'Команда', icon: 'users' }]
      : p.role === 'foreman'
        ? [{ href: '/report', label: 'Отчёт', icon: 'check' }, { href: '/history', label: 'История', icon: 'clock' }]
        : [{ href: '/money', label: 'Деньги', icon: 'wallet' }]
  return (
    <>
      <header>
        <b>Строй Трекер</b>
        <span className="sp" />
        <span className="mut" style={{ textAlign: 'right' }}>{p.name}<br />{ROLE[p.role]}</span>
        <LogoutButton />
      </header>
      <main>
        <PwaBits />
        {children}
      </main>
      <Nav links={links} />
    </>
  )
}
