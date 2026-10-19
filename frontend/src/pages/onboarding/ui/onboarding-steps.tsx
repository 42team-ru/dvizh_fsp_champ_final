import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Icon } from "@/shared/components/ui/icon";
import { Slider } from "@/shared/components/ui/slider";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "cn";

export type OnboardingData = {
  sports: string[];
  customSports: string[];
  level: "novice" | "amateur" | "pro";
  days: string[];
  daytime: "morning" | "day" | "evening";
  radius: number;
  petName: string;
  outfit: "none" | "cap";
  helpers: { reminders: boolean; nearby: boolean; cheer: boolean };
};

export const INITIAL_DATA: OnboardingData = {
  sports: [],
  customSports: [],
  level: "amateur",
  days: ["Вт", "Чт", "Сб"],
  daytime: "evening",
  radius: 5,
  petName: "Бублик",
  outfit: "none",
  helpers: { reminders: true, nearby: true, cheer: false },
};

type StepProps = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
};

const dir = "/onboarding";

function Img({ src, className }: { src: string; className?: string }) {
  return <img src={`${dir}/${src}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-auto border-2 px-[14px] py-[6px] text-[11px] leading-[normal] font-extrabold tracking-[1.2px]",
        className
      )}
    >
      {children}
    </Badge>
  );
}

function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-2 leading-[normal] whitespace-nowrap">
      <h1 className="font-display text-[40px] leading-[normal] font-extrabold tracking-[-0.5px] text-foreground">
        {title}
      </h1>
      <p className="text-base font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}

function Bubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "box-border flex items-start rounded-[18px] border-2 border-ink bg-card px-4 py-[14px] shadow-[3px_3px_0_var(--lime)]",
        className
      )}
    >
      <p className="flex-1 text-sm leading-5 font-bold text-foreground">{children}</p>
    </div>
  );
}

/* ---------- 1. Знакомство ---------- */

export function StepWelcome() {
  return (
    <div className="absolute top-[131px] left-[90px] flex items-center gap-20">
      <div className="flex w-[560px] flex-col items-start gap-5">
        <Pill>ДОБРО ПОЖАЛОВАТЬ</Pill>
        <h1 className="w-full font-display text-[52px] leading-[60px] font-extrabold tracking-[-1px] text-foreground">
          Привет, я Бублик!
        </h1>
        <p className="w-full text-lg leading-7 font-medium text-muted-foreground">
          Буду твоим помощником: найду события рядом, напомню о тренировке и порадуюсь вместе с
          тобой. Настроим всё за минуту.
        </p>
        <div className="flex flex-wrap gap-[10px]">
          {[
            { label: "Находит события", tone: "bg-sky" },
            { label: "Напоминает", tone: "bg-lime-soft" },
            { label: "Радуется за тебя", tone: "bg-peach" },
          ].map((c) => (
            <span
              key={c.label}
              className={cn(
                "rounded-pill border-2 border-ink px-4 py-[9px] text-sm font-extrabold leading-[normal] text-foreground",
                c.tone
              )}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="relative box-border h-[540px] w-[460px] shrink-0 overflow-hidden rounded-[32px] border-2 border-ink bg-primary shadow-hard">
        <Img src="memphis-decor.svg" className="top-[-2px] left-[-2px] h-[540px] w-[460px]" />
        <Bubble className="absolute top-[46px] left-[168px] w-[260px]">
          Давай настроим профиль под тебя!
        </Bubble>
        <Img src="tail.svg" className="top-[116px] left-[228px] h-[18px] w-6" />
        <Img src="hero.png" className="top-[158px] left-12 size-[360px] object-contain" />
      </div>
    </div>
  );
}

/* ---------- 2. Спорт ---------- */

export const SPORTS = [
  { name: "Бег", shape: "shape.svg" },
  { name: "Футбол", shape: "shape1.svg" },
  { name: "Йога", shape: "shape2.svg" },
  { name: "Велоспорт", shape: "shape3.svg" },
  { name: "Теннис", shape: "shape4.svg" },
  { name: "Баскетбол", shape: "shape5.svg" },
  { name: "Плавание", shape: "shape6.svg" },
  { name: "Скалолазание", shape: "shape7.svg" },
];

export function StepSports({ data, update }: StepProps) {
  const [draft, setDraft] = useState("");
  const selected = data.sports.length + data.customSports.length;

  const toggle = (name: string) =>
    update({
      sports: data.sports.includes(name)
        ? data.sports.filter((s) => s !== name)
        : [...data.sports, name],
    });

  const addCustom = () => {
    const value = draft.trim().replace(/\s+/g, " ");
    if (!value) return;
    const exists = [...SPORTS.map((s) => s.name), ...data.customSports].some(
      (s) => s.toLowerCase() === value.toLowerCase(),
    );
    if (!exists) update({ customSports: [...data.customSports, value] });
    setDraft("");
  };

  return (
    <div className="absolute top-[95px] left-[76px] flex items-start gap-10">
      <div className="flex w-[808px] flex-col items-start gap-4">
        <Heading
          title="Что любишь?"
          hint="Выбери всё, что нравится, — подберём события и компанию."
        />
        <div className="flex w-[808px] flex-wrap gap-4">
          {SPORTS.map((s) => {
            const on = data.sports.includes(s.name);
            return (
              <button
                key={s.name}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.name)}
                className={cn(
                  "box-border flex h-[150px] w-[190px] flex-col items-start justify-between rounded-[22px] border-2 border-ink p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  on ? "bg-primary text-white shadow-hard-sm" : "bg-card text-foreground"
                )}
              >
                <span className="flex w-full items-start justify-between">
                  <img src={`${dir}/${s.shape}`} alt="" className="size-11" />
                  {on ? (
                    <span className="flex size-[26px] items-center justify-center rounded-[13px] border-2 border-ink bg-secondary">
                      <img src={`${dir}/check.svg`} alt="" className="size-[14px]" />
                    </span>
                  ) : (
                    <span className="box-border size-[26px] rounded-[13px] border-2 border-track" />
                  )}
                </span>
                <span className="font-display text-[17px] font-bold">{s.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex w-[808px] flex-col gap-[10px]">
          <p className="text-[13px] leading-[normal] font-extrabold text-foreground">
            Нет своего? Добавь сам
          </p>
          <div className="flex gap-3">
            <label className="box-border flex h-[52px] flex-1 items-center gap-[10px] rounded-[14px] border-2 border-dashed border-muted-foreground bg-card px-4">
              <img src={`${dir}/icon.svg`} alt="" className="size-[18px]" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                maxLength={60}
                placeholder="Например, скейт, настолки, паркур"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <Button type="button" onClick={addCustom} className="h-[52px] w-[150px] px-6">
              Добавить
            </Button>
          </div>
          {data.customSports.length ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] leading-[normal] font-bold text-muted-foreground">
                Твоё:
              </span>
              {data.customSports.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-2 rounded-pill border-2 border-ink bg-primary py-2 pr-3 pl-4 text-sm leading-[normal] font-extrabold text-white"
                >
                  {s}
                  <button
                    type="button"
                    aria-label={`Убрать: ${s}`}
                    onClick={() =>
                      update({ customSports: data.customSports.filter((c) => c !== s) })
                    }
                  >
                    <img src={`${dir}/icon1.svg`} alt="" className="size-[18px]" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Pill>ВЫБРАНО: {selected}</Pill>
          <span className="text-[13px] leading-[normal] font-semibold text-muted-foreground">
            Минимум 1 · потом можно поменять в профиле
          </span>
        </div>
      </div>

      <div className="flex w-[280px] flex-col items-center">
        <Bubble className="relative mb-[-2px] w-[250px]">Не стесняйся: можно выбрать хоть всё!</Bubble>
        <img src={`${dir}/tail1.svg`} alt="" className="mb-[-2px] h-[18px] w-6" />
        <img src={`${dir}/1.png`} alt="" className="size-[260px] object-contain" />
      </div>
    </div>
  );
}

/* ---------- 3. Уровень и расписание ---------- */

export const LEVELS = [
  { id: "novice", name: "Новичок", hint: "Только начинаю, хочу в компанию", pips: 1 },
  { id: "amateur", name: "Любитель", hint: "Бегаю и играю регулярно, для души", pips: 2 },
  { id: "pro", name: "Про", hint: "Тренируюсь по плану, нужен темп", pips: 3 },
] as const;
export const PIP_HEIGHT = [10, 18, 26];
export const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const DAYTIMES = [
  { id: "morning", label: "Утро" },
  { id: "day", label: "День" },
  { id: "evening", label: "Вечер" },
] as const;

export function StepLevel({ data, update }: StepProps) {
  return (
    <div className="absolute top-[186px] left-24 flex flex-col items-start gap-7">
      <Heading
        title="Уровень и расписание"
        hint="Так мы не позовём тебя на марафон в первый же день."
      />
      <div className="flex items-start gap-12">
        <div className="flex w-[560px] flex-col gap-[14px]" role="radiogroup" aria-label="Уровень">
          {LEVELS.map((l) => {
            const on = data.level === l.id;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update({ level: l.id })}
                className={cn(
                  "box-border flex w-full items-center gap-[18px] rounded-[22px] border-2 border-ink px-[18px] py-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  on ? "bg-secondary shadow-[4px_4px_0_var(--ink)]" : "bg-card"
                )}
              >
                <span className="flex items-end gap-1">
                  {PIP_HEIGHT.map((h, i) => (
                    <span
                      key={h}
                      className={cn(
                        "box-border w-[10px] rounded-[3px] border-[1.5px] border-ink",
                        i < l.pips ? "bg-primary" : "bg-track"
                      )}
                      style={{ height: h }}
                    />
                  ))}
                </span>
                <span className="flex flex-1 flex-col gap-[3px] leading-[normal] text-foreground">
                  <span className="font-display text-lg font-bold">{l.name}</span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      on ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {l.hint}
                  </span>
                </span>
                {on ? (
                  <span className="flex size-7 items-center justify-center rounded-[14px] border-2 border-ink bg-primary">
                    <img src={`${dir}/check1.svg`} alt="" className="size-[14px]" />
                  </span>
                ) : (
                  <span className="box-border size-7 rounded-[14px] border-2 border-track bg-card" />
                )}
              </button>
            );
          })}
        </div>

        <Card className="w-[480px] gap-[18px] p-[26px]">
          <p className="font-display text-lg leading-[normal] font-bold text-foreground">
            Когда удобно?
          </p>
          <div className="flex gap-[6px]">
            {DAYS.map((d) => {
              const on = data.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update({ days: on ? data.days.filter((x) => x !== d) : [...data.days, d] })
                  }
                  className={cn(
                    "box-border h-11 min-w-0 flex-1 rounded-xl border-2 border-ink text-sm font-extrabold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    on ? "bg-primary text-white" : "bg-card text-foreground"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div
            className="box-border flex w-full gap-1 rounded-pill border-2 border-ink bg-card p-1"
            role="radiogroup"
            aria-label="Время суток"
          >
            {DAYTIMES.map((t) => {
              const on = data.daytime === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update({ daytime: t.id })}
                  className={cn(
                    "box-border h-[38px] min-w-0 flex-1 rounded-pill text-sm font-extrabold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    on && "border-2 border-ink bg-secondary"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm leading-[normal] font-extrabold text-foreground">Радиус поиска</p>
            <Pill className="bg-sky">{data.radius} КМ</Pill>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[data.radius]}
            onValueChange={([radius]) => update({ radius })}
            className="w-[428px]"
          />
          <div className="flex justify-between text-xs leading-[normal] font-bold text-muted-foreground">
            <span>1 км</span>
            <span>20 км</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- 4. Питомец ---------- */

export const OUTFITS = [
  { id: "none", name: "Без наряда", hint: null },
  { id: "cap", name: "Кепка", hint: "бесплатно" },
] as const;

export const HELPERS = [
  { key: "reminders", label: "Напоминать о тренировках" },
  { key: "nearby", label: "Подсказывать события рядом" },
  { key: "cheer", label: "Радоваться моим достижениям" },
] as const;

export function StepPet({ data, update }: StepProps) {
  return (
    <div className="absolute top-[155px] left-[120px] flex flex-col items-start gap-[26px]">
      <Heading
        title="Познакомься с питомцем"
        hint="Он будет жить в приложении: подсказывать, радоваться и расти вместе с тобой."
      />
      <div className="flex items-start gap-10">
        <div className="box-border flex w-[480px] flex-col items-center gap-[14px] overflow-hidden rounded-[32px] border-2 border-ink bg-sky px-10 pt-6 pb-7 shadow-[5px_5px_0_var(--ink)]">
          <img src={`${dir}/hero.png`} alt="" className="size-[240px] object-contain" />
          <label className="flex w-full flex-col gap-[6px] leading-[normal]">
            <span className="text-[13px] font-bold text-foreground">Как его зовут?</span>
            <span className="box-border flex h-[52px] w-full items-center justify-between rounded-[14px] border-2 border-ink bg-card px-4 font-extrabold">
              <input
                value={data.petName}
                onChange={(e) => update({ petName: e.target.value })}
                maxLength={30}
                className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none"
              />
              <span className="text-[13px] text-primary">изменить</span>
            </span>
          </label>
        </div>

        <div className="flex w-[520px] flex-col gap-4">
          <Card className="gap-[14px] px-6 py-[22px]">
            <div className="flex items-center justify-between">
              <p className="font-display text-[17px] leading-[normal] font-bold text-foreground">
                Наряд
              </p>
              <Pill className="text-[10px]">КЕПКА — В ПОДАРОК</Pill>
            </div>
            <div className="flex gap-3" role="radiogroup" aria-label="Наряд">
              {OUTFITS.map((o) => {
                const on = data.outfit === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => update({ outfit: o.id })}
                    className={cn(
                      "box-border flex h-24 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-ink leading-[normal] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      on ? "bg-secondary shadow-hard-sm" : "bg-peach"
                    )}
                  >
                    <span className="text-sm font-extrabold">{o.name}</span>
                    {o.hint ? (
                      <span className="text-[11px] font-bold text-muted-foreground">{o.hint}</span>
                    ) : null}
                  </button>
                );
              })}
              <div className="box-border flex h-24 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-muted-foreground bg-card leading-[normal] text-muted-foreground">
                <span className="text-sm font-extrabold">Шарф</span>
                <span className="text-[11px] font-bold">серия 7 дней</span>
              </div>
            </div>
          </Card>

          <Card className="gap-3 px-6 py-[22px]">
            <p className="font-display text-[17px] leading-[normal] font-bold text-foreground">
              Чем помогать?
            </p>
            {HELPERS.map((h) => (
              <div key={h.key} className="flex items-center justify-between">
                <span className="text-[15px] leading-[normal] font-semibold text-foreground">
                  {h.label}
                </span>
                <Switch
                  aria-label={h.label}
                  checked={data.helpers[h.key]}
                  onCheckedChange={(checked) =>
                    update({ helpers: { ...data.helpers, [h.key]: checked } })
                  }
                />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- 5. Готово ---------- */

export function StepDone({
  onFind,
  onHome,
}: {
  onFind: () => void;
  onHome: () => void;
}) {
  return (
    <>
      <Img src="confetti.svg" className="top-0 left-0 h-[820px] w-[1280px]" />
      <div className="absolute top-[211px] left-32 flex w-[520px] flex-col items-start gap-[18px]">
        <Pill>ВСЁ ГОТОВО</Pill>
        <h1 className="w-full font-display text-[54px] leading-[62px] font-extrabold tracking-[-1px] text-foreground">
          Паспорт готов!
        </h1>
        <p className="w-full text-lg leading-7 font-medium text-muted-foreground">
          Бублик уже подобрал для тебя три события рядом. Загляни — вдруг там твоя команда.
        </p>
        <div className="flex gap-3">
          <Button onClick={onFind} className="h-[54px] w-[290px] px-6">
            Найти первое событие
          </Button>
          <Button variant="soft" onClick={onHome} className="h-[54px] w-[160px] px-6">
            На главную
          </Button>
        </div>
        <img src={`${dir}/hero.png`} alt="" className="size-[200px] object-contain" />
      </div>
    </>
  );
}
