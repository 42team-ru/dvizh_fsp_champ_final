import * as React from "react"
import { cn } from "cn"

type Shape =
  | "squiggle"
  | "dots"
  | "triangle"
  | "ring"
  | "disc"
  | "plus"
  | "zigzag"
  | "grid"

type Item = {
  shape: Shape
  /** С какой стороны контента стоит фигура (`l` / `r`) или `dx` — смещение от центра, px. */
  side?: "l" | "r"
  dx?: number
  /** Отступ от левого края страницы, px (для страниц с боковой панелью). */
  ax?: number
  /** Расстояние от верха страницы, px. */
  y: number
  size?: number
  rotate?: number
  /** Цвет линии или заливки — CSS-переменная токена. */
  color: string
}

const INK = "var(--ink)"
/** Половина ширины колонки контента на десктопе (1216px + поля). */
const EDGE = 608

/** Десктоп: фигуры стоят вплотную к краям контента, чтобы не попадать под текст. */
const DESKTOP: Item[] = [
  { shape: "squiggle", side: "l", y: 160, size: 110, rotate: -8, color: "var(--primary)" },
  { shape: "dots", side: "r", y: 190, size: 84, color: INK },
  { shape: "triangle", side: "l", y: 440, size: 52, rotate: 14, color: "var(--accent)" },
  { shape: "plus", side: "r", y: 470, size: 26, color: INK },
  { shape: "disc", side: "r", y: 640, size: 40, color: "var(--secondary)" },
  { shape: "zigzag", side: "l", y: 650, size: 96, rotate: 6, color: "var(--primary)" },
  { shape: "grid", side: "r", y: 860, size: 76, color: INK },
  { shape: "squiggle", side: "l", y: 920, size: 100, rotate: 12, color: "var(--accent)" },
  { shape: "plus", side: "l", y: 1100, size: 28, color: "var(--primary)" },
  { shape: "triangle", side: "r", y: 1080, size: 48, rotate: -18, color: "var(--secondary)" },
  { shape: "dots", side: "l", y: 1290, size: 84, color: "var(--primary)" },
  { shape: "disc", side: "r", y: 1360, size: 36, color: "var(--accent)" },
  { shape: "zigzag", side: "r", y: 1500, size: 100, rotate: -6, color: "var(--sky)" },
  { shape: "grid", side: "l", y: 1500, size: 70, color: INK },
  { shape: "disc", side: "l", y: 300, size: 44, color: "var(--secondary)" },
  { shape: "disc", side: "r", y: 330, size: 64, color: "var(--sky)" },
  { shape: "disc", side: "l", y: 790, size: 36, color: "var(--accent)" },
  { shape: "disc", side: "r", y: 760, size: 52, color: "var(--primary)" },
  { shape: "disc", side: "l", y: 1190, size: 58, color: "var(--mint)" },
  { shape: "disc", side: "r", y: 1230, size: 40, color: "var(--accent)" },
  { shape: "disc", side: "l", y: 1620, size: 46, color: "var(--sky)" },
  { shape: "disc", side: "r", y: 1620, size: 54, color: "var(--secondary)" },
]

/** Мобильный: фигуры выглядывают из-за карточек у краёв экрана. */
const MOBILE: Item[] = [
  { shape: "dots", dx: 62, y: 74, size: 62, color: "var(--primary)" },
  { shape: "squiggle", dx: 92, y: 118, size: 84, rotate: -6, color: "var(--accent)" },
  { shape: "triangle", dx: 150, y: 70, size: 34, rotate: 16, color: "var(--secondary)" },
  { shape: "dots", dx: -190, y: 330, size: 60, color: INK },
  { shape: "triangle", dx: 170, y: 560, size: 38, rotate: 14, color: "var(--accent)" },
  { shape: "plus", dx: -184, y: 760, size: 22, color: INK },
  { shape: "disc", dx: 172, y: 900, size: 30, color: "var(--secondary)" },
  { shape: "zigzag", dx: -196, y: 1090, size: 72, rotate: 6, color: "var(--primary)" },
  { shape: "grid", dx: 150, y: 1240, size: 56, color: INK },
  { shape: "squiggle", dx: -200, y: 1420, size: 80, rotate: 12, color: "var(--accent)" },
  { shape: "triangle", dx: 168, y: 1600, size: 36, rotate: -18, color: "var(--secondary)" },
  { shape: "dots", dx: -190, y: 1760, size: 60, color: "var(--primary)" },
  { shape: "disc", dx: -196, y: 200, size: 36, color: "var(--secondary)" },
  { shape: "disc", dx: 176, y: 420, size: 44, color: "var(--sky)" },
  { shape: "disc", dx: -200, y: 640, size: 40, color: "var(--accent)" },
  { shape: "disc", dx: 180, y: 1010, size: 34, color: "var(--mint)" },
  { shape: "disc", dx: -198, y: 1330, size: 46, color: "var(--primary)" },
  { shape: "disc", dx: 178, y: 1480, size: 38, color: "var(--secondary)" },
  { shape: "disc", dx: -196, y: 1880, size: 40, color: "var(--sky)" },
]

/** Вход и регистрация: фигуры в полях правой части, вне формы и демо-карточки. */
const AUTH: Item[] = [
  { shape: "squiggle", ax: 530, y: 34, size: 100, rotate: -6, color: "var(--primary)" },
  { shape: "dots", ax: 970, y: 26, size: 80, color: INK },
  { shape: "disc", ax: 1200, y: 56, size: 40, color: "var(--secondary)" },
  { shape: "triangle", ax: 444, y: 640, size: 40, rotate: 14, color: "var(--accent)" },
  { shape: "plus", ax: 448, y: 560, size: 22, color: INK },
  { shape: "disc", ax: 1180, y: 740, size: 48, color: "var(--sky)" },
  { shape: "zigzag", ax: 940, y: 774, size: 100, rotate: -4, color: "var(--primary)" },
  { shape: "grid", ax: 680, y: 772, size: 54, color: INK },
  { shape: "disc", ax: 440, y: 380, size: 34, color: "var(--mint)" },
]

/** Длинные страницы: набор повторяется ниже с зеркальными сторонами. */
const REPEAT = { desktop: 1700, mobile: 1950, auth: 0 } as const

function expand(items: Item[], period: number, times: number): Item[] {
  if (!period) return items
  const out = [...items]
  for (let n = 1; n <= times; n++) {
    for (const it of items) {
      const flip = n % 2 === 1
      out.push({
        ...it,
        y: it.y + period * n,
        side: it.side && flip ? (it.side === "l" ? "r" : "l") : it.side,
        dx: it.dx !== undefined && flip ? -it.dx : it.dx,
        rotate: it.rotate !== undefined ? -it.rotate : undefined,
      })
    }
  }
  return out
}

/* ---------- Генерация по seed: у каждой страницы свой рисунок ---------- */

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(seed: string | number) {
  const str = String(seed)
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

const PALETTE = ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--sky)", "var(--mint)"]
const SHAPES: Shape[] = ["squiggle", "zigzag", "dots", "triangle", "disc", "plus", "grid", "disc"]
const SIZE: Record<Shape, [number, number]> = {
  squiggle: [84, 120],
  zigzag: [84, 116],
  dots: [58, 90],
  triangle: [36, 58],
  disc: [34, 64],
  ring: [34, 48],
  plus: [22, 32],
  grid: [52, 80],
}

function pick<T>(rand: () => number, list: readonly T[]) {
  return list[Math.floor(rand() * list.length)]
}

function itemFor(rand: () => number, shape: Shape): Omit<Item, "y" | "side" | "dx"> {
  const [min, max] = SIZE[shape]
  const flat = shape === "dots" || shape === "grid" || shape === "plus"
  return {
    shape,
    size: Math.round(min + rand() * (max - min)),
    rotate: shape === "disc" || shape === "dots" ? 0 : Math.round((rand() - 0.5) * 36),
    color: flat && rand() < 0.5 ? INK : pick(rand, PALETTE),
  }
}

function generate(variant: "desktop" | "mobile" | "auth", seed: string | number): Item[] {
  const rand = mulberry(hashSeed(seed))
  const out: Item[] = []

  if (variant === "auth") {
    // те же свободные места, что у ручного набора, но другие фигуры и цвета
    for (const spot of AUTH) {
      // у левой кромки места мало — только мелкие фигуры, размер не больше исходного
      const narrow = (spot.ax ?? 999) <= 460
      const shape = pick(rand, narrow ? (["disc", "triangle", "plus"] as Shape[]) : SHAPES)
      const it = itemFor(rand, shape)
      const wide = shape === "squiggle" || shape === "zigzag"
      // у верхней кромки (над формой) высокие фигуры держим невысокими
      const cap = spot.y < 100 && !wide ? 46 : (spot.size ?? 60)
      out.push({ ...spot, ...it, size: Math.min(it.size ?? 60, cap) })
    }
    return out
  }

  const mobile = variant === "mobile"
  let y = mobile ? 70 : 120 + Math.round(rand() * 60)
  let side: "l" | "r" = rand() < 0.5 ? "l" : "r"
  while (y < (mobile ? 3000 : 2800)) {
    const it = itemFor(rand, pick(rand, SHAPES))
    if (mobile) {
      const edge = 150 + Math.round(rand() * 38)
      out.push({ ...it, dx: side === "l" ? -edge - 40 : edge, y })
    } else {
      out.push({ ...it, side, y })
    }
    // чаще чередуем стороны, иногда подряд на одной
    if (rand() < 0.8) side = side === "l" ? "r" : "l"
    y += (mobile ? 140 : 100) + Math.round(rand() * (mobile ? 90 : 90))
  }
  return out
}

function leftOf(it: Item, size: number) {
  if (it.ax !== undefined) return `${it.ax}px`
  if (it.side === "l") return `calc(50% - ${EDGE + size + 4}px)`
  if (it.side === "r") return `calc(50% + ${EDGE + 4}px)`
  return `calc(50% + ${it.dx ?? 0}px)`
}

function Glyph({ shape, color }: { shape: Shape; color: string }) {
  const stroke = { stroke: color, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const
  switch (shape) {
    case "squiggle":
      return (
        <svg viewBox="0 0 100 24" className="size-full overflow-visible">
          <path d="M2 12 Q 14 0 26 12 T 50 12 T 74 12 T 98 12" {...stroke} />
        </svg>
      )
    case "zigzag":
      return (
        <svg viewBox="0 0 100 24" className="size-full overflow-visible">
          <path d="M2 20 L 18 4 L 34 20 L 50 4 L 66 20 L 82 4 L 98 20" {...stroke} />
        </svg>
      )
    case "dots":
      return (
        <svg viewBox="0 0 80 64" className="size-full overflow-visible">
          {Array.from({ length: 20 }, (_, i) => (
            <circle key={i} cx={8 + (i % 5) * 16} cy={8 + Math.floor(i / 5) * 16} r="3" fill={color} />
          ))}
        </svg>
      )
    case "triangle":
      return (
        <svg viewBox="0 0 48 44" className="size-full overflow-visible">
          <polygon
            points="4,40 44,40 24,4"
            fill={color}
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      )
    case "ring":
      return (
        <svg viewBox="0 0 40 40" className="size-full overflow-visible">
          <circle cx="20" cy="20" r="15" {...stroke} strokeWidth={6} />
        </svg>
      )
    case "disc":
      return (
        <svg viewBox="0 0 40 40" className="size-full overflow-visible">
          <circle cx="20" cy="20" r="17" fill={color} stroke={INK} strokeWidth="3" />
        </svg>
      )
    case "plus":
      return (
        <svg viewBox="0 0 24 24" className="size-full overflow-visible">
          <path d="M12 2 V22 M2 12 H22" {...stroke} strokeWidth={5} />
        </svg>
      )
    case "grid":
      return (
        <svg viewBox="0 0 64 64" className="size-full overflow-visible">
          <g stroke={color} strokeWidth="2" strokeLinecap="round" fill="none">
            <rect x="2" y="2" width="60" height="60" rx="4" />
            <path d="M22 2 V62 M42 2 V62 M2 22 H62 M2 42 H62" />
          </g>
        </svg>
      )
  }
}

/**
 * Фон в стиле Memphis: змейки, зигзаги, сетки из точек, треугольники, кольца и плюсы.
 * Кладётся первым ребёнком в `relative isolate overflow-hidden` контейнер — фигуры окажутся под контентом.
 */
function MemphisBackground({
  variant = "desktop",
  className,
  seed,
}: {
  variant?: "desktop" | "mobile" | "auth"
  /** Разный seed — разный рисунок; без него — ручной набор главной. */
  seed?: string | number
  className?: string
}) {
  const items = React.useMemo(() => {
    if (seed !== undefined) return generate(variant, seed)
    const base = variant === "mobile" ? MOBILE : variant === "auth" ? AUTH : DESKTOP
    return expand(base, REPEAT[variant], 2)
  }, [variant, seed])
  return (
    <div
      aria-hidden="true"
      data-slot="memphis-background"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {items.map((it, i) => {
        const size = it.size ?? 60
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: leftOf(it, size),
              top: it.y,
              width: size,
              height: size,
              transform: `rotate(${it.rotate ?? 0}deg)`,
            }}
          >
            <Glyph shape={it.shape} color={it.color} />
          </div>
        )
      })}
    </div>
  )
}

export { MemphisBackground }
