import type { ObjectCalc } from '@/lib/calc'

export function objectStatus(c: ObjectCalc): ['ok' | 'warn' | 'bad', string] {
  const bad = c.rows.some(r => r.ready >= 0.1 && r.margin !== null && r.margin < 0)
  if (bad || c.fcMargin < c.planMargin - 0.1) return ['bad', 'Маржа падает']
  if (c.fcMargin < c.planMargin - 0.05) return ['warn', 'Следить']
  return ['ok', 'В норме']
}
export const marginClass = (m: number | null) => (m === null ? '' : m < 0 ? 'tc-bad' : m < 0.15 ? '' : 'tc-ok')
