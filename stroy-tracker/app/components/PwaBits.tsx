'use client'
import { useCallback, useEffect, useState } from 'react'
import { flushQueue, listQueue } from '@/lib/queue'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

/** Регистрирует приложение в телефоне, показывает «поставить на экран» и «не отправлено». */
export function PwaBits() {
  const [pending, setPending] = useState(0)
  const [errors, setErrors] = useState(0)
  const [online, setOnline] = useState(true)
  const [toast, setToast] = useState('')
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [hidden, setHidden] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const q = await listQueue()
      setPending(q.length)
      setErrors(q.filter(x => x.error).length)
    } catch { /* память телефона недоступна */ }
  }, [])

  const doFlush = useCallback(async () => {
    const n = await flushQueue()
    if (n) setToast(`Отправлено отчётов: ${n}`)
    refresh()
  }, [refresh])

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIos(isIos)
    let off = false
    try { off = sessionStorage.getItem('st-hint-off') === '1' } catch {}
    setHidden(standalone || off)
    setOnline(navigator.onLine)
    refresh()
    doFlush()

    const onBefore = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent) }
    const onOnline = () => { setOnline(true); doFlush() }
    const onOffline = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('queue-changed', refresh)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('queue-changed', refresh)
    }
  }, [refresh, doFlush])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const hide = () => { setHidden(true); try { sessionStorage.setItem('st-hint-off', '1') } catch {} }

  return (
    <>
      {!online && <div className="banner bad" role="status"><span className="grow">Нет связи. Отчёты сохранятся в телефоне и уйдут, когда появится интернет.</span></div>}
      {pending > 0 && (
        <div className="banner bad" role="status">
          <span className="grow">
            <b>Не отправлено: {pending}</b>
            <br />
            {errors ? 'Сервер не принял часть отчётов. Покажите владельцу.' : online ? 'Связь есть, отправляем.' : 'Откройте приложение, когда появится интернет.'}
          </span>
          <button className="btn" onClick={doFlush}>Отправить</button>
        </div>
      )}
      {!hidden && install && (
        <div className="banner info">
          <span className="grow">Поставьте приложение на экран телефона</span>
          <button className="btn" onClick={async () => { await install.prompt(); setInstall(null) }}>Установить</button>
          <button className="btn" aria-label="Закрыть" onClick={hide}>✕</button>
        </div>
      )}
      {!hidden && !install && ios && (
        <div className="banner info">
          <span className="grow">
            <b>Как поставить на экран Домой</b>
            <br />1. Нажмите «Поделиться» внизу Safari
            <br />2. Выберите «На экран Домой»
            <br />3. Нажмите «Добавить»
          </span>
          <button className="btn" aria-label="Закрыть" onClick={hide}>✕</button>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
