import { Link } from "react-router";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import { LOGIN_URL, NAV, REGISTER_URL, SLIDES, type SlideMeta } from "../model/landing-content";
import { useSlideDeck } from "../model/use-slide-deck";
import { FinalSlide, HeroSlide, HowSlide, MapSlide, OrganizersSlide, PainSlide, PetSlide, PicksSlide } from "./slides";
import "./landing.css";

/** Публичный лендинг: восемь слайдов на компьютере, последовательные секции на телефоне. */
export default function LandingPage() {
  const { scrollerRef, active, goTo } = useSlideDeck(SLIDES.length);
  const slide = SLIDES[active - 1];

  return (
    <div className="landing-shell h-dvh overflow-hidden font-sans text-ink">
      <LandingNav active={active} onNavigate={goTo} />
      <main ref={scrollerRef} className="landing h-dvh overflow-x-hidden overflow-y-auto overscroll-y-none lg:snap-y lg:snap-proximity">
        <HeroSlide />
        <PainSlide />
        <MapSlide />
        <PicksSlide />
        <PetSlide />
        <OrganizersSlide />
        <HowSlide />
        <FinalSlide onNavigate={goTo} />
      </main>
      <Pager slide={slide} onNavigate={goTo} />
      <Counter slide={slide} onNext={() => goTo(active + 1)} />
    </div>
  );
}

/** Шапка-капсула поверх слайдов: не двигается, пункт текущего слайда подсвечен. */
function LandingNav({ active, onNavigate }: { active: number; onNavigate: (n: number) => void }) {
  return (
    <header className="landing-nav fixed inset-x-3 top-3 z-30 mx-auto flex h-14 max-w-[1200px] items-center gap-3 rounded-pill border-[2.5px] border-ink bg-white pr-2 pl-3 shadow-[4px_4px_0_var(--ink)] lg:inset-x-10 lg:top-5 lg:h-16 lg:gap-5 lg:pr-3 lg:pl-5">
      <button
        type="button"
        onClick={() => onNavigate(1)}
        aria-label="Движ — в начало"
        className="flex shrink-0 items-center gap-2.5"
      >
        <img src="/icon.svg" alt="" className="size-9 shrink-0 lg:size-10" />
        <span className="font-display text-[17px] leading-[21px] font-bold text-ink">Движ</span>
      </button>
      <nav aria-label="Разделы" className="hidden flex-1 items-center justify-center gap-[22px] lg:flex">
        {NAV.map((item) => (
          <button
            key={item.slide}
            type="button"
            onClick={() => onNavigate(item.slide)}
            aria-current={active === item.slide ? "true" : undefined}
            className="text-sm font-extrabold whitespace-nowrap text-ink hover:text-ultramarine aria-[current]:text-ultramarine"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <Link to={LOGIN_URL} className="ml-auto text-sm font-extrabold whitespace-nowrap text-ink hover:text-ultramarine lg:ml-0">
        Войти
      </Link>
      <Button
        asChild
        rough={false}
        variant="secondary"
        className="h-10 border-[2.5px] px-4 text-sm shadow-none lg:h-11 lg:px-5"
      >
        <Link to={REGISTER_URL}>Начать</Link>
      </Button>
    </header>
  );
}

/** Точки справа: текущий слайд — вытянутая капсула, клик листает к слайду. */
function Pager({ slide, onNavigate }: { slide: SlideMeta; onNavigate: (n: number) => void }) {
  return (
    <nav aria-label="Слайды" className="fixed top-1/2 right-3 z-20 hidden -translate-y-1/2 flex-col items-center gap-1 lg:flex">
      {SLIDES.map((s) => {
        const current = s.n === slide.n;
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => onNavigate(s.n)}
            aria-label={`Слайд ${s.n}: ${s.title}`}
            aria-current={current ? "true" : undefined}
            className={cn(
              "grid size-7 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2",
              slide.dark ? "focus-visible:outline-white" : "focus-visible:outline-ultramarine",
            )}
          >
            <span className={cn("block size-2.5 rounded-full", current && "ring-2 ring-offset-2 ring-offset-transparent",
              slide.dark ? current ? "bg-lime ring-lime" : "bg-white/50" : current ? "bg-ultramarine ring-ultramarine" : "bg-ink/30")} />
          </button>
        );
      })}
    </nav>
  );
}

/** Счётчик «01 / 08» и подсказка «листай» внизу слева. */
function Counter({ slide, onNext }: { slide: SlideMeta; onNext: () => void }) {
  const [num, total] = slide.counter;
  return (
    <div className="fixed bottom-6 left-11 z-20 hidden items-center gap-3 lg:flex">
      <span className={cn("font-display text-base font-extrabold", num)}>{String(slide.n).padStart(2, "0")}</span>
      <span className={cn("text-sm font-extrabold", total)}>/ {String(SLIDES.length).padStart(2, "0")}</span>
      {slide.hint && (
        <button
          type="button"
          onClick={onNext}
          className={cn(
            "flex items-center gap-1.5 rounded-pill border-[1.5px] py-1.5 pr-3 pl-2.5 text-xs font-extrabold",
            slide.hint === "dark" ? "border-white bg-night text-white" : "border-ink bg-white text-ink",
          )}
        >
          <img src={slide.hint === "dark" ? "/landing/s1/icon-down.svg" : "/landing/icon-down-ink.svg"} alt="" className="size-3.5" />
          листай
        </button>
      )}
    </div>
  );
}
