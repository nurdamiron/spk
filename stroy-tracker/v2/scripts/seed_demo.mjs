// Заполняет ДЕМО-схему учебными данными: node scripts/seed_demo.mjs
// Трогает только схему demo (боевая public не затрагивается). Можно запускать повторно: перед заливкой demo очищается.
// Даты считаются от сегодняшнего дня в Алматы, поэтому «свежие» отчёты остаются свежими после каждого запуска.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL
const c = new pg.Client({ connectionString: url.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } })
await c.connect()

// те же id, что в lib/demo.ts
const ID = { owner: '00000000-0000-4000-8000-0000000000a1', f1: '00000000-0000-4000-8000-0000000000a2', f2: '00000000-0000-4000-8000-0000000000a3', cash: '00000000-0000-4000-8000-0000000000a4' }

let seed = 20261117
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const between = (a, b) => a + (b - a) * rnd()

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date())
const dayAgo = n => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }

// ---------- объекты: [название, заказчик, прораб(ы), позиции[имя, ед, кол-во, цена, с/с], бригады[имя, тип, ставка, позиция#|null], доля готовности, «плохая» позиция#]
const OBJECTS = [
  {
    name: 'Благоустройство двора · ул. Абая 150', customer: 'ГУ «Управление ЖКХ г. Алматы»', foremen: [ID.f1], ready: 0.5, bad: 1, daysBack: 11,
    items: [
      ['Демонтаж старого покрытия', 'м²', 1200, 1800, 1250],
      ['Основание из щебня 20–40, уплотнение', 'м³', 360, 14500, 10200],
      ['Установка бордюра БР 100.30.15', 'п.м', 640, 6800, 4900],
      ['Асфальтобетон м/з тип Б, укладка', 'м²', 1200, 9200, 6800],
      ['Тротуарная плитка 60 мм', 'м²', 420, 11500, 8400],
      ['Люки чугунные, установка', 'шт', 14, 62000, 46000],
      ['Посадка деревьев', 'шт', 38, 28000, 19000],
      ['Рулонный газон', 'м²', 560, 3600, 2500],
    ],
    crews: [['Бригада бордюров (Азамат)', 'volume', 2800, 2], ['Асфальтировщики', 'day', 30000, null], ['Плиточники', 'volume', 4200, 4], ['Экскаватор с водителем', 'hour', 18000, null]],
  },
  {
    name: 'Насосная станция пожаротушения · мкр. Горный', customer: 'ТОО «Горизонт Строй»', foremen: [ID.f2], ready: 0.34, bad: 2, daysBack: 9,
    items: [
      ['Разработка котлована', 'м³', 875, 2600, 1800],
      ['Бетон В25 W6 F150, плита и стены', 'м³', 62, 52000, 39000],
      ['Арматура А500С, вязка', 'т', 5.2, 480000, 372000],
      ['Гидроизоляция обмазочная', 'м²', 380, 3800, 2700],
      ['Монтаж насосной установки', 'компл.', 1, 3900000, 2900000],
      ['Трубопроводы стальные Ду100–150', 'п.м', 140, 24000, 18000],
      ['Электрика и шкаф управления', 'компл.', 1, 2600000, 2000000],
      ['Обратная засыпка и планировка', 'м³', 722, 1100, 760],
    ],
    crews: [['Бетонщики', 'day', 28000, null], ['Арматурщики', 'volume', 140000, 2], ['Землекопы и техника', 'hour', 17000, null]],
  },
  {
    name: 'Жилой дом, блок Б · фундамент и каркас', customer: 'ТОО «Алатау Девелопмент»', foremen: [ID.f1, ID.f2], ready: 0.22, bad: null, daysBack: 10, skipToday: true,
    items: [
      ['Земляные работы, котлован', 'м³', 3400, 2400, 1700],
      ['Бетонная подготовка В7,5', 'м³', 120, 31000, 23000],
      ['Фундаментная плита В25', 'м³', 940, 58000, 46000],
      ['Арматура плиты А500С', 'т', 92, 450000, 355000],
      ['Монолитные стены и колонны В25', 'м³', 780, 64000, 51000],
      ['Опалубка стен и колонн', 'м²', 5600, 5200, 3900],
      ['Плита перекрытия В25', 'м³', 610, 62000, 49000],
    ],
    crews: [['Бетонщики-1', 'day', 32000, null], ['Арматурщики-1', 'volume', 120000, 3], ['Опалубщики', 'volume', 1800, 5], ['Техника и копка', 'hour', 20000, null]],
  },
]

await c.query('begin')
try {
  await c.query(`truncate demo.imprest_moves, demo.payouts, demo.report_photos, demo.expenses, demo.labor_entries, demo.progress_entries, demo.reports, demo.crews, demo.kp_items, demo.object_members, demo.objects, demo.profiles cascade`)
  const P = [[ID.owner, 'Демо Владелец', 'демо владелец', 'owner'], [ID.f1, 'Ерлан Саг', 'ерлан саг', 'foreman'], [ID.f2, 'Данияр Нур', 'данияр нур', 'foreman'], [ID.cash, 'Айгерим Касса', 'айгерим касса', 'cashier']]
  for (const [id, name, login, role] of P) await c.query('insert into demo.profiles (id, name, login, role) values ($1,$2,$3,$4)', [id, name, login, role])

  let rn = 0
  for (const o of OBJECTS) {
    const oid = randomUUID()
    await c.query('insert into demo.objects (id, name, customer) values ($1,$2,$3)', [oid, o.name, o.customer])
    for (const f of o.foremen) await c.query('insert into demo.object_members (object_id, user_id) values ($1,$2)', [oid, f])
    const items = []
    for (let i = 0; i < o.items.length; i++) {
      const [name, unit, qty, price, cost] = o.items[i]
      const id = randomUUID()
      items.push({ id, name, unit, qty, price, cost })
      await c.query('insert into demo.kp_items (id, object_id, sort, name, unit, qty, price, cost) values ($1,$2,$3,$4,$5,$6,$7,$8)', [id, oid, i, name, unit, qty, price, cost])
    }
    const crews = []
    for (const [name, rate_type, rate, itemIdx] of o.crews) {
      const id = randomUUID()
      crews.push({ id, rate_type, rate, item: itemIdx === null ? null : items[itemIdx] })
      await c.query('insert into demo.crews (id, object_id, name, rate_type, rate, kp_item_id) values ($1,$2,$3,$4,$5,$6)', [id, oid, name, rate_type, rate, itemIdx === null ? null : items[itemIdx].id])
    }

    // отчёты по дням: в каждой позиции делаем часть общего объёма, суммарно около «ready»
    const days = []
    for (let n = o.skipToday ? 1 : 0; n < o.daysBack; n++) if (n === 0 || rnd() > 0.15) days.push(n)
    days.reverse()
    const perItemTotal = items.map(it => it.qty * o.ready * between(0.7, 1.25))
    const active = items.map((_, i) => i < Math.ceil(items.length * 0.75)) // последние позиции ещё не начаты
    const doneSoFar = items.map(() => 0)

    for (let di = 0; di < days.length; di++) {
      const author = o.foremen[di % o.foremen.length]
      const rid = randomUUID()
      await c.query('insert into demo.reports (id, client_id, object_id, report_date, author_id) values ($1,$2,$3,$4,$5)', [rid, `demo-${++rn}`, oid, dayAgo(days[di]), author])

      const todayItems = items.map((_, i) => i).filter(i => active[i] && rnd() < 0.5)
      if (!todayItems.length) todayItems.push(0)
      const doneToday = new Map()
      for (const i of todayItems) {
        const it = items[i]
        let q = (perItemTotal[i] / days.length) * between(0.6, 1.7)
        if (it.unit === 'шт' || it.unit === 'компл.') q = Math.max(1, Math.round(q))
        else q = it.qty < 20 ? Math.round(q * 10) / 10 : Math.round(q)
        q = Math.min(q, it.qty - doneSoFar[i])
        if (!(q > 0)) continue
        doneSoFar[i] += q
        doneToday.set(i, q)
        await c.query('insert into demo.progress_entries (report_id, kp_item_id, qty) values ($1,$2,$3)', [rid, it.id, q])
        // расходы на материал по позиции: у «плохой» позиции перерасход, у остальных около плана
        const factor = i === o.bad ? between(1.25, 1.5) : between(0.82, 1.05)
        const matShare = it.unit === 'п.м' || it.unit === 'м²' ? 0.38 : 0.55
        const amount = Math.round((q * it.cost * matShare * factor) / 100) * 100
        if (amount > 0 && !['компл.'].includes(it.unit)) {
          await c.query(
            'insert into demo.expenses (report_id, object_id, category, amount, has_esf, kp_item_id, funding, has_receipt, comment) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [rid, oid, 'Материал', amount, rnd() > 0.35, it.id, rnd() > 0.4 ? 'imprest' : 'office', rnd() > 0.15, null])
        }
      }
      // труд
      for (const cr of crews) {
        if (cr.rate_type === 'day') await c.query('insert into demo.labor_entries (report_id, crew_id, qty, amount) values ($1,$2,$3,$4)', [rid, cr.id, 1, cr.rate])
        else if (cr.rate_type === 'hour') {
          const h = Math.round(between(4, 9))
          await c.query('insert into demo.labor_entries (report_id, crew_id, qty, amount) values ($1,$2,$3,$4)', [rid, cr.id, h, h * cr.rate])
        } else if (cr.item) {
          const idx = items.findIndex(x => x.id === cr.item.id)
          const q = doneToday.get(idx)
          if (q) await c.query('insert into demo.labor_entries (report_id, crew_id, qty, amount) values ($1,$2,$3,$4)', [rid, cr.id, q, Math.round(q * cr.rate)])
        }
      }
      if (rnd() > 0.55) {
        await c.query('insert into demo.expenses (report_id, object_id, category, amount, has_esf, funding, has_receipt, comment) values ($1,$2,$3,$4,$5,$6,$7,$8)',
          [rid, oid, rnd() > 0.5 ? 'Топливо' : 'Доставка', Math.round(between(15000, 90000) / 500) * 500, false, 'imprest', rnd() > 0.3, rnd() > 0.5 ? 'АЗС по дороге на объект' : 'Самосвал, рейс'])
      }
    }
    // авансы бригадам
    for (const cr of crews) {
      const acc = (await c.query('select coalesce(sum(amount),0)::bigint s from demo.labor_entries where crew_id = $1', [cr.id])).rows[0].s
      const adv = Math.round((Number(acc) * between(0.4, 0.8)) / 10000) * 10000
      if (adv > 0) await c.query('insert into demo.payouts (crew_id, pay_date, amount, kind, created_by) values ($1,$2,$3,$4,$5)', [cr.id, dayAgo(2), adv, 'advance', ID.cash])
    }
  }
  // подотчёт прорабов: выдано чуть больше, чем потрачено из подотчёта, чтобы на руках оставался небольшой остаток
  for (const [f, extra, back] of [[ID.f1, 420000, 150000], [ID.f2, 260000, 0]]) {
    const spent = Number((await c.query(
      `select coalesce(sum(e.amount),0)::bigint s from demo.expenses e join demo.reports r on r.id = e.report_id where e.funding = 'imprest' and r.author_id = $1`, [f])).rows[0].s)
    const issued = Math.round((spent + extra + back) / 10000) * 10000
    await c.query('insert into demo.imprest_moves (holder_id, move_date, amount, kind, comment, created_by) values ($1,$2,$3,$4,$5,$6)', [f, dayAgo(9), Math.round(issued * 0.6 / 10000) * 10000, 'issue', 'Подотчёт на материалы и топливо', ID.cash])
    await c.query('insert into demo.imprest_moves (holder_id, move_date, amount, kind, comment, created_by) values ($1,$2,$3,$4,$5,$6)', [f, dayAgo(4), issued - Math.round(issued * 0.6 / 10000) * 10000, 'issue', 'Доплата подотчёта', ID.cash])
    if (back) await c.query('insert into demo.imprest_moves (holder_id, move_date, amount, kind, comment, created_by) values ($1,$2,$3,$4,$5,$6)', [f, dayAgo(2), back, 'return', 'Остаток по чекам', ID.cash])
  }
  await c.query('commit')
  const n = t => c.query(`select count(*)::int n from demo.${t}`).then(r => r.rows[0].n)
  console.log('Демо готово:', { objects: await n('objects'), kp_items: await n('kp_items'), crews: await n('crews'), reports: await n('reports'), progress: await n('progress_entries'), labor: await n('labor_entries'), expenses: await n('expenses'), payouts: await n('payouts') })
} catch (e) {
  await c.query('rollback')
  console.error('Ошибка, откат:', e.message)
  process.exitCode = 1
} finally {
  await c.end()
}
