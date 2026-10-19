import { Outlet, useLocation } from "react-router";
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
  banner: { height: 250, dir: "m-login", bublik: "left-[212px] top-[88px] size-[170px]" },
};

const REGISTER_BRAND: Brand = {
  title: "Собери свой паспорт спортсмена",
  mobileTitle: "Собери свой паспорт",
  text: "Он заполняется сам: каждая тренировка — новая печать.",
  bubble: "Привет! Я Бублик. Сначала паспорт, потом знакомство!",
  assets: "register",
  bublik: "bublik.png",
  banner: { height: 200, dir: "m-register", bublik: "left-[242px] top-[68px] size-[140px]" },
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
        <Outlet />
      </div>
    </div>
  );
}

function BrandPanel({ brand }: { brand: Brand }) {
  const dir = `/${brand.assets}`;
  return (
    <aside className="relative hidden min-h-[820px] w-[420px] shrink-0 overflow-hidden bg-primary lg:block">
      <img
        src={`${dir}/memphis.svg`}
        alt=""
        className="absolute top-0 left-0 h-[820px] w-[420px] max-w-none"
      />
      <BrandPlate className="absolute top-10 left-10 gap-[10px]">
        <img src="/icon.svg" alt="" className="size-10 shrink-0" />
        <span className="font-display text-[17px] font-bold whitespace-nowrap text-foreground">
          Движ
        </span>
      </BrandPlate>
      <h2 className="absolute top-[130px] left-10 w-[340px] font-display text-[32px] leading-10 font-extrabold tracking-[-0.5px] text-white">
        {brand.title}
      </h2>
      <p className="absolute top-[266px] left-10 w-[320px] text-base leading-6 font-semibold text-lilac">
        {brand.text}
      </p>
      <div className="absolute top-[432px] left-10 box-border flex w-[260px] items-start rounded-[18px] border-2 border-ink bg-card px-4 py-[14px] shadow-[3px_3px_0_var(--lime)]">
        <p className="text-sm leading-5 font-bold text-foreground">{brand.bubble}</p>
      </div>
      <img
        src={`${dir}/tail.svg`}
        alt=""
        className="absolute top-[502px] left-[100px] h-[18px] w-6 max-w-none"
      />
      <img
        src={`${dir}/${brand.bublik}`}
        alt=""
        className="pointer-events-none absolute top-[548px] left-[60px] size-[240px] max-w-none object-contain"
      />
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
      <BrandPlate className="absolute top-[18px] left-4">
        <img src="/icon.svg" alt="" className="size-9 shrink-0" />
        <span className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
          Движ
        </span>
      </BrandPlate>
      <p className="absolute top-[76px] left-4 w-[200px] break-words font-display text-[22px] leading-7 font-extrabold tracking-[-0.3px] text-white">
        {brand.mobileTitle}
      </p>
      <img
        src={`${dir}/img.png`}
        alt=""
        className={`pointer-events-none absolute max-w-none object-contain ${banner.bublik}`}
      />
    </header>
  );
}
