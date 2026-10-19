import { PetNameEditor } from "@/features/rename-pet/ui/pet-name-editor";
import { useState } from "react";
import { MyBeaverPet } from "@/widgets/beaver-pet/ui/my-beaver-pet";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const dir = "m-profile";

const SPORTS = [
  { label: "Бег", tone: "bg-sky-soft" },
  { label: "Йога", tone: "bg-lime-soft" },
  { label: "Вело", tone: "bg-peach" },
];

const STATS = [
  { v: "48", l: "тренировок", tone: "bg-lavender-soft" },
  { v: "312", l: "километров", tone: "bg-lime-soft" },
  { v: "12", l: "дней подряд", tone: "bg-peach" },
];

const BADGES = [
  { title: "Первые 100 км", icon: "icon-trophy", tone: "bg-secondary" },
  { title: "Серия 7 дней", icon: "icon-flame", tone: "bg-peach" },
  { title: "Ранняя пташка", icon: "icon-sun", tone: "bg-sky-soft" },
  { title: "Организатор", icon: "icon-star", tone: "bg-rose" },
];

const WARDROBE = [
  { name: "Кепка", hint: "Надета", tone: "bg-peach", action: "worn" },
  { name: "Шарф", hint: "Куплено", tone: "bg-lime-soft", action: "own" },
  { name: "Кроссовки", hint: "90", tone: "bg-sky-soft", action: "buy" },
  { name: "Очки", hint: "50", tone: "bg-lavender-soft", action: "buy" },
  { name: "Худи", hint: "120", tone: "bg-rose", action: "buy" },
] as const;

const SETTINGS = [
  { icon: "icon-bell-set", label: "Уведомления" },
  { icon: "icon-shield", label: "Приватность" },
  { icon: "icon-settings1", label: "Настройки приложения" },
  { icon: "icon-logout", label: "Выйти", danger: true },
];

const small = "text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap";

function AppBar() {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-[11px] border-2 border-ink bg-secondary">
          <Icon name={`${dir}/icon-run`} className="size-5" />
        </span>
        <span className="font-display text-xl leading-[normal] font-bold text-foreground">
          Профиль
        </span>
      </div>
      <button
        type="button"
        aria-label="Настройки"
        className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
      >
        <Icon name={`${dir}/icon-settings`} className="size-5" />
      </button>
    </div>
  );
}

function Passport() {
  return (
    <div className="px-4">
      <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-card shadow-[4px_4px_0_var(--primary)]">
        <div className="flex h-10 items-center justify-between bg-secondary px-[18px] text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-foreground">
          <span>ЦИФРОВОЙ ПАСПОРТ · СПОРТ РЯДОМ</span>
          <span>№ SR-0048</span>
        </div>
        <div className="flex flex-col gap-[14px] p-[18px]">
          <div className="flex items-center gap-[14px]">
            <span className="box-border flex size-[72px] shrink-0 items-center justify-center rounded-[36px] border-2 border-ink bg-sky text-[15px] leading-[normal] font-extrabold text-foreground">
              АС
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <Eyebrow className={small}>ИМЯ</Eyebrow>
              <p className="w-[190px] font-display text-[19px] leading-6 font-bold text-foreground">
                Аня Соколова
              </p>
              <p className="text-[13px] leading-[normal] font-medium whitespace-nowrap text-muted-foreground">
                @anya.runs · Красноярск
              </p>
            </div>
            <span className="shrink-0 rounded-pill bg-primary px-[10px] py-1 text-[11px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-white">
              УР. 7
            </span>
          </div>
          <div className="flex gap-2">
            {SPORTS.map((s) => (
              <span
                key={s.label}
                className={cn(
                  "rounded-pill border-[1.5px] border-ink px-[14px] py-[6px] text-[13px] leading-[normal] font-extrabold whitespace-nowrap text-foreground",
                  s.tone
                )}
              >
                {s.label}
              </span>
            ))}
          </div>
          <div className="flex gap-2 leading-[normal] font-bold whitespace-nowrap">
            {STATS.map((s) => (
              <div
                key={s.l}
                className={cn(
                  "relative box-border flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] border-[1.5px] border-transparent p-[10px]",
                  s.tone
                )}
              >
                <span className="font-display text-lg text-foreground">{s.v}</span>
                <span className="text-[11px] text-muted-foreground">{s.l}</span>
                <RoughBorder radius={14} strokeWidth={1.5} roughness={0.8} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pet() {
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-3 rounded-[26px] border-2 border-ink bg-sky p-[18px] shadow-[4px_4px_0_var(--ink)]">
        <div className="flex flex-wrap items-center gap-3">
          <MyBeaverPet speechContainer={speechContainer} className="size-28 shrink-0 [&_.beaver-pet]:h-full [&_svg]:h-full" />
          <div className="flex min-w-[180px] flex-1 flex-col items-start gap-1">
            <Eyebrow className={cn(small, "text-foreground")}>ТВОЙ ПИТОМЕЦ</Eyebrow>
            <PetNameEditor />
            <p className="text-[13px] leading-[normal] font-bold whitespace-nowrap text-foreground">
              Бобр · уровень 4
            </p>
            <span className="box-border flex items-center gap-[6px] rounded-pill border-[1.5px] border-ink bg-card py-1 pr-3 pl-[6px]">
              <span className="box-border size-[18px] rounded-[9px] border-[1.5px] border-ink bg-secondary" />
              <span className="text-[13px] leading-[normal] font-extrabold text-foreground">150</span>
            </span>
          </div>
        </div>
        <div ref={setSpeechContainer} className="relative h-[72.5px] w-full" />
        {[
          { label: "Энергия", value: "4 из 5", pct: 80 },
          { label: "Стиль", value: "1 из 5", pct: 20 },
        ].map((m) => (
          <div key={m.label} className="flex flex-col gap-1">
            <div className="flex justify-between text-[13px] leading-[normal] whitespace-nowrap text-foreground">
              <span className="font-extrabold">{m.label}</span>
              <span className="font-bold">{m.value}</span>
            </div>
            <Progress value={m.pct} indicatorClassName="bg-secondary border-r-0" className="bg-card" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Streak() {
  return (
    <div className="px-4">
      <div className="box-border flex w-full flex-col gap-2 rounded-[24px] border-2 border-ink bg-primary p-5">
        <Eyebrow className={cn(small, "tracking-[1.5px] text-lilac")}>СЕРИЯ</Eyebrow>
        <div className="flex items-end gap-2 leading-[normal] whitespace-nowrap text-white">
          <span className="font-display text-[52px] font-extrabold">12</span>
          <span className="font-display text-xl font-bold">дней</span>
        </div>
        <Progress value={75} indicatorClassName="bg-secondary border-r-0" className="bg-card" />
        <p className="text-[13px] leading-[18px] font-bold text-white">
          Лучший результат — 16. Ещё 4 дня, и бейдж «Железная воля» твой.
        </p>
      </div>
    </div>
  );
}

function Head({ title, hint, small: hintSmall }: { title: string; hint: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 leading-[normal] font-bold whitespace-nowrap">
      <h2 className="font-display text-lg text-foreground">{title}</h2>
      <span className={cn("text-muted-foreground", hintSmall ? "text-xs" : "text-[13px]")}>
        {hint}
      </span>
    </div>
  );
}

function Achievements() {
  return (
    <>
      <Head title="Достижения" hint="12 из 30" />
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
        {BADGES.map((b) => (
          <div
            key={b.title}
            className="box-border flex w-[130px] shrink-0 flex-col gap-[10px] rounded-[20px] border-2 border-ink bg-card p-[14px]"
          >
            <span
              className={cn(
                "box-border flex size-12 items-center justify-center rounded-[14px] border-2 border-ink",
                b.tone
              )}
            >
              <Icon name={`${dir}/${b.icon}`} className="size-6" />
            </span>
            <span className="text-[13px] leading-[17px] font-extrabold text-foreground">
              {b.title}
            </span>
          </div>
        ))}
        <div className="box-border flex w-[130px] shrink-0 flex-col gap-[10px] rounded-[20px] border-2 border-dashed border-muted-foreground bg-card p-[14px]">
          <span className="box-border flex size-12 items-center justify-center rounded-[14px] border-2 border-dashed border-muted-foreground">
            <Icon name={`${dir}/icon-lock`} className="size-6" />
          </span>
          <span className="text-[13px] leading-[17px] font-extrabold text-muted-foreground">
            Марафон
          </span>
        </div>
      </div>
    </>
  );
}

function Wardrobe() {
  return (
    <>
      <Head title="Гардероб" hint="Монеты — за тренировки" small />
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
        {WARDROBE.map((w) => (
          <div
            key={w.name}
            className={cn(
              "box-border flex w-[132px] shrink-0 flex-col items-center gap-[6px] rounded-[20px] border-2 border-ink px-3 py-[14px]",
              w.tone
            )}
          >
            <span className="box-border size-14 rounded-[28px] border-2 border-ink bg-card" />
            <span className="text-sm leading-[normal] font-extrabold whitespace-nowrap text-foreground">
              {w.name}
            </span>
            <span className="text-xs leading-[normal] font-bold whitespace-nowrap text-muted-foreground">
              {w.hint}
            </span>
            {w.action === "worn" ? (
              <Button variant="ink" className="h-10 w-full border-ink px-5 text-xs shadow-none">
                Снять
              </Button>
            ) : (
              <Button variant="soft" className="h-10 w-full px-5 text-xs">
                {w.action === "own" ? "Надеть" : "Купить"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Settings() {
  return (
    <div className="px-4">
      <Card className="overflow-hidden rounded-[22px]">
        {SETTINGS.map((s, i) => (
          <div key={s.label}>
            {i > 0 ? <div className="h-px bg-track" /> : null}
            <button
              type="button"
              className="flex h-14 w-full items-center gap-3 px-[18px] text-left"
            >
              <Icon name={`${dir}/${s.icon}`} className="size-[22px]" />
              <span
                className={cn(
                  "text-[15px] leading-[normal] font-extrabold whitespace-nowrap",
                  "danger" in s ? "text-accent" : "text-foreground"
                )}
              >
                {s.label}
              </span>
              <Icon name={`${dir}/icon-chev`} className="ml-auto size-[18px]" />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ProfileMobile() {
  return (
    <div className="relative isolate flex min-h-dvh overflow-clip flex-col gap-4 bg-background pb-[110px] lg:hidden">
      <MemphisBackground variant="mobile" seed="profile" />
      <AppBar />
      <Passport />
      <Pet />
      <Streak />
      <Achievements />
      <Wardrobe />
      <Settings />
      <MobileTabBar current="profile" />
    </div>
  );
}
