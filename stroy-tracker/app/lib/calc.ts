import { VAT } from '@/lib/config'

export type Item = { id: string; name: string; unit: string; qty: number; price: number; cost: number; sort: number }
export type Crew = { id: string; object_id?: string; name: string; rate_type: 'hour' | 'day' | 'volume' | 'fixed'; rate: number; kp_item_id: string | null }
export type Expense = {
  id?: string; category: string; amount: number; has_esf: boolean; kp_item_id: string | null
  funding: 'imprest' | 'office' | 'transfer'; has_receipt: boolean; comment: string | null
}
export type Rep = {
  id: string; report_date: string; backdated: boolean; author?: string
  progress_entries: { kp_item_id: string; qty: number }[]
  labor_entries: { crew_id: string; qty: number; amount: number }[]
  expenses: Expense[]
  photos?: string[]
}
export type Sig = { kind: 'bad' | 'warn' | 'info'; text: string }

/** Сколько расход влияет на себестоимость: с ЭСФ НДС идёт к зачёту, без ЭСФ вся сумма. */
export const expCost = (e: { amount: number; has_esf: boolean }) => (e.has_esf ? e.amount / (1 + VAT) : e.amount)

export function calcObject(items: Item[], crews: Crew[], repsAll: Rep[], today: string) {
  const reps = [...repsAll].sort((a, b) => (a.report_date < b.report_date ? -1 : 1))
  const st = new Map(items.map(i => [i.id, { ...i, q: 0, direct: 0 }]))
  const crewById = new Map(crews.map(c => [c.id, c]))
  let general = 0
  let cumO = 0
  let cumS = 0
  let vatLost = 0
  const series: { date: string; o: number; s: number }[] = []

  for (const r of reps) {
    for (const p of r.progress_entries) {
      const x = st.get(p.kp_item_id)
      if (x) {
        x.q += Number(p.qty)
        cumO += Number(p.qty) * x.price
      }
    }
    for (const l of r.labor_entries) {
      const c = crewById.get(l.crew_id)
      cumS += l.amount
      if (c?.kp_item_id && (c.rate_type === 'volume' || c.rate_type === 'fixed') && st.has(c.kp_item_id)) st.get(c.kp_item_id)!.direct += l.amount
      else general += l.amount
    }
    for (const e of r.expenses) {
      const c = expCost(e)
      cumS += c
      if (!e.has_esf && e.category === 'Материал') vatLost += e.amount - e.amount / (1 + VAT)
      if (e.kp_item_id && st.has(e.kp_item_id)) st.get(e.kp_item_id)!.direct += c
      else general += c
    }
    series.push({ date: r.report_date, o: cumO, s: cumS })
  }

  const contract = items.reduce((a, i) => a + i.qty * i.price, 0)
  const planCost = items.reduce((a, i) => a + i.qty * i.cost, 0)
  const osv = items.reduce((a, i) => a + st.get(i.id)!.q * i.price, 0)
  let spent = 0
  let fc = 0
  const rows = items.map(i => {
    const x = st.get(i.id)!
    const osvI = x.q * i.price
    const fact = x.direct + (osv ? (general * osvI) / osv : 0)
    spent += fact
    const ready = x.q / i.qty
    const u = ready >= 0.1 ? fact / x.q : i.cost
    fc += fact + (i.qty - x.q) * u
    const planDone = x.q * i.cost
    return {
      ...i, q: x.q, osv: osvI, fact, ready, planDone,
      margin: osvI ? (osvI - fact) / osvI : null,
      cpi: fact ? planDone / fact : null,
      planMargin: i.price ? (i.price - i.cost) / i.price : 0,
    }
  })

  const last = series.slice(-6)
  const days = last.length > 1 ? Math.max(1, (+new Date(last[last.length - 1].date) - +new Date(last[0].date)) / 864e5) : 0
  const perDay = last.length > 1 ? (last[last.length - 1].o - last[0].o) / days : 0
  const finishDate = perDay > 0 ? new Date(+new Date(today) + ((contract - osv) / perDay) * 864e5) : null

  const sigs: Sig[] = []
  for (const r of rows) {
    if (r.ready >= 0.1 && r.margin !== null && r.margin < 0)
      sigs.push({ kind: 'bad', text: `«${r.name}» в минусе: маржа ${Math.round(r.margin * 100)}% при готовности ${Math.round(r.ready * 100)}%` })
    else if (r.ready >= 0.1 && r.cpi !== null && r.cpi < 0.9)
      sigs.push({ kind: 'warn', text: `«${r.name}»: тратим больше плана (индекс затрат ${r.cpi.toFixed(2)})` })
  }
  const lastDate = reps.length ? reps[reps.length - 1].report_date : null
  if (lastDate !== today) sigs.push({ kind: 'warn', text: `Отчёт за сегодня не сдан, последний: ${lastDate ? dshort(lastDate) : 'нет'}` })
  if (vatLost > 0) sigs.push({ kind: 'info', text: `Потеряно на НДС без ЭСФ: ${Math.round(vatLost).toLocaleString('ru-RU')} ₸ (материалы)` })

  const profit = osv - spent
  return {
    rows, osv, spent, profit, contract,
    margin: osv ? profit / osv : 0,
    planMargin: contract ? 1 - planCost / contract : 0,
    ready: contract ? osv / contract : 0,
    fcProfit: contract - fc,
    fcMargin: contract ? (contract - fc) / contract : 0,
    finishDate, series, sigs, vatLost,
  }
}
export type ObjectCalc = ReturnType<typeof calcObject>

export function crewBalance(crewId: string, reps: Rep[], paid: number) {
  const acc = reps.reduce((a, r) => a + r.labor_entries.filter(l => l.crew_id === crewId).reduce((x, l) => x + l.amount, 0), 0)
  return { acc, paid, debt: acc - paid }
}

export const money = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₸'
export const short = (n: number) => {
  const a = Math.abs(n)
  const s = n < 0 ? '−' : ''
  return a >= 1e6 ? s + (a / 1e6).toFixed(1).replace('.', ',') + ' млн' : s + Math.round(a / 1e3) + ' тыс'
}
export const pct = (x: number) => Math.round(x * 100) + '%'
export const dshort = (d: string) => d.slice(8, 10) + '.' + d.slice(5, 7)
export const RATE_LABEL: Record<string, string> = { hour: 'за час', day: 'за день', volume: 'за объём', fixed: 'фикс за этап' }
