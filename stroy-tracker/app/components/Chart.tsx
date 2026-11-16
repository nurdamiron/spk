import { dshort, short } from '@/lib/calc'

export function Chart({ series }: { series: { date: string; o: number; s: number }[] }) {
  if (series.length < 2) return <p className="mut">График появится после второго отчёта.</p>
  const W = 640, H = 170, P = 8
  const mx = Math.max(...series.map(s => Math.max(s.o, s.s))) * 1.05 || 1
  const x = (i: number) => P + (i * (W - 2 * P)) / (series.length - 1)
  const y = (v: number) => H - 18 - (v / mx) * (H - 30)
  const line = (k: 'o' | 's') => series.map((s, i) => `${x(i)},${y(s[k])}`).join(' ')
  const last = series[series.length - 1]
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Освоено и потрачено по дням">
        <polyline points={line('o')} fill="none" stroke="#007AFF" strokeWidth="2.5" />
        <polyline points={line('s')} fill="none" stroke="#FF9500" strokeWidth="2.5" />
        <text x={P} y={H - 3} fontSize="11" fill="currentColor">{dshort(series[0].date)}</text>
        <text x={W - P} y={H - 3} fontSize="11" textAnchor="end" fill="currentColor">{dshort(last.date)}</text>
      </svg>
      <div className="mut">
        <span style={{ color: '#007AFF' }}>●</span> освоено {short(last.o)} &nbsp;
        <span style={{ color: '#FF9500' }}>●</span> потрачено {short(last.s)}
      </div>
    </>
  )
}
