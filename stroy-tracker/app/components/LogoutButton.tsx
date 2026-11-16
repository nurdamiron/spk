'use client'
import { logout } from '@/app/login/actions'
import { clearQueue, listQueue } from '@/lib/queue'

export function LogoutButton() {
  return (
    <form
      action={logout}
      onSubmit={async e => {
        try {
          const q = await listQueue()
          if (q.length && !confirm(`Не отправлено отчётов: ${q.length}. Если выйти сейчас, они пропадут. Выйти?`)) {
            e.preventDefault()
            return
          }
          await clearQueue()
        } catch { /* ничего не сохранено */ }
        navigator.serviceWorker?.controller?.postMessage('clear')
      }}
    >
      <button className="btn" aria-label="Выйти из аккаунта">Выйти</button>
    </form>
  )
}
