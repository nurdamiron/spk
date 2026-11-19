import { ChevronDown, Plus } from 'lucide-react'
import { requireProfile } from '@/lib/session'
import { db as getDb } from '@/lib/db'
import { assignMember, setActive, unassignMember } from '../actions'
import { UserForm } from './UserForm'
import { Close } from '@/components/Icons'
import './team.css'

const ROLE = { owner: 'Владелец', foreman: 'Прораб', cashier: 'Кассир' } as const

export default async function TeamPage() {
  const me = await requireProfile(['owner'])
  const db = await getDb()
  const [users, objects, members] = await Promise.all([
    db.from('profiles').select('id, name, role, active').order('created_at'),
    db.from('objects').select('id, name').neq('status', 'archived').order('created_at'),
    db.from('object_members').select('user_id, object_id'),
  ])
  const objs = objects.data ?? []
  const objName = new Map(objs.map(o => [o.id, o.name]))

  return (
    <div className="tm">
      <h1>Команда</h1>

      <details className="add">
        <summary><Plus size={20} aria-hidden="true" />Добавить человека</summary>
        <div className="add-body"><UserForm objects={objs} /></div>
      </details>

      <div className="people">
        {(users.data ?? []).map(u => {
          const mine = (members.data ?? []).filter(m => m.user_id === u.id)
          const sub = !u.active ? 'доступ закрыт' : u.role === 'foreman' ? `${ROLE.foreman}, объектов: ${mine.length}` : ROLE[u.role as keyof typeof ROLE]
          const canOpen = u.role === 'foreman' || u.id !== me.id
          return (
            <details key={u.id} className="pr">
              <summary>
                <span className="ava" aria-hidden="true">{u.name.slice(0, 1).toUpperCase()}</span>
                <span className="pr-name"><b>{u.name}</b><small className={u.active ? '' : 'tc-bad'}>{sub}</small></span>
                {canOpen && <ChevronDown size={18} className="pr-chev" aria-hidden="true" />}
              </summary>
              <div className="pr-body">
                {u.role === 'foreman' && (
                  <>
                    {mine.map(m => (
                      <form key={m.object_id} action={unassignMember} className="obj-row">
                        <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="object_id" value={m.object_id} />
                        <span>{objName.get(m.object_id)}</span><button className="btn" aria-label="Убрать с объекта"><Close /></button>
                      </form>
                    ))}
                    {!mine.length && <div className="mut" style={{ fontSize: 14 }}>Объектов пока нет.</div>}
                    <form action={assignMember} className="obj-add">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select name="object_id" defaultValue=""><option value="">Добавить на объект…</option>{objs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                      <button className="btn">Добавить</button>
                    </form>
                  </>
                )}
                {u.id !== me.id && (
                  <form action={setActive} className="access">
                    <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="active" value={u.active ? '0' : '1'} />
                    <button className={'btn' + (u.active ? ' danger' : '')}>{u.active ? 'Закрыть доступ' : 'Вернуть доступ'}</button>
                  </form>
                )}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
