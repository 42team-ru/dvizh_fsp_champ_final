import * as React from "react"
import { cn } from "cn"

/* ---------------------------------------------------------------------------
 * Фон Memphis. Фигуры раскладываются по свободному месту страницы: фон замеряет
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

type Variant = "desktop" | "mobile" | "auth"

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
}

const ROTATABLE = new Set<Shape>(["triangle", "halfdisc", "stripes", "capsule", "squiggle", "zigzag", "grid"])
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
function cacheKey(key: string, variant: Variant, width: number) {
  return `memphis:v${CACHE_VERSION}:${variant}:${key}:${Math.round(width / 40) * 40}`
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
): Placed[] {
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

  for (const [index, tier] of TIERS.entries()) {
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
        if (blocks.length && mode < STRADDLE_SHARE) {
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
        } else if (blocks.length && mode < STRADDLE_SHARE + HUG_SHARE * (1 - STRADDLE_SHARE)) {
          // прижимаемся к боковой стороне блока: край фигуры ровно в CLEAR px от него
          const o = pick(blocks)
          cx = rand() < 0.5 ? o.r + r + CLEAR : o.l - r - CLEAR
          cy = o.t + rand() * (o.b - o.t)
        }
        if (obstacles.hard.some((o) => distToBox(cx, cy, o) < r + CLEAR_HARD - 0.5)) continue
        // сплошные блоки: фигура либо стоит от них на CLEAR, либо намеренно прячется за краем
        if (!behind && obstacles.soft.some((o) => distToBox(cx, cy, o) < r + CLEAR - 0.5)) continue
        if (placed.some((q) => Math.hypot(q.cx - cx, q.cy - cy) < q.r + r + SPACING)) continue
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
            color: LINEAR.has(shape) && rand() < 0.4 ? INK : pick(PALETTE),
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

const SHADOW = 2.5

function Glyph({ shape, color }: { shape: Shape; color: string }) {
  const line = { stroke: color, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const
  const outline = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" } as const
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
          <circle cx={20 + SHADOW} cy={20 + SHADOW} r="16" fill={INK} />
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
            fill={INK}
            transform={`translate(${SHADOW} ${SHADOW})`}
            strokeLinejoin="round"
            stroke={INK}
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
            fill={INK}
            transform={`translate(${SHADOW} ${SHADOW})`}
            stroke={INK}
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
    case "capsule":
      return svg(
        "0 0 40 40",
        <>
          <rect x={3 + SHADOW} y={12 + SHADOW} width="34" height="16" rx="8" fill={INK} />
          <rect x="3" y="12" width="34" height="16" rx="8" fill={color} {...outline} />
        </>,
      )
  }
}

/**
 * Фон в стиле Memphis. Кладётся первым ребёнком в `relative isolate overflow-hidden`
 * контейнер страницы — фигуры окажутся под контентом и займут свободное место.
 */
function MemphisBackground({
  variant = "desktop",
  className,
  seed,
}: {
  variant?: Variant
  /** Разный seed — разный рисунок; при той же вёрстке рисунок не меняется. */
  seed?: string | number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [shapes, setShapes] = React.useState<Placed[]>([])
  const key = String(seed ?? variant)

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
      current = layout(width, height, collectObstacles(bg, scope), key, scale, keep)
      setShapes(current)
      return width
    }

    // Первый кадр: фигуры сразу — из кэша (страница этого размера уже раскладывалась) или посчитанные
    // по тому, что уже есть на экране. useLayoutEffect успевает до отрисовки, пустого фона не видно.
    const cached = bg.offsetWidth ? readCache(cacheKey(key, variant, bg.offsetWidth)) : null
    if (cached) {
      current = cached
      setShapes(cached)
    } else {
      place([])
    }

    // Дочистка один раз, когда подгрузятся данные: убираем фигуры, на которые наехал контент, и добираем
    // свободное место. Остальные фигуры не двигаются; дальше рисунок не трогаем до ухода со страницы.
    const refine = () => {
      if (done) return
      const width = place(current)
      if (!width) {
        timer = window.setTimeout(refine, 200)
        return
      }
      writeCache(cacheKey(key, variant, width), current)
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
  }, [key, variant])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-slot="memphis-background"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {shapes.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          <Glyph shape={p.shape} color={p.color} />
        </div>
      ))}
    </div>
  )
}

export { MemphisBackground, Glyph as MemphisGlyph }
