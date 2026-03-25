// components/dashboard/donut-chart.tsx
'use client'

// Gráfico de rosca SVG puro — sem dependências externas
// Suporta até 8 segmentos, legenda lateral, valor central e animação de entrada

import { useState } from 'react'

type Segment = {
  label: string
  value: number
  color: string
}

type Props = {
  segments:    Segment[]
  total?:      number          // se não passado, soma os segmentos
  centerLabel: string          // ex: "vendas", "produtos"
  size?:       number          // tamanho do SVG (default 120)
  thickness?:  number          // espessura do anel (default 28)
  emptyLabel?: string          // texto quando não há dados
}

// Paleta de cores padrão para até 8 itens
export const CHART_COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
]

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start    = polarToCartesian(cx, cy, r, endAngle)
  const end      = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export function DonutChart({
  segments,
  total: totalProp,
  centerLabel,
  size      = 120,
  thickness = 28,
  emptyLabel = 'Sem dados',
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const total    = totalProp ?? segments.reduce((acc, s) => acc + s.value, 0)
  const cx       = size / 2
  const cy       = size / 2
  const r        = (size - thickness) / 2
  const hasData  = total > 0 && segments.length > 0

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f4f5" strokeWidth={thickness} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fill="#a1a1aa">—</text>
        </svg>
        <p className="text-xs text-zinc-400">{emptyLabel}</p>
      </div>
    )
  }

  // Calcula ângulos
  let currentAngle = 0
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 360
    const start = currentAngle
    currentAngle += angle
    return { ...seg, startAngle: start, endAngle: currentAngle }
  })

  const hoveredSeg = hovered !== null ? arcs[hovered] : null

  return (
    <div className="flex items-center gap-4">
      {/* Donut */}
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f4f4f5" strokeWidth={thickness} />

          {/* Segmentos */}
          {arcs.map((arc, i) => {
            const isHovered  = hovered === i
            const d          = arcPath(cx, cy, r, arc.startAngle, arc.endAngle)
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={arc.color}
                strokeWidth={isHovered ? thickness + 4 : thickness}
                strokeLinecap="round"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onTouchStart={() => setHovered(i)}
                onTouchEnd={() => setHovered(null)}
                style={{ opacity: hovered !== null && !isHovered ? 0.4 : 1 }}
              />
            )
          })}

          {/* Centro */}
          {hoveredSeg ? (
            <>
              <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fontWeight="700" fill="#18181b">
                {hoveredSeg.value}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill="#71717a">
                {((hoveredSeg.value / total) * 100).toFixed(0)}%
              </text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle"
                fontSize="13" fontWeight="700" fill="#18181b">
                {total}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill="#71717a">
                {centerLabel}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {arcs.map((arc, i) => (
          <div key={i}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ opacity: hovered !== null && hovered !== i ? 0.4 : 1 }}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
            <p className="text-xs text-zinc-600 truncate flex-1">{arc.label}</p>
            <span className="text-xs font-semibold text-zinc-800 flex-shrink-0">{arc.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}