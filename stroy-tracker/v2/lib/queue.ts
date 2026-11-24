// Очередь неотправленных отчётов хранится в телефоне (IndexedDB) вместе с фото.
// iPhone может стереть эту память примерно через неделю без запуска, поэтому держим очередь короткой.

export type QueueItem = { clientId: string; payload: unknown; photos: Blob[]; error?: string; savedAt: number }
const DB = 'st-queue'
const STORE = 'reports'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'clientId' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open()
  return new Promise((res, rej) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
const changed = () => window.dispatchEvent(new Event('queue-changed'))

export const enqueue = async (item: Omit<QueueItem, 'savedAt'>) => {
  await tx('readwrite', s => s.put({ ...item, savedAt: Date.now() }))
  changed()
}
export const listQueue = () => tx<QueueItem[]>('readonly', s => s.getAll())
export const removeFromQueue = async (id: string) => { await tx('readwrite', s => s.delete(id)); changed() }
export const clearQueue = async () => { await tx('readwrite', s => s.clear()); changed() }

/** Отправляет один отчёт. 'ok' отправлен, 'later' нет связи или нужно войти, иначе текст ошибки. */
export async function sendReport(item: Pick<QueueItem, 'clientId' | 'payload' | 'photos'>): Promise<'ok' | 'later' | { error: string }> {
  const fd = new FormData()
  fd.append('payload', JSON.stringify(item.payload))
  item.photos.forEach((b, i) => fd.append('photo', b, `photo${i}.jpg`))
  try {
    const res = await fetch('/api/reports', { method: 'POST', body: fd })
    if (res.ok) return 'ok'
    if (res.status === 401 || res.status >= 500) return 'later'
    const j = await res.json().catch(() => ({}))
    return { error: j.error || 'Сервер не принял отчёт' }
  } catch {
    return 'later'
  }
}

let flushing = false
/** Пробует отправить всё, что накопилось. Возвращает, сколько ушло. */
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0
  flushing = true
  let sent = 0
  try {
    for (const it of await listQueue()) {
      const r = await sendReport(it)
      if (r === 'ok') { await removeFromQueue(it.clientId); sent++ }
      else if (r === 'later') break
      else await tx('readwrite', s => s.put({ ...it, error: r.error })).then(changed)
    }
  } finally { flushing = false }
  return sent
}

/** Уменьшает фото до 1280 пикселей и ~300 КБ, чтобы отправка на слабой связи проходила. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej()), 'image/jpeg', 0.72))
  } catch {
    return file
  }
}
