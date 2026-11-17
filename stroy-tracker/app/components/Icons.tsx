import { ChevronLeft, CircleAlert, Info, TriangleAlert, X, Plus, Camera, Trash2, type LucideProps } from 'lucide-react'

const base: LucideProps = { size: 20, strokeWidth: 1.9, 'aria-hidden': true }

export const Back = () => <ChevronLeft {...base} style={{ marginLeft: -6 }} />
export const Close = () => <X {...base} />
export const Add = () => <Plus {...base} size={18} />
export const Photo = () => <Camera {...base} size={22} />
export const Remove = () => <Trash2 {...base} size={18} />

/** Значок в сигнале: красный круг, оранжевый треугольник или синяя «i». */
export function SigIcon({ kind }: { kind: 'bad' | 'warn' | 'info' }) {
  const Icon = kind === 'bad' ? CircleAlert : kind === 'warn' ? TriangleAlert : Info
  return <Icon {...base} size={20} style={{ flex: 'none', marginTop: 1 }} />
}
