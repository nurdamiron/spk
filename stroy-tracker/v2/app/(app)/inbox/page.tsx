import { requireProfile } from '@/lib/session'
import { db as getDb } from '@/lib/db'

const ST: Record<string, [string, string]> = { new: ['info', 'Новое'], parsed: ['ok', 'Разобрано'], needs_review: ['warn', 'Разобрать вручную'], saved: ['ok', 'Записано'], rejected: ['', 'Отклонено'] }

/** Всё, что пришло снаружи (WhatsApp), до записи в базу. Пока бот не подключён, здесь пусто. */
export default async function InboxPage() {
  await requireProfile(['owner'])
  const { data } = await (await getDb()).from('inbox').select('id, source, sender, raw_text, status, created_at').order('created_at', { ascending: false }).limit(100)
  return (
    <>
      <h1>Входящие</h1>
      <div className="group">
        {(data ?? []).map(m => {
          const [k, label] = ST[m.status] ?? ['', m.status]
          return (
            <div key={m.id} className="gi">
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <b className="grow" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{m.sender ?? 'Неизвестный отправитель'}</b>
                <span className={'pill ' + k}>{label}</span>
              </div>
              <div style={{ marginTop: 4, overflowWrap: 'anywhere' }}>{m.raw_text}</div>
              <div className="mut" style={{ fontSize: 12.5, marginTop: 4 }}>{new Date(m.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</div>
            </div>
          )
        })}
        {!data?.length && <div className="gi mut">Сообщений нет. Когда подключим WhatsApp, всё, что бот не смог разобрать, появится здесь.</div>}
      </div>
    </>
  )
}
