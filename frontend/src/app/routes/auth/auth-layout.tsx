import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import { Link, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageTransition } from "@/shared/components/ui/page-transition";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

type Brand = {
  title: string;
  mobileTitle: string;
  text: string;
  bubble: string;
  /** Папка в `public/` с картинками панели. */
  assets: "login" | "register";
  bublik: string;
  /** Мобильный баннер: высота, папка картинок и положение Бублика. */
  banner: { height: number; dir: string; bublik: string };
};

const LOGIN_BRAND: Brand = {
  title: "С возвращением в игру",
  mobileTitle: "С возвращением в игру",
  text: "Тренировки, команды и события рядом — всё ждёт тебя.",
  bubble: "Бублик скучал. Заходи — серия не ждёт!",
  assets: "login",
  bublik: "bublik.png",
  banner: { height: 250, dir: "m-login", bublik: "right-2 top-[88px] size-[170px]" },
};

const REGISTER_BRAND: Brand = {
  title: "Собери свой паспорт спортсмена",
  mobileTitle: "Собери свой паспорт",
  text: "Он заполняется сам: каждая тренировка — новая печать.",
  bubble: "Привет! Я Бублик. Сначала паспорт, потом знакомство!",
  assets: "register",
  bublik: "bublik.png",
  banner: { height: 200, dir: "m-register", bublik: "right-2 top-[68px] size-[140px]" },
};

export default function AuthLayout() {
  const { pathname } = useLocation();
  const brand = pathname.includes("/register") ? REGISTER_BRAND : LOGIN_BRAND;

  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col overflow-clip bg-background lg:h-dvh lg:flex-row">
      <MemphisBackground variant="auth" seed={brand.assets} className="hidden lg:block" />
      <MobileBanner brand={brand} />
      <BrandPanel brand={brand} />
      <div className={`relative flex-1 px-4 pt-[18px] pb-5 lg:flex lg:items-center-safe lg:justify-center-safe lg:overflow-y-auto lg:px-6 lg:py-10`}>
        {/* вернуться на лендинг: вход не тупик, если зашёл посмотреть */}
        <Button asChild variant="outline" size="sm" className="mb-4 lg:absolute lg:top-6 lg:left-6 lg:mb-0">
          <Link to="/welcome"><ArrowLeft className="size-4" /> На главную</Link>
        </Button>
        <PageTransition />
      </div>
    </div>
  );
}

function BrandPanel({ brand }: { brand: Brand }) {
  const dir = `/${brand.assets}`;
  return (
    <aside className="relative hidden w-[420px] shrink-0 overflow-hidden bg-primary lg:block">
      <img
        src={`${dir}/memphis.svg`}
        alt=""
        className="absolute top-0 left-0 h-[820px] w-[420px] max-w-none"
      />
      <Link to="/welcome" aria-label="Движ — на главную" className="absolute top-10 left-10">
        <BrandPlate className="gap-[10px]">
          <img src="/icon.svg" alt="" className="size-10 shrink-0" />
          <span className="font-display text-[17px] font-bold whitespace-nowrap text-foreground">
            Движ
          </span>
        </BrandPlate>
      </Link>
      <h2 className="absolute top-[130px] left-10 w-[340px] font-display text-[32px] leading-10 font-extrabold tracking-[-0.5px] text-white">
        {brand.title}
      </h2>
      <p className="absolute top-[266px] left-10 w-[320px] text-base leading-6 font-semibold text-lilac">
        {brand.text}
      </p>
      {/* облачко с репликой стоит прямо над бобром, оба прижаты к низу панели */}
      <div className="absolute bottom-4 left-4 flex flex-col items-start">
        <div className="ml-6 box-border flex w-[260px] items-start rounded-[18px] border-2 border-ink bg-card px-4 py-[14px] shadow-[3px_3px_0_var(--lime)]">
          <p className="text-sm leading-5 font-bold text-foreground">{brand.bubble}</p>
        </div>
        <img src={`${dir}/tail.svg`} alt="" className="-mt-[2px] ml-[84px] h-[18px] w-6 max-w-none" />
        {/* обычный бобр без вещей: живой, моргает, следит за курсором и реагирует на тычки */}
        <div className="w-[320px]">
          <BeaverPet withCatalog={false} className="[&_.beaver-speech]:hidden" />
        </div>
      </div>
    </aside>
  );
}

/** Верхний баннер мобильной версии вместо боковой панели. */
function MobileBanner({ brand }: { brand: Brand }) {
  const { banner } = brand;
  const dir = `/${banner.dir}`;
  return (
    <header
      className="relative w-full shrink-0 overflow-hidden rounded-b-[32px] bg-primary lg:hidden"
      style={{ height: banner.height }}
    >
      <img src={`${dir}/memphis-decor.svg`} alt="" className="absolute inset-0 size-full max-w-none" />
      <Link to="/welcome" aria-label="Движ — на главную" className="absolute top-[18px] left-4">
        <BrandPlate>
          <img src="/icon.svg" alt="" className="size-9 shrink-0" />
          <span className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
            Движ
          </span>
        </BrandPlate>
      </Link>
      {/* ширина — до тела бобра, кегль от ширины экрана: «возвращением» целиком влезает и на 360px */}
      <p className="absolute top-[76px] left-4 w-[calc(100%-176px)] font-display text-[clamp(16px,5vw,22px)] leading-[1.27] font-extrabold tracking-[-0.3px] hyphens-auto text-white">
        {brand.mobileTitle}
      </p>
      {/* живой бобр вместо статичной картинки, как на компьютере */}
      <div className={`absolute flex items-end ${banner.bublik}`}>
        <BeaverPet withCatalog={false} className="w-full [&_.beaver-speech]:hidden" />
      </div>
    </header>
  );
}
