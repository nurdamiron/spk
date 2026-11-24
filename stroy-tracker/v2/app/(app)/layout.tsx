import { requireProfile } from '@/lib/session'
import { Nav, type NavLink } from '@/components/Nav'
import { PwaBits } from '@/components/PwaBits'
import { LogoutButton } from '@/components/LogoutButton'
import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import './demo.css'

const ROLE = { owner: 'Владелец', foreman: 'Прораб', cashier: 'Кассир' } as const

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const p = await requireProfile()
  const links: NavLink[] =
    p.role === 'owner'
      ? [{ href: '/', label: 'Объекты', icon: 'home' }, { href: '/documents', label: 'Документы', icon: 'docs' }, { href: '/prices', label: 'Цены', icon: 'tags' }, { href: '/more', label: 'Ещё', icon: 'more', also: ['/money', '/team', '/inbox'] }]
      : p.role === 'foreman'
        ? [{ href: '/report', label: 'Отчёт', icon: 'check' }, { href: '/history', label: 'История', icon: 'clock' }]
        : [{ href: '/money', label: 'Деньги', icon: 'wallet' }, { href: '/documents', label: 'Документы', icon: 'docs' }]
  return (
    <>
      <header>
        <b className="brand">Строй Трекер</b>
        <span className="sp" />
        <span className="who"><strong>{p.name}</strong>{ROLE[p.role]}</span>
        <LogoutButton />
      </header>
      <main>
        <PwaBits />
        {p.demo && (
          <div className="demobar" role="status">
            <FlaskConical size={18} aria-hidden="true" />
            <span>Демо: объекты учебные, цены настоящие, ничего не сохраняется</span>
            <Link href="/login">Роль</Link>
          </div>
        )}
        {children}
      </main>
      <Nav links={links} />
    </>
  )
}
