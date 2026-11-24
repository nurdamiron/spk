'use client'
import { useEffect, useRef, useState } from 'react'
import { dshort, short } from '@/lib/calc'

type Pt = { date: string; o: number; s: number }

/** График «освоено и потрачено»: две линии, подписи на концах, подсказка при наведении, таблица для чтения без графика. */
export function Chart({ series }: { series: Pt[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(340)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, Math.round(el.clientWidth))))
    ro.observe(el)
    setW(Math.max(260, Math.round(el.clientWidth)))
    return () => ro.disconnect()
  }, [])
  if (series.length < 2) return <p className="mut" style={{ margin: 0 }}>График появится после второго отчёта.</p>

  const H = 210, L = 4, R = 4, T = 14, B = 26
  const mx = Math.max(...series.map(p => Math.max(p.o, p.s))) * 1.08 || 1
  const x = (i: number) => L + (i * (W - L - R)) / (series.length - 1)
  const y = (v: number) => T + (1 - v / mx) * (H - T - B)
  const path = (k: 'o' | 's') => series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ')
  const last = series[series.length - 1]
  const ticks = [0, 0.5, 1].map(f => f * mx)
  const lead = last.o >= last.s ? 'o' : 's'
  const labelY = (k: 'o' | 's') => {
    const base = y(last[k])
    const other = y(last[k === 'o' ? 's' : 'o'])
    return k === lead ? base - 10 : Math.max(base + 18, other + 18)
  }

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = ref.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - L) / (W - L - R)) * (series.length - 1))
    setHover(Math.max(0, Math.min(series.length - 1, i)))
  }
  const h = hover === null ? null : series[hover]

  return (
    <div className="chart">
      <div className="legend" aria-hidden="true">
        <span><i className="dot c1" />Освоено</span>
        <span><i className="dot c2" />Потрачено</span>
      </div>
      <div className="chartbox" ref={boxRef}>
        <svg
          ref={ref} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img"
          aria-label={`Освоено ${short(last.o)}, потрачено ${short(last.s)} на ${dshort(last.date)}`}
          onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
              {i > 0 && <text x={L + 2} y={y(t) - 5} className="axis">{short(t)}</text>}
            </g>
          ))}
          <path d={path('s')} className="ln c2s" />
          <path d={path('o')} className="ln c1s" />
          <text x={L} y={H - 8} className="axis">{dshort(series[0].date)}</text>
          <text x={W - R} y={H - 8} className="axis" textAnchor="end">{dshort(last.date)}</text>

          {h === null && (
            <>
              <circle cx={x(series.length - 1)} cy={y(last.o)} r="4.5" className="mk c1f" />
              <circle cx={x(series.length - 1)} cy={y(last.s)} r="4.5" className="mk c2f" />
              <text x={W - R - 6} y={labelY('o')} textAnchor="end" className="dl c1t">{short(last.o)}</text>
              <text x={W - R - 6} y={labelY('s')} textAnchor="end" className="dl c2t">{short(last.s)}</text>
            </>
          )}
          {h !== null && hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="cross" />
              <circle cx={x(hover)} cy={y(h.o)} r="5" className="mk c1f" />
              <circle cx={x(hover)} cy={y(h.s)} r="5" className="mk c2f" />
            </>
          )}
        </svg>
        {h !== null && hover !== null && (
          <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > series.length / 2 ? '-105%' : '5%'})` }}>
            <b>{dshort(h.date)}</b>
            <div><i className="dot c1" />Освоено <strong>{short(h.o)}</strong></div>
            <div><i className="dot c2" />Потрачено <strong>{short(h.s)}</strong></div>
            <div className="mut">Разница {short(h.o - h.s)}</div>
          </div>
        )}
      </div>
      <details className="tview">
        <summary>Показать таблицей</summary>
        <table>
          <tbody>
            <tr><th>Дата</th><th>Освоено</th><th>Потрачено</th></tr>
            {series.map(p => <tr key={p.date}><td>{dshort(p.date)}</td><td>{short(p.o)}</td><td>{short(p.s)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </div>
  )
}
