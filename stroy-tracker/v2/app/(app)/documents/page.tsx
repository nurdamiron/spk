import { requireProfile } from '@/lib/session'
import { db as getDb } from '@/lib/db'
import { money } from '@/lib/calc'
import { todayAlmaty } from '@/lib/config'
import { DocForm } from './DocForm'
import { setDocumentStatus } from './actions'
import './documents.css'

const KIND = { contract: 'Договор', invoice: 'Счёт', act: 'Акт', other: 'Документ' } as const
const ST = { waiting: ['warn', 'Ждёт оплаты'], paid: ['ok', 'Оплачен'], overdue: ['bad', 'Просрочен'], cancelled: ['', 'Отменён'] } as const
type Doc = { id: string; kind: keyof typeof KIND; number: string | null; counterparty: string | null; amount: number | null; due_date: string | null; status: keyof typeof ST; objects: { name: string } | null }

export default async function DocumentsPage() {
  await requireProfile(['owner', 'cashier'])
  const db = await getDb()
  const [docs, objs] = await Promise.all([
    db.from('documents').select('id, kind, number, counterparty, amount, due_date, status, objects(name)').order('created_at', { ascending: false }).limit(200),
    db.from('objects').select('id, name').neq('status', 'archived').order('created_at'),
  ])
  const today = todayAlmaty()
  // просроченным считаем неоплаченный документ с прошедшим сроком, даже если статус ещё не обновлён
  const list = ((docs.data ?? []) as unknown as Doc[]).map(d => ({ ...d, status: d.status === 'waiting' && d.due_date && d.due_date < today ? ('overdue' as const) : d.status }))
  const open = list.filter(d => d.status === 'waiting' || d.status === 'overdue')
  const debt = open.reduce((a, d) => a + Number(d.amount ?? 0), 0)

  return (
    <div className="docs">
      <h1>Документы</h1>
      <div className="hline"><span>К оплате</span><b className={open.some(d => d.status === 'overdue') ? 'tc-bad' : ''}>{money(debt)}</b></div>

      <details className="card addbox">
        <summary>Добавить документ</summary>
        <div className="addbody"><DocForm objects={objs.data ?? []} /></div>
      </details>

      <div className="group">
        {list.map(d => {
          const [k, label] = ST[d.status]
          return (
            <details key={d.id} className="gi drow">
              <summary>
                <span className="dn"><b>{KIND[d.kind]} {d.number ?? ''}</b><small>{d.counterparty ?? 'без контрагента'} · {d.objects?.name ?? ''}</small></span>
                <span className="da">{d.amount != null ? money(Number(d.amount)) : ''}<span className={'pill ' + k}>{label}</span></span>
              </summary>
              <form action={setDocumentStatus} className="dact">
                <input type="hidden" name="id" value={d.id} />
                {d.due_date && <span className="mut">Срок: {d.due_date}</span>}
                <button className="btn" name="status" value="paid">Оплачен</button>
                <button className="btn" name="status" value="waiting">Ждёт</button>
                <button className="btn" name="status" value="cancelled">Отменить</button>
              </form>
            </details>
          )
        })}
        {!list.length && <div className="gi mut">Документов пока нет.</div>}
      </div>
    </div>
  )
}
