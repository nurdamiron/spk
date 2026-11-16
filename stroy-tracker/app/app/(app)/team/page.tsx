import { requireProfile } from '@/lib/session'
import { admin } from '@/lib/supabase/admin'
import { assignMember, setActive, unassignMember } from '../actions'
import { UserForm } from './UserForm'

const ROLE = { owner: 'Владелец', foreman: 'Прораб', cashier: 'Кассир' } as const

export default async function TeamPage() {
  const me = await requireProfile(['owner'])
  const db = admin()
  const [users, objects, members] = await Promise.all([
    db.from('profiles').select('id, name, role, active').order('created_at'),
    db.from('objects').select('id, name').neq('status', 'archived').order('created_at'),
    db.from('object_members').select('user_id, object_id'),
  ])
  const objs = objects.data ?? []
  const objName = new Map(objs.map(o => [o.id, o.name]))

  return (
    <>
      <h1>Команда</h1>
      <div className="card">
        <h2>Добавить человека</h2>
        <UserForm objects={objs} />
      </div>

      <div className="card">
        <h2>Все аккаунты</h2>
        {(users.data ?? []).map(u => {
          const mine = (members.data ?? []).filter(m => m.user_id === u.id)
          return (
            <div key={u.id} className="line">
              <div className="row">
                <b className="grow">{u.name}</b>
                <span className={'pill ' + (u.active ? 'ok' : 'bad')}>{u.active ? ROLE[u.role as keyof typeof ROLE] : 'доступ закрыт'}</span>
              </div>
              {u.role === 'foreman' && (
                <div style={{ marginTop: 6 }}>
                  {mine.map(m => (
                    <form key={m.object_id} action={unassignMember} className="row" style={{ marginBottom: 4 }}>
                      <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="object_id" value={m.object_id} />
                      <span className="grow">{objName.get(m.object_id)}</span><button className="btn" aria-label="Убрать с объекта">✕</button>
                    </form>
                  ))}
                  <form action={assignMember} className="row">
                    <input type="hidden" name="user_id" value={u.id} />
                    <select name="object_id" className="grow" defaultValue=""><option value="">Добавить на объект…</option>{objs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                    <button className="btn">Добавить</button>
                  </form>
                </div>
              )}
              {u.id !== me.id && (
                <form action={setActive} style={{ marginTop: 8 }}>
                  <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="active" value={u.active ? '0' : '1'} />
                  <button className={'btn' + (u.active ? ' danger' : '')}>{u.active ? 'Закрыть доступ' : 'Вернуть доступ'}</button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
