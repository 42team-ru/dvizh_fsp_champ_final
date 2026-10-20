import * as React from "react"
import { cn } from "cn"
import prebuiltLayouts from "./memphis-layouts.json"

/* ---------------------------------------------------------------------------
 * Фон Memphis со спортивным инвентарём: мячи, гантели, гиря, фишка, ракетка, кубок
 * в цветах проекта, с чернильной обводкой и жёсткой тенью. Фигуры раскладываются по свободному месту страницы: фон замеряет
 * блоки, текст, поля и кнопки и ставит фигуры только туда, где они ни на что не
 * залезают и не наслаиваются друг на друга. Часть фигур выходит за края экрана
 * и садится в зазоры между блоками. Раскладка детерминирована seed: при той же
 * вёрстке рисунок не меняется.
 * ------------------------------------------------------------------------- */

type Shape =
  | "disc"
  | "ring"
  | "triangle"
  | "halfdisc"
  | "plus"
  | "squiggle"
  | "zigzag"
  | "dots"
  | "grid"
  | "stripes"
  | "capsule"
  | "football"
  | "basketball"
  | "tennis"
  | "shuttlecock"
  | "dumbbell"
  | "whistle"
  | "stopwatch"
  | "medal"
  | "volleyball"
  | "kettlebell"
  | "cone"
  | "pawn"
  | "racket"
  | "trophy"

type Variant = "desktop" | "mobile" | "auth"
/** Набор фигур: спортивный инвентарь (по умолчанию) или геометрия Memphis. */
type Theme = "memphis" | "sport"

type Placed = { shape: Shape; x: number; y: number; size: number; rotate: number; color: string }

const INK = "var(--ink)"
const PALETTE = ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--sky)", "var(--mint)"]

/** Размерные группы: крупные ставятся первыми, мелкие заполняют остаток. */
const TIERS: { share: number; size: [number, number]; shapes: Shape[] }[] = [
  {
    share: 0.24,
    size: [74, 112],
    shapes: ["disc", "triangle", "halfdisc", "capsule", "grid", "squiggle", "zigzag", "dots"],
  },
  { share: 0.38, size: [42, 64], shapes: ["disc", "ring", "triangle", "stripes", "dots", "halfdisc", "capsule"] },
  { share: 0.38, size: [20, 32], shapes: ["plus", "disc", "ring", "plus"] },
]

/** Спортивный набор: крупный инвентарь первым, мелкие мячи заполняют остаток. */
const SPORT_TIERS: typeof TIERS = [
  {
    share: 0.26,
    size: [66, 96],
    shapes: ["football", "basketball", "volleyball", "kettlebell", "dumbbell", "stopwatch", "trophy", "racket"],
  },
  {
    share: 0.38,
    size: [42, 60],
    shapes: ["tennis", "shuttlecock", "whistle", "medal", "pawn", "cone", "racket", "volleyball", "dumbbell"],
  },
  { share: 0.36, size: [22, 32], shapes: ["tennis", "football", "basketball", "volleyball", "shuttlecock"] },
]

/** Доля размера фигуры, которую она реально занимает (радиус описанного круга). */
const FOOTPRINT: Record<Shape, number> = {
  disc: 0.46,
  ring: 0.42,
  triangle: 0.5,
  halfdisc: 0.48,
  plus: 0.44,
  squiggle: 0.5,
  zigzag: 0.5,
  dots: 0.5,
  grid: 0.52,
  stripes: 0.48,
  capsule: 0.5,
  football: 0.48,
  basketball: 0.48,
  tennis: 0.48,
  shuttlecock: 0.5,
  dumbbell: 0.52,
  whistle: 0.5,
  stopwatch: 0.5,
  medal: 0.5,
  volleyball: 0.48,
  kettlebell: 0.5,
  cone: 0.5,
  pawn: 0.5,
  racket: 0.52,
  trophy: 0.5,
}

const ROTATABLE = new Set<Shape>(["shuttlecock", "dumbbell", "whistle", "medal", "racket", "cone", "kettlebell", "pawn", "trophy", "triangle", "halfdisc", "stripes", "capsule", "squiggle", "zigzag", "grid"])
const LINEAR = new Set<Shape>(["plus", "stripes", "dots"])

/** Отступ фигуры от боковых сторон блоков, px. */
const CLEAR = 32
/** Отступ от текста, кнопок, полей и картинок, px: на них фигуры не залезают никогда. */
const CLEAR_HARD = 14
/** Доля попыток, в которых фигура садится «за блок»: центр на краю карточки, видна выглядывающая часть. */
const STRADDLE_SHARE = 0.3
/** Отступ между фигурами, px. */
const SPACING = 80
/** Сколько площади приходится на одну фигуру, px². Меньше — гуще. */
const AREA_PER_SHAPE = 160000
/** Сколько ждать тишины в DOM перед дочисткой рисунка, мс. */
const SETTLE_MS = 400
/**
 * Потолок ожидания дочистки, мс: на страницах, где DOM меняется постоянно (карта, ленты с автообновлением, бобр),
 * тишины может не быть вовсе — тогда дочищаем по тому, что уже на экране.
 */
const MAX_WAIT_MS = 1500
/** Версия кэша раскладок: поменялся алгоритм — меняем, старые раскладки не подхватятся. */
const CACHE_VERSION = 1

/**
 * Ключ кэша: страница (seed), вариант и ширина с округлением. Высоту не берём: при первом рендере страница ещё
 * без данных и ниже итоговой — с высотой в ключе кэш почти не совпадал бы; лишние фигуры ниже края обрезаются.
 */
function cacheKey(key: string, variant: Variant, width: number, theme: Theme) {
  return `memphis:v${CACHE_VERSION}:${theme}:${variant}:${key}:${Math.round(width / 40) * 40}`
}

/** Готовая раскладка из кэша браузера; хранилище может быть недоступно (приватный режим) — тогда null. */
function readCache(cache: string): Placed[] | null {
  try {
    const raw = window.localStorage.getItem(cache)
    return raw ? (JSON.parse(raw) as Placed[]) : null
  } catch {
    return null
  }
}

function writeCache(cache: string, shapes: Placed[]) {
  try {
    window.localStorage.setItem(cache, JSON.stringify(shapes))
  } catch {
    // нет места или хранилище выключено — просто посчитаем в следующий раз заново
  }
}
/** Доля попыток, в которых фигура садится вплотную (на CLEAR) к боковой стороне крупного блока. */
const HUG_SHARE = 0.55
/** Какие препятствия считаются крупными блоками, к которым можно прижаться. */
const MIN_BLOCK = { w: 160, h: 50 }

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

type Box = { l: number; t: number; r: number; b: number }

/** Расстояние от точки до прямоугольника (0 — внутри). */
function distToBox(x: number, y: number, box: Box) {
  const dx = Math.max(box.l - x, 0, x - box.r)
  const dy = Math.max(box.t - y, 0, y - box.b)
  return Math.hypot(dx, dy)
}

/** `hard` — текст, кнопки, поля, картинки; `soft` — сплошные блоки (карточки), за которыми фигура может прятаться. */
type Obstacles = { hard: Box[]; soft: Box[] }

/** К какой размерной группе относится фигура (с учётом масштаба). */
function tierOf(size: number, scale: number) {
  return size >= 70 * scale ? 0 : size >= 40 * scale ? 1 : 2
}

/**
 * Раскладка фигур по свободному месту прямоугольника width × height с препятствиями.
 * `keep` — уже нарисованные фигуры: те, на которые не наехал контент, остаются на месте, остальное место добирается новыми.
 */
function layout(
  width: number,
  height: number,
  obstacles: Obstacles,
  seed: string,
  scale: number,
  keep: Placed[] = [],
  theme: Theme = "memphis",
): Placed[] {
  const tiers = theme === "sport" ? SPORT_TIERS : TIERS
  // спортивный и геометрический фоны раскладываются одинаково: тот же ритм, что был у Memphis
  const straddle = STRADDLE_SHARE
  const clear = CLEAR
  const spacing = SPACING
  const rand = mulberry(hashSeed(seed))
  function pick<T>(list: readonly T[]): T {
    return list[Math.floor(rand() * list.length)]
  }
  const total = Math.min(35, Math.max(3, Math.round((width * height) / (AREA_PER_SHAPE * scale * scale))))
  const placed: { p: Placed; cx: number; cy: number; r: number }[] = []
  const blocks = obstacles.soft.filter((o) => o.r - o.l >= MIN_BLOCK.w && o.b - o.t >= MIN_BLOCK.h)
  const kept = [0, 0, 0]
  for (const p of keep) {
    const r = p.size * FOOTPRINT[p.shape]
    const cx = p.x + p.size / 2
    const cy = p.y + p.size / 2
    if (obstacles.hard.some((o) => distToBox(cx, cy, o) < r + CLEAR_HARD - 0.5)) continue
    placed.push({ p, cx, cy, r })
    kept[tierOf(p.size, scale)]++
  }

  for (const [index, tier] of tiers.entries()) {
    const want = Math.round(total * tier.share) - kept[index]
    for (let n = 0; n < want; n++) {
      const shape = pick(tier.shapes)
      const size = Math.round((tier.size[0] + rand() * (tier.size[1] - tier.size[0])) * scale)
      const r = size * FOOTPRINT[shape]
      for (let attempt = 0; attempt < 50; attempt++) {
        // центр может уйти за край на четверть размера — фигура выглядывает из-за экрана
        let cx = -size * 0.25 + rand() * (width + size * 0.5)
        let cy = -size * 0.25 + rand() * (height + size * 0.5)
        let behind = false
        const mode = rand()
        if (blocks.length && mode < straddle) {
          // за блоком: центр на краю карточки, наружу выглядывает примерно две трети фигуры
          const o = pick(blocks)
          const side = Math.floor(rand() * 4)
          const out = r * 0.35
          if (side === 0) {
            cx = o.l + rand() * (o.r - o.l)
            cy = o.t - out
          } else if (side === 1) {
            cx = o.l + rand() * (o.r - o.l)
            cy = o.b + out
          } else if (side === 2) {
            cx = o.l - out
            cy = o.t + rand() * (o.b - o.t)
          } else {
            cx = o.r + out
            cy = o.t + rand() * (o.b - o.t)
          }
          behind = true
        } else if (blocks.length && mode < straddle + HUG_SHARE * (1 - straddle)) {
          // прижимаемся к боковой стороне блока: край фигуры ровно в CLEAR px от него
          const o = pick(blocks)
          cx = rand() < 0.5 ? o.r + r + clear : o.l - r - clear
          cy = o.t + rand() * (o.b - o.t)
        }
        if (obstacles.hard.some((o) => distToBox(cx, cy, o) < r + CLEAR_HARD - 0.5)) continue
        // сплошные блоки: фигура либо стоит от них на CLEAR, либо намеренно прячется за краем
        if (!behind && obstacles.soft.some((o) => distToBox(cx, cy, o) < r + clear - 0.5)) continue
        if (placed.some((q) => Math.hypot(q.cx - cx, q.cy - cy) < q.r + r + spacing)) continue
        placed.push({
          cx,
          cy,
          r,
          p: {
            shape,
            size,
            x: Math.round(cx - size / 2),
            y: Math.round(cy - size / 2),
            rotate: ROTATABLE.has(shape) ? Math.round((rand() - 0.5) * 50) : 0,
            color: theme === "sport" ? SPORT_COLOR[shape] ?? pick(PALETTE) : LINEAR.has(shape) && rand() < 0.4 ? INK : pick(PALETTE),
          },
        })
        break
      }
    }
  }
  return placed.map((q) => q.p)
}

/* ---------- Что считается содержимым страницы ---------- */

const TEXT_TAGS = /^(H[1-6]|P|LABEL|A|BUTTON|INPUT|SELECT|TEXTAREA|IMG|svg|LI)$/

function isTransparent(color: string) {
  return color === "transparent" || /rgba\([^)]*,\s*0\)$/.test(color)
}

/** Блоки, текст и элементы управления, на которые узоры не должны залезать (в px контейнера фона). */
function collectObstacles(bg: HTMLElement, scope: HTMLElement): Obstacles {
  const base = bg.getBoundingClientRect()
  const zoom = base.width / (bg.offsetWidth || 1) || 1
  const maxArea = base.width * base.height * 0.6
  const result: Obstacles = { hard: [], soft: [] }
  const push = (rect: DOMRect, kind: keyof Obstacles) => {
    if (rect.width <= 0 || rect.height <= 0 || rect.width * rect.height > maxArea) return
    result[kind].push({
      l: (rect.left - base.left) / zoom,
      t: (rect.top - base.top) / zoom,
      r: (rect.right - base.left) / zoom,
      b: (rect.bottom - base.top) / zoom,
    })
  }

  // Обход вглубь со стеком: скрытые и fixed-ветки отбрасываются целиком (на страницах лежат сразу десктопная
  // и мобильная вёрстки, одна из них display:none), внутрь svg, canvas, текста и кнопок не заходим — хватает их рамки.
  const stack = Array.from(scope.children)
  while (stack.length) {
    const node = stack.pop()!
    if (node === bg) continue
    const style = getComputedStyle(node)
    if (style.display === "none" || style.position === "fixed") continue
    const leaf = node.tagName === "svg" || node.tagName === "CANVAS" || (TEXT_TAGS.test(node.tagName) && node.tagName !== "A")
    if (!leaf) stack.push(...Array.from(node.children))
    if (style.visibility === "hidden") continue
    const rect = node.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    const solid =
      !isTransparent(style.backgroundColor) ||
      style.backgroundImage !== "none" ||
      parseFloat(style.borderTopWidth) > 0 ||
      style.boxShadow !== "none"
    if (TEXT_TAGS.test(node.tagName)) {
      push(rect, "hard")
      continue
    }
    if (solid) {
      push(rect, "soft")
    }
    // текст прямо внутри обычного div/span
    const hasText = Array.from(node.childNodes).some((c) => c.nodeType === Node.TEXT_NODE && c.textContent?.trim())
    if (hasText) {
      const range = document.createRange()
      range.selectNodeContents(node)
      push(range.getBoundingClientRect(), "hard")
    }
  }
  return result
}

/* ---------- Рисунки фигур ---------- */

/** Узнаваемые цвета инвентаря; остальное — из общей палитры. */
const SPORT_COLOR: Partial<Record<Shape, string>> = {
  football: "#ffffff",
  basketball: "var(--accent)",
  tennis: "var(--secondary)",
  shuttlecock: "#ffffff",
  medal: "var(--sun)",
  volleyball: "var(--sun)",
  cone: "var(--accent)",
  trophy: "var(--sun)",
}

const SHADOW = 2.5

function Glyph({
  shape,
  color,
  ink = INK,
  shadow,
}: {
  shape: Shape
  color: string
  /** Цвет линий и деталей; на тёмном фоне — светлый (`var(--paper)`). */
  ink?: string
  /** Цвет жёсткой тени; по умолчанию как линии. */
  shadow?: string
}) {
  // светлый вариант для тёмных блоков: линии, детали и тень берутся из пропсов, а не из чернил
  const INK = ink
  const SH = shadow ?? ink
  const line = { stroke: color, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const
  const outline = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" } as const
  /** Сплошная фигура с жёсткой тенью: сначала чернильная копия со сдвигом, сверху — цветная с обводкой. */
  type Paint = { fill: string; stroke: string; strokeWidth: number; strokeLinejoin: "round" }
  const solid = (draw: (paint: Paint) => React.ReactNode, fill = color) => (
    <>
      <g transform={`translate(${SHADOW} ${SHADOW})`}>{draw({ fill: SH, stroke: SH, strokeWidth: 3, strokeLinejoin: "round" })}</g>
      {draw({ fill, ...outline })}
    </>
  )
  const svg = (viewBox: string, children: React.ReactNode) => (
    <svg viewBox={viewBox} className="size-full overflow-visible">
      {children}
    </svg>
  )

  switch (shape) {
    case "disc":
      return svg(
        "0 0 40 40",
        <>
          <circle cx={20 + SHADOW} cy={20 + SHADOW} r="16" fill={SH} />
          <circle cx="20" cy="20" r="16" fill={color} {...outline} />
        </>,
      )
    case "ring":
      return svg("0 0 40 40", <circle cx="20" cy="20" r="14" {...line} strokeWidth={6} />)
    case "triangle":
      return svg(
        "0 0 40 40",
        <>
          <polygon
            points="4,36 36,36 20,5"
            fill={SH}
            transform={`translate(${SHADOW} ${SHADOW})`}
            strokeLinejoin="round"
            stroke={SH}
            strokeWidth="3"
          />
          <polygon points="4,36 36,36 20,5" fill={color} {...outline} />
        </>,
      )
    case "halfdisc":
      return svg(
        "0 0 40 40",
        <>
          <path
            d="M3 30 A17 17 0 0 1 37 30 Z"
            fill={SH}
            transform={`translate(${SHADOW} ${SHADOW})`}
            stroke={SH}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M3 30 A17 17 0 0 1 37 30 Z" fill={color} {...outline} />
        </>,
      )
    case "plus":
      return svg("0 0 24 24", <path d="M12 3 V21 M3 12 H21" {...line} strokeWidth={5.5} />)
    case "squiggle":
      return svg("0 0 100 24", <path d="M2 12 Q 14 0 26 12 T 50 12 T 74 12 T 98 12" {...line} strokeWidth={4.5} />)
    case "zigzag":
      return svg(
        "0 0 100 24",
        <path d="M2 20 L 18 4 L 34 20 L 50 4 L 66 20 L 82 4 L 98 20" {...line} strokeWidth={4.5} />,
      )
    case "dots":
      return svg(
        "0 0 80 64",
        <>
          {Array.from({ length: 20 }, (_, i) => (
            <circle key={i} cx={8 + (i % 5) * 16} cy={8 + Math.floor(i / 5) * 16} r="3.2" fill={color} />
          ))}
        </>,
      )
    case "grid":
      return svg(
        "0 0 64 64",
        <g stroke={color} strokeWidth="3" strokeLinecap="round" fill="none">
          <rect x="3" y="3" width="58" height="58" rx="5" />
          <path d="M22 3 V61 M42 3 V61 M3 22 H61 M3 42 H61" />
        </g>,
      )
    case "stripes":
      return svg(
        "0 0 40 40",
        <g stroke={color} strokeWidth="4" strokeLinecap="round">
          <path d="M6 34 L16 6" />
          <path d="M17 34 L27 6" />
          <path d="M28 34 L38 6" />
        </g>,
      )
    case "football":
      return svg(
        "0 0 40 40",
        <>
          <circle cx={20 + SHADOW} cy={20 + SHADOW} r="16" fill={SH} />
          <circle cx="20" cy="20" r="16" fill={color} {...outline} />
          <polygon points="20,13 26.7,17.8 24.1,25.6 15.9,25.6 13.3,17.8" fill={INK} />
          <path d="M20 13 V5 M26.7 17.8 L34 15 M24.1 25.6 L29 32 M15.9 25.6 L11 32 M13.3 17.8 L6 15" stroke={INK} strokeWidth="2.5" />
        </>,
      )
    case "basketball":
      return svg(
        "0 0 40 40",
        <>
          <circle cx={20 + SHADOW} cy={20 + SHADOW} r="16" fill={SH} />
          <circle cx="20" cy="20" r="16" fill={color} {...outline} />
          <path d="M4 20 H36 M20 4 V36 M9 8 Q16 20 9 32 M31 8 Q24 20 31 32" fill="none" stroke={INK} strokeWidth="2.5" />
        </>,
      )
    case "tennis":
      return svg(
        "0 0 40 40",
        <>
          <circle cx={20 + SHADOW} cy={20 + SHADOW} r="16" fill={SH} />
          <circle cx="20" cy="20" r="16" fill={color} {...outline} />
          <path d="M8 9 Q17 20 8 31 M32 9 Q23 20 32 31" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </>,
      )
    case "shuttlecock":
      return svg(
        "0 0 40 40",
        <>
          <path d="M9 4 L31 4 L24 26 L16 26 Z" fill={SH} transform={`translate(${SHADOW} ${SHADOW})`} />
          <path d="M9 4 L31 4 L24 26 L16 26 Z" fill={color} {...outline} />
          <path d="M15 5 L18 25 M25 5 L22 25" stroke={INK} strokeWidth="2" />
          <circle cx={20 + SHADOW} cy={31 + SHADOW} r="6" fill={SH} />
          <circle cx="20" cy="31" r="6" fill="var(--accent)" {...outline} />
        </>,
      )
    case "dumbbell":
      return svg(
        "0 0 48 24",
        <>
          <g transform={`translate(${SHADOW} ${SHADOW})`} fill={SH}>
            <rect x="3" y="2" width="9" height="20" rx="3" />
            <rect x="36" y="2" width="9" height="20" rx="3" />
          </g>
          <rect x="11" y="9.5" width="26" height="5" rx="2" fill={INK} />
          <rect x="3" y="2" width="9" height="20" rx="3" fill={color} {...outline} />
          <rect x="36" y="2" width="9" height="20" rx="3" fill={color} {...outline} />
        </>,
      )
    case "whistle":
      return svg(
        "0 0 40 40",
        <>
          <path d="M6 20 A10 10 0 1 0 26 20 L36 14 L36 8 L14 10 A10 10 0 0 0 6 20 Z" fill={SH} transform={`translate(${SHADOW} ${SHADOW})`} />
          <path d="M6 20 A10 10 0 1 0 26 20 L36 14 L36 8 L14 10 A10 10 0 0 0 6 20 Z" fill={color} {...outline} />
          <circle cx="16" cy="20" r="3.5" fill={INK} />
        </>,
      )
    case "stopwatch":
      return svg(
        "0 0 40 40",
        <>
          <rect x="16" y="2" width="8" height="6" rx="2" fill={INK} />
          <circle cx={20 + SHADOW} cy={23 + SHADOW} r="14" fill={SH} />
          <circle cx="20" cy="23" r="14" fill={color} {...outline} />
          <circle cx="20" cy="23" r="9" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
          <path d="M20 23 L20 17 M20 23 L24 25" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </>,
      )
    case "medal":
      return svg(
        "0 0 40 40",
        <>
          <path d="M11 2 L18 18 M29 2 L22 18" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
          <circle cx={20 + SHADOW} cy={26 + SHADOW} r="11" fill={SH} />
          <circle cx="20" cy="26" r="11" fill={color} {...outline} />
          <path d="M20 20 L21.8 24 L26 24.3 L22.8 27 L23.8 31 L20 28.8 L16.2 31 L17.2 27 L14 24.3 L18.2 24 Z" fill={INK} />
        </>,
      )
    case "volleyball":
      return svg(
        "0 0 40 40",
        <>
          {solid((p) => <circle cx="20" cy="20" r="16" {...p} />)}
          <path
            d="M20 20 Q19 10 12 6 M20 20 Q29 15 35.5 17 M20 20 Q14 28 15 35.5 M8 26 Q14 22 20 20 M28 33 Q26 25 20 20"
            fill="none"
            stroke={INK}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>,
      )
    case "kettlebell":
      return svg(
        "0 0 40 40",
        <>
          <path d="M12 18 V12 A8 8 0 0 1 28 12 V18" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          {solid((p) => <path d="M6 26 A14 12 0 0 1 34 26 A14 11 0 0 1 6 26 Z" {...p} />)}
          <rect x="15" y="22" width="10" height="6" rx="2" fill="#ffffff" stroke={INK} strokeWidth="2" />
        </>,
      )
    case "cone":
      return svg(
        "0 0 40 40",
        <>
          {solid((p) => <rect x="4" y="31" width="32" height="6" rx="2" {...p} />, "var(--card)")}
          {solid((p) => <path d="M16 4 L24 4 L32 31 L8 31 Z" {...p} />)}
          <path d="M13.3 14 L26.7 14 L28.4 20 L11.6 20 Z" fill="#ffffff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </>,
      )
    case "pawn":
      return svg(
        "0 0 40 40",
        solid((p) => (
          <>
            <rect x="9" y="31" width="22" height="6" rx="2" {...p} />
            <path d="M15 17 H25 L23 22 L27 31 H13 L17 22 Z" {...p} />
            <circle cx="20" cy="11" r="6.5" {...p} />
          </>
        )),
      )
    case "racket":
      return svg(
        "0 0 40 40",
        <>
          <path d="M26 26 L35 35" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M26 26 L35 35" stroke="var(--sun)" strokeWidth="4" strokeLinecap="round" />
          {solid((p) => <circle cx="17" cy="17" r="13" {...p} />)}
          <circle cx="12.5" cy="12.5" r="3" fill="#ffffff" />
        </>,
      )
    case "trophy":
      return svg(
        "0 0 40 40",
        <>
          <path d="M11 8 H5 Q5 17 13 18 M29 8 H35 Q35 17 27 18" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          {solid((p) => (
            <>
              <rect x="11" y="31" width="18" height="6" rx="2" {...p} />
              <rect x="17" y="22" width="6" height="9" {...p} />
              <path d="M10 4 H30 V12 A10 10 0 0 1 10 12 Z" {...p} />
            </>
          ))}
          <path d="M20 8 L21.3 10.8 L24.3 11 L22 13 L22.7 16 L20 14.4 L17.3 16 L18 13 L15.7 11 L18.7 10.8 Z" fill={INK} />
        </>,
      )
    case "capsule":
      return svg(
        "0 0 40 40",
        <>
          <rect x={3 + SHADOW} y={12 + SHADOW} width="34" height="16" rx="8" fill={SH} />
          <rect x="3" y="12" width="34" height="16" rx="8" fill={color} {...outline} />
        </>,
      )
  }
}

/* ---------- Готовые раскладки (пребилд) ---------- */

/**
 * Порядок фигур и цветов в упакованной раскладке. Только дописывать в конец: иначе готовые раскладки
 * из `memphis-layouts.json` прочитаются неверно — тогда поднять PREBUILT_VERSION и пересобрать скриптом.
 */
const SHAPE_LIST: Shape[] = [
  "disc", "ring", "triangle", "halfdisc", "plus", "squiggle", "zigzag", "dots", "grid", "stripes", "capsule",
  "football", "basketball", "tennis", "shuttlecock", "dumbbell", "whistle", "stopwatch", "medal",
  "volleyball", "kettlebell", "cone", "pawn", "racket", "trophy",
]
const COLOR_LIST = [INK, ...PALETTE, "#ffffff", "var(--sun)"]
const PREBUILT_VERSION = 1

type Prebuilt = { version: number; layouts: Record<string, Record<string, number[]>> }
const PREBUILT = prebuiltLayouts as Prebuilt

/** Ширина округляется до 40 px: под каждую такую ширину в пребилде своя раскладка. */
function widthBucket(width: number) {
  return Math.round(width / 40) * 40
}

function prebuiltId(theme: Theme, variant: Variant, key: string) {
  return `${theme}:${variant}:${key}`
}

function pack(shapes: Placed[]): number[] {
  return shapes.flatMap((p) => [
    SHAPE_LIST.indexOf(p.shape),
    p.x,
    p.y,
    p.size,
    p.rotate,
    Math.max(0, COLOR_LIST.indexOf(p.color)),
  ])
}

function unpack(data: number[]): Placed[] {
  const shapes: Placed[] = []
  for (let i = 0; i + 5 < data.length; i += 6) {
    const shape = SHAPE_LIST[data[i]]
    if (!shape) continue
    shapes.push({ shape, x: data[i + 1], y: data[i + 2], size: data[i + 3], rotate: data[i + 4], color: COLOR_LIST[data[i + 5]] })
  }
  return shapes
}

/** Готовая раскладка из пребилда для этой страницы и ширины, если есть. */
function readPrebuilt(theme: Theme, variant: Variant, key: string, width: number): Placed[] | null {
  if (PREBUILT.version !== PREBUILT_VERSION) return null
  const data = PREBUILT.layouts[prebuiltId(theme, variant, key)]?.[widthBucket(width)]
  return data ? unpack(data) : null
}

/**
 * Для скрипта пребилда (только dev): каждый видимый фон на странице заново раскладывается по текущему DOM
 * и отдаёт упакованную раскладку. Скрипт `scripts/prebuild-memphis.mjs` собирает их в `memphis-layouts.json`.
 */
const prebuildSources = new Set<() => { id: string; width: number; data: number[] } | null>()
if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(window as unknown as { __memphisPrebuild?: () => unknown }).__memphisPrebuild = () =>
    Array.from(prebuildSources, (collect) => collect()).filter(Boolean)
}

/**
 * Фон со спортивным инвентарём. Кладётся первым ребёнком в `relative isolate overflow-hidden`
 * контейнер страницы — фигуры окажутся под контентом и займут свободное место.
 *
 * Раскладка статичная: она заранее посчитана по готовым страницам (`yarn prebuild:memphis`) и ставится
 * с первого кадра, ничего не перекладывается. Если под эту ширину раскладки нет — считается на месте, как раньше.
 */
function MemphisBackground({
  variant = "desktop",
  className,
  seed,
  theme = "sport",
}: {
  variant?: Variant
  theme?: Theme
  /** Ключ страницы: у каждой страницы свой, рисунок одной страницы всегда одинаковый. */
  seed?: string | number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [shapes, setShapes] = React.useState<Placed[]>([])
  /** Фигуры готовой раскладки, на которые всё же наехал текст (другие данные, чем при пребилде): тихо гасим. */
  const [covered, setCovered] = React.useState<ReadonlySet<number>>(() => new Set())
  /** Откуда раскладка: готовая из пребилда или посчитанная на месте (видно в DevTools). */
  const [source, setSource] = React.useState<"prebuilt" | "live">("live")
  const key = String(seed ?? variant)

  React.useEffect(() => {
    if (!import.meta.env.DEV) return
    const collect = () => {
      const bg = ref.current
      const scope = bg?.parentElement
      if (!bg || !scope || !bg.offsetWidth || !bg.offsetHeight || getComputedStyle(bg).display === "none") return null
      const width = bg.offsetWidth
      const scale = variant === "mobile" || width < 640 ? 0.7 : 1
      const placed = layout(width, bg.offsetHeight, collectObstacles(bg, scope), key, scale, [], theme)
      return { id: prebuiltId(theme, variant, key), width: widthBucket(width), data: pack(placed) }
    }
    prebuildSources.add(collect)
    return () => {
      prebuildSources.delete(collect)
    }
  }, [key, variant, theme])

  React.useLayoutEffect(() => {
    const bg = ref.current
    const scope = bg?.parentElement
    if (!bg || !scope) return
    let done = false
    let timer = 0
    const start = performance.now()
    let current: Placed[] = []

    const place = (keep: Placed[]) => {
      const width = bg.offsetWidth
      const height = bg.offsetHeight
      if (!width || !height) return null
      const scale = variant === "mobile" || width < 640 ? 0.7 : 1
      current = layout(width, height, collectObstacles(bg, scope), key, scale, keep, theme)
      setShapes(current)
      return width
    }

    // Готовая раскладка: ставим сразу и больше не двигаем. Когда страница догрузится, только гасим фигуры,
    // на которые наехал текст или кнопки, — новых не добавляем.
    const prebuilt = bg.offsetWidth ? readPrebuilt(theme, variant, key, bg.offsetWidth) : null
    setCovered(new Set())
    setSource(prebuilt ? "prebuilt" : "live")

    // Первый кадр без пребилда: из кэша браузера или посчитанные по тому, что уже есть на экране.
    // useLayoutEffect успевает до отрисовки, пустого фона не видно.
    const cached = prebuilt ?? (bg.offsetWidth ? readCache(cacheKey(key, variant, bg.offsetWidth, theme)) : null)
    if (cached) {
      current = cached
      setShapes(cached)
    } else {
      place([])
    }

    const refine = () => {
      if (done) return
      if (prebuilt) {
        const hard = collectObstacles(bg, scope).hard
        const hidden = new Set<number>()
        prebuilt.forEach((p, i) => {
          const r = p.size * FOOTPRINT[p.shape]
          const cx = p.x + p.size / 2
          const cy = p.y + p.size / 2
          if (hard.some((o) => distToBox(cx, cy, o) < r + CLEAR_HARD - 0.5)) hidden.add(i)
        })
        setCovered(hidden)
      } else {
        // Без пребилда — дочистка один раз: убираем фигуры, на которые наехал контент, добираем свободное место.
        const width = place(current)
        if (!width) {
          timer = window.setTimeout(refine, 200)
          return
        }
        writeCache(cacheKey(key, variant, width, theme), current)
      }
      done = true
      mutations.disconnect()
    }
    const schedule = () => {
      if (done) return
      window.clearTimeout(timer)
      const elapsed = performance.now() - start
      // ждём тишины, но не дольше MAX_WAIT_MS с момента монтирования
      timer = window.setTimeout(refine, Math.min(SETTLE_MS, Math.max(0, MAX_WAIT_MS - elapsed)))
    }

    const mutations = new MutationObserver((records) => {
      // собственные изменения фона не считаем
      if (records.every((r) => bg.contains(r.target))) return
      schedule()
    })
    mutations.observe(scope, { childList: true, subtree: true, characterData: true })
    document.fonts?.ready.then(schedule)
    schedule()

    return () => {
      done = true
      mutations.disconnect()
      window.clearTimeout(timer)
    }
  }, [key, variant, theme])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-slot="memphis-background"
      data-layout={`${prebuiltId(theme, variant, key)}@${source}`}
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {shapes.map((p, i) => (
        <div
          key={i}
          className="absolute transition-opacity duration-300"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotate}deg)`,
            opacity: covered.has(i) ? 0 : 1,
          }}
        >
          <Glyph shape={p.shape} color={p.color} />
        </div>
      ))}
    </div>
  )
}

/** Ключ фона по адресу страницы: id в пути заменяются на `:id`, чтобы у всех карточек одного вида был один рисунок. */
function routeSeed(pathname: string) {
  return pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id").replace(/\/+$/, "") || "/"
}

export { MemphisBackground, Glyph as MemphisGlyph, routeSeed }
