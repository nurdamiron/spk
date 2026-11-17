'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardCheck, Clock, House, Tags, Users, Wallet, type LucideIcon } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = { home: House, wallet: Wallet, check: ClipboardCheck, clock: Clock, users: Users, tags: Tags }
export type NavLink = { href: string; label: string; icon: keyof typeof ICONS }

export function Nav({ links }: { links: NavLink[] }) {
  const path = usePathname()
  return (
    <nav aria-label="Главное меню">
      {links.map(l => {
        const on = l.href === '/' ? path === '/' || path.startsWith('/objects') : path.startsWith(l.href)
        return (
          <Link key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            {(() => { const Icon = ICONS[l.icon]; return <Icon aria-hidden="true" strokeWidth={1.8} /> })()}
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
