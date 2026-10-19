import * as React from "react"
import rough from "roughjs"
import { cn } from "cn"

export type RoughOptions = {
  /** Насколько «дрожит» линия (по умолчанию 1.1). */
  roughness?: number
  /** Изгиб линии (по умолчанию 0.8). */
  bowing?: number
  /** Толщина линии, px (по умолчанию 2). */
  strokeWidth?: number
  /** Радиус скругления, px. */
  radius?: number
  /** Цвет линии (по умолчанию токен `--ink`). */
  color?: string
}

const generator = rough.generator()

function hash(value: string) {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h) + 1
}

function roundedRect(w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2)
  return [
    `M ${k} 0`,
    `H ${w - k}`,
    `A ${k} ${k} 0 0 1 ${w} ${k}`,
    `V ${h - k}`,
    `A ${k} ${k} 0 0 1 ${w - k} ${h}`,
    `H ${k}`,
    `A ${k} ${k} 0 0 1 0 ${h - k}`,
    `V ${k}`,
    `A ${k} ${k} 0 0 1 ${k} 0`,
    "Z",
  ].join(" ")
}

/**
 * Рисованная рамка (rough.js) поверх родителя. Родитель должен быть `relative`,
 * а его настоящая рамка — прозрачной (`border-transparent`), чтобы размеры не поменялись.
 */
function RoughBorder({
  roughness = 1.1,
  bowing = 0.8,
  strokeWidth = 2,
  radius = 16,
  color = "var(--ink)",
  className,
}: RoughOptions & { className?: string }) {
  const id = React.useId()
  const ref = React.useRef<SVGSVGElement>(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const paths = React.useMemo(() => {
    if (!size.w || !size.h) return []
    const inset = strokeWidth / 2 + 0.5
    const w = Math.max(size.w - inset * 2, 1)
    const h = Math.max(size.h - inset * 2, 1)
    const drawable = generator.path(roundedRect(w, h, Math.max(radius - inset, 0)), {
      roughness,
      bowing,
      strokeWidth,
      stroke: color,
      fill: "none",
      seed: hash(id),
      disableMultiStroke: false,
    })
    return generator
      .toPaths(drawable)
      .map((p) => ({ d: p.d, strokeWidth: p.strokeWidth }))
      .map((p) => ({ ...p, inset }))
  }, [size, roughness, bowing, strokeWidth, radius, color, id])

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      data-slot="rough-border"
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          transform={`translate(${p.inset} ${p.inset})`}
          fill="none"
          stroke={color}
          strokeWidth={p.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

export { RoughBorder }
