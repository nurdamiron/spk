// Демо-режим: вход без пароля на учебные данные (схема demo). Боевые данные не затрагиваются.
// Отключить: переменная окружения DEMO_ENABLED=0 (после этого кнопки пропадут, а старые демо-куки перестанут действовать).
export const DEMO_COOKIE = 'st_demo'
export const DEMO_ENABLED = process.env.DEMO_ENABLED !== '0'
export const DEMO_MSG = 'Это демо: изменения не сохраняются'

export type DemoRole = 'owner' | 'foreman' | 'cashier'
export const isDemoRole = (v: unknown): v is DemoRole => v === 'owner' || v === 'foreman' || v === 'cashier'

/** Те же id, что в scripts/seed_demo.mjs */
export const DEMO_IDS: Record<DemoRole, string> = {
  owner: '00000000-0000-4000-8000-0000000000a1',
  foreman: '00000000-0000-4000-8000-0000000000a2',
  cashier: '00000000-0000-4000-8000-0000000000a4',
}
export const DEMO_NAMES: Record<DemoRole, string> = { owner: 'Демо Владелец', foreman: 'Ерлан Саг', cashier: 'Айгерим Касса' }
