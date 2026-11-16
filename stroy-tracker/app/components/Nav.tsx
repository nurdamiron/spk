'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS: Record<string, string> = {
  home: 'M4 21V8l8-5 8 5v13 M9 21v-6h6v6',
  wallet: 'M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M3 10h18 M16 15h.01',
  check: 'M9 4h6v3H9z M7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1 M8 13l3 3 5-6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  users: 'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6 M16 5a3.5 3.5 0 0 1 0 6.5 M18 14.2c2 .6 3.5 2.6 3.5 5.8',
}
export type NavLink = { href: string; label: string; icon: keyof typeof ICONS }

export function Nav({ links }: { links: NavLink[] }) {
  const path = usePathname()
  return (
    <nav aria-label="Главное меню">
      {links.map(l => {
        const on = l.href === '/' ? path === '/' || path.startsWith('/objects') : path.startsWith(l.href)
        return (
          <Link key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {ICONS[l.icon].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
            </svg>
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
