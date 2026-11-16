import { createHash } from 'node:crypto'

export const VAT = 0.16
export const TZ = 'Asia/Almaty'

/** Сегодняшняя дата в Алматы в виде 2026-11-16 */
export function todayAlmaty(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** Имя для входа в единый вид: без лишних пробелов и больших букв. «Ерлан  Саг» и «ерлан саг» это один человек. */
export function normalizeLogin(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ').toLowerCase()
  return s.length >= 2 && s.length <= 40 ? s : null
}

/** Вход идёт по имени, но внутри это почта-невидимка. Пользователь её не видит. */
export const loginToEmail = (login: string) =>
  `${createHash('sha256').update(login).digest('hex').slice(0, 32)}@users.stroytracker.app`
