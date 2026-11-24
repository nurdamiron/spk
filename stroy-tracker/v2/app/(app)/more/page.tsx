import Link from 'next/link'
import { ChevronRight, Users, Wallet } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import './more.css'

/** Всё, что не нужно каждый день: деньги бригад и команда. */
export default async function MorePage() {
  await requireProfile(['owner'])
  return (
    <>
      <h1>Ещё</h1>
      <div className="group">
        <Link href="/money" className="gi more-row">
          <span className="more-ic"><Wallet size={22} aria-hidden="true" /></span>
          <span className="grow"><b>Деньги</b><span className="mut more-sub">Бригады, авансы, подотчёт</span></span>
          <ChevronRight size={18} className="more-chev" aria-hidden="true" />
        </Link>
        <Link href="/team" className="gi more-row">
          <span className="more-ic"><Users size={22} aria-hidden="true" /></span>
          <span className="grow"><b>Команда</b><span className="mut more-sub">Прорабы, кассиры, доступ к объектам</span></span>
          <ChevronRight size={18} className="more-chev" aria-hidden="true" />
        </Link>
      </div>
    </>
  )
}
