import type * as React from "react";
import { Link } from "react-router";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import { MemphisGlyph } from "@/shared/components/ui/memphis-background";

type Css = React.CSSProperties & Record<`--${string}`, string | number>;

/**
 * Слайд: на десктопе — экран высотой 100vh со сценой 1280×800 по центру (масштаб — `--stage-scale`),
 * на телефоне и планшете — обычный блок, где содержимое идёт столбиком.
 */
export function Slide({ n, className, children }: { n: number; className?: string; children: React.ReactNode }) {
  return (
    <section
      id={`s${n}`}
      data-slide={n}
      className={cn("landing-slide relative isolate scroll-mt-0 overflow-hidden lg:h-dvh lg:snap-start", className)}
    >
      <div
        className={cn(
          "landing-stage relative flex flex-col items-center gap-6 px-4 pb-16 lg:absolute lg:top-1/2 lg:left-1/2 lg:block lg:h-[800px] lg:w-[1280px] lg:p-0",
          n === 1 ? "pt-28" : "pt-16",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Слой сцены; `speed` — номер слоя из макета (0.6 mid, 1 front, 1.3 float), задаёт только порядок наложения:
 * карточки стоят на месте, отдельный параллакс применяется только к спортивному декору.
 * Без `mobile` на телефоне слой скрыт, с ним — его элементы идут в общем столбике.
 */
export function Layer({ speed, mobile, children }: { speed: number; mobile?: boolean; children: React.ReactNode }) {
  return (
    <div
      data-speed={speed}
      className={cn(
        "lg:pointer-events-none lg:absolute lg:inset-0",
        mobile ? "contents lg:block" : "hidden lg:block",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Элемент на сцене по координатам макета (x, y, ширина, высота, поворот).
 * `anim` и `d` сохраняют пометки макета; элементы стоят на месте и не обрезаются анимацией.
 */
export function At({
  x,
  y,
  w,
  h,
  r,
  anim,
  d,
  className,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  anim?: "up" | "left" | "right" | "drop" | "scale" | "pop" | "grow" | "draw";
  d?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const style: Css = {
    "--x": `${x}px`,
    "--y": `${y}px`,
    "--w": w ? `${w}px` : "auto",
    "--h": h ? `${h}px` : "auto",
    "--d": `${d ?? 0}ms`,
    rotate: r ? `${r}deg` : undefined,
  };
  return (
    <div
      data-anim={anim}
      style={style}
      className={cn("landing-item min-w-0 max-w-full lg:absolute lg:top-(--y) lg:left-(--x) lg:h-(--h) lg:w-(--w)", className)}
    >
      {children}
    </div>
  );
}

/** Картинка-ассет из макета: декоративная, на всю площадь своей рамки. */
export function Art({ src, className }: { src: string; className?: string }) {
  return <img src={src} alt="" loading="lazy" className={cn("block size-full max-w-none", className)} />;
}

/** Подпись капсом над заголовком слайда. */
export function Kicker({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("text-[11px] font-extrabold tracking-[1.8px] uppercase", className)}>{children}</p>
  );
}

/** Заголовок слайда: Unbounded, на десктопе размер из макета. */
export function Title({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={cn("font-display text-[34px] leading-[40px] font-extrabold text-ink lg:text-[52px] lg:leading-[56px]", className)}>
      {children}
    </h2>
  );
}

/** Плашка-капсула: вид спорта, причина подбора, подсказка. */
export function Chip({
  icon,
  className,
  children,
}: {
  icon?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-pill border-[1.5px] border-ink px-3 py-0.5 text-[10px] font-extrabold text-ink",
        className,
      )}
    >
      {icon && <img src={icon} alt="" className="size-[1.1em] shrink-0" />}
      {children}
    </span>
  );
}

const BTN_TONE = {
  lime: "secondary",
  blue: "default",
  outline: "clear",
} as const;

/** Большая кнопка-ссылка слайда (Button из shadcn): лаймовая, синяя или контурная белая. */
export function CtaLink({
  to,
  tone,
  icon,
  shadow = "ink",
  className,
  children,
}: {
  to: string;
  tone: keyof typeof BTN_TONE;
  icon?: string;
  shadow?: "ink" | "accent" | "none";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      asChild
      rough={false}
      variant={BTN_TONE[tone]}
      className={cn(
        "pointer-events-auto min-h-[56px] h-auto max-w-full gap-2 whitespace-normal border-[2.5px] px-6 py-3 text-center text-base lg:min-h-[60px] lg:px-[30px] lg:text-[17px]",
        tone === "outline" && "border-white shadow-none",
        tone !== "outline" && shadow === "ink" && "shadow-[5px_5px_0_var(--ink)]",
        tone !== "outline" && shadow === "accent" && "shadow-[5px_5px_0_var(--ultramarine)]",
        className,
      )}
    >
      <Link to={to}>
        {icon && <img src={icon} alt="" className="size-[18px] shrink-0" />}
        {children}
      </Link>
    </Button>
  );
}

/** Пункт списка возможностей: иконка в квадратной плашке и подпись. */
export function Point({ icon, box = "bg-white", className, children }: { icon: string; box?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-[14px] border-2 border-ink", box)}>
        <img src={icon} alt="" className="size-[22px]" />
      </span>
      <p className={cn("text-base leading-[22px] font-bold text-ink lg:w-[400px]", className)}>{children}</p>
    </div>
  );
}

/** Карточка с обводкой и жёсткой тенью. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[20px] border-[2.5px] border-ink bg-white shadow-[5px_5px_0_var(--ink)]", className)}>
      {children}
    </div>
  );
}

/** Кружок с инициалами участника. */
export function Initials({ tone, className, children }: { tone: string; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-pill border-2 border-ink font-display text-[9px] font-extrabold text-ink",
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Жёлтая монета бобра. */
export function Coin({ icon, size = 48, className }: { icon: string; size?: number; className?: string }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "landing-coin grid place-items-center rounded-pill border-[2.5px] border-ink bg-sun shadow-[3px_3px_0_var(--ink)]",
        className,
      )}
    >
      <img src={icon} alt="" style={{ width: size * 0.54, height: size * 0.54 }} />
    </span>
  );
}

type GearShape = "football" | "basketball" | "tennis" | "shuttlecock" | "dumbbell" | "whistle" | "stopwatch" | "medal";

const GEAR_COLOR: Record<GearShape, string> = {
  football: "#ffffff",
  basketball: "var(--accent)",
  tennis: "var(--secondary)",
  shuttlecock: "#ffffff",
  dumbbell: "var(--sky)",
  whistle: "var(--sky)",
  stopwatch: "var(--sun)",
  medal: "var(--sun)",
};

/** Спортивный инвентарь на заднем слое вместо геометрических узоров: мячи, гантели, секундомер, медаль. */
export function Gear({ shape, x, y, size, r }: { shape: GearShape; x: number; y: number; size: number; r?: number }) {
  return (
    <At x={x} y={y} w={size} h={size} r={r} className="landing-gear">
      <MemphisGlyph shape={shape} color={GEAR_COLOR[shape]} />
    </At>
  );
}
