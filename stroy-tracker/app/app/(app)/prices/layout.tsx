import { requireProfile } from '@/lib/session'
import './prices.css'

/** Базу цен видит только владелец: прорабу и кассиру цены поставщиков не отдаются. */
export default async function PricesLayout({ children }: { children: React.ReactNode }) {
  await requireProfile(['owner'])
  return <>{children}</>
}
