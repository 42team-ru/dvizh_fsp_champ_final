import { usePetName } from "@/entity/user/model/use-pet-name";
import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Slider } from "@/shared/components/ui/slider";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "cn";
import { HomeLocationField } from "@/features/home-location/ui/home-location-field";
import {
  DAYS,
  DAYTIMES,
  HELPERS,
  LEVELS,
  OUTFITS,
  SPORTS,
  type OnboardingData,
} from "./onboarding-steps";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const dir = "/m-onb";
const shapes = "/onboarding";
const STEPS = 6;
const PIPS = [10, 16, 22];
/** В мобильной рамке подпись уровня «Любитель» короче, чем на десктопе. */
const HINTS: Record<string, string> = { amateur: "Бегаю и играю для души" };

type Props = {
  step: number;
  setStep: (step: number) => void;
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  canNext: boolean;
  finish: (to: string) => void;
};

const pill =
  "h-auto border-[1.5px] px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px]";

function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-[6px] px-4 pt-1 break-words">
      <h1 className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.3px] text-foreground">
        {title}
      </h1>
      <p className="text-sm leading-5 font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}

function TopBar({
  step,
  onBack,
  onSkip,
}: {
  step: number;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pt-3">
      {step > 1 ? (
        <button
          type="button"
          aria-label="Назад"
          onClick={onBack}
          className="box-border flex size-11 shrink-0 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <img src={`${dir}/icon-back.svg`} alt="" className="size-5" />
        </button>
      ) : null}
      <div
        className="flex h-11 min-w-0 flex-1 items-center gap-[6px]"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS}
        aria-valuenow={step}
        aria-label="Шаг онбординга"
      >
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "box-border h-2 min-w-0 flex-1 rounded-full border-[1.5px] border-ink",
              i < step ? "bg-primary" : "bg-card"
            )}
          />
        ))}
      </div>
      {step < STEPS ? (
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 text-[13px] leading-[normal] font-extrabold text-primary"
        >
          Пропустить
        </button>
      ) : (
        <span className="shrink-0 text-[13px] leading-[normal] font-extrabold text-muted-foreground">
          {STEPS} из {STEPS}
        </span>
      )}
    </div>
  );
}

function Welcome() {
  const petName = usePetName();
  return (
    <>
      <div className="px-4">
        <div className="relative box-border h-[340px] w-full overflow-hidden rounded-[32px] border-2 border-ink bg-primary shadow-[5px_5px_0_var(--ink)]">
          <img
            src={`${dir}/decor.svg`}
            alt=""
            className="absolute top-[-2px] left-[-2px] h-[340px] w-[358px] max-w-none"
          />
          <div className="absolute top-[22px] left-[116px] box-border flex w-[220px] items-start rounded-2xl border-2 border-ink bg-card px-[14px] py-3 shadow-[3px_3px_0_var(--lime)]">
            <p className="flex-1 text-sm leading-[19px] font-bold text-foreground">
              Давай настроим профиль под тебя!
            </p>
          </div>
          <img
            src={`${dir}/hero.png`}
            alt=""
            className="absolute top-[62px] left-[42px] size-[270px] max-w-none object-contain"
          />
        </div>
      </div>
      <Heading
        title={`Привет, я ${petName}!`}
        hint="Буду твоим помощником: найду события рядом, напомню о тренировке и порадуюсь вместе с тобой."
      />
      <div className="flex flex-wrap gap-2 px-4">
        {[
          { label: "Находит события", tone: "bg-sky" },
          { label: "Напоминает", tone: "bg-lime-soft" },
          { label: "Радуется за тебя", tone: "bg-peach" },
        ].map((c) => (
          <span
            key={c.label}
            className={cn(
              "rounded-pill border-[1.5px] border-ink px-[14px] py-2 text-[13px] leading-[normal] font-extrabold whitespace-nowrap text-foreground",
              c.tone
            )}
          >
            {c.label}
          </span>
        ))}
      </div>
    </>
  );
}

function Sports({ data, update }: Pick<Props, "data" | "update">) {
  const [draft, setDraft] = useState("");

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
    <>
      <Heading
        title="Что любишь?"
        hint="Выбери всё, что нравится, — подберём события и компанию."
      />
      <div className="flex flex-wrap gap-3 px-4">
        {SPORTS.map((s) => {
          const on = data.sports.includes(s.name);
          return (
            <button
              key={s.name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.name)}
              className={cn(
                "box-border flex h-[104px] w-[calc(50%-6px)] flex-col items-start justify-between rounded-[20px] border-2 border-ink pt-[14px] pr-[14px] pb-3 pl-[14px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                on ? "bg-primary text-white shadow-hard-sm" : "bg-card text-foreground"
              )}
            >
              <span className="flex w-full items-start justify-between">
                <img src={`${shapes}/${s.shape}`} alt="" className="size-9" />
                {on ? (
                  <span className="flex size-[26px] items-center justify-center rounded-[13px] border-2 border-ink bg-secondary">
                    <img src={`${shapes}/check.svg`} alt="" className="size-[14px]" />
                  </span>
                ) : (
                  <span className="box-border size-[26px] rounded-[13px] border-2 border-track" />
                )}
              </span>
              <span
                className={cn(
                  "font-display font-bold whitespace-nowrap",
                  s.name.length > 10 ? "text-[13px]" : "text-[15px]"
                )}
              >
                {s.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-[10px] px-4">
        <p className="text-[13px] leading-[normal] font-extrabold whitespace-nowrap text-foreground">
          Нет своего? Добавь сам
        </p>
        <div className="flex gap-[10px]">
          <label className="box-border flex h-[52px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border-2 border-dashed border-muted-foreground bg-card px-[14px]">
            <img src={`${shapes}/icon.svg`} alt="" className="size-[18px]" />
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
              placeholder="Скейт, паркур, настолки…"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button type="button" onClick={addCustom} className="h-[52px] w-[110px] shrink-0 px-5 text-sm">
            Добавить
          </Button>
        </div>
        {data.customSports.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] leading-[normal] font-bold whitespace-nowrap text-muted-foreground">
              Твоё:
            </span>
            {data.customSports.map((s) => (
              <span
                key={s}
                className="box-border flex h-10 items-center gap-2 rounded-pill border-2 border-ink bg-primary py-2 pr-[10px] pl-[14px] text-[13px] leading-[normal] font-extrabold text-white"
              >
                {s}
                <button
                  type="button"
                  aria-label={`Убрать: ${s}`}
                  onClick={() => update({ customSports: data.customSports.filter((c) => c !== s) })}
                >
                  <img src={`${shapes}/icon1.svg`} alt="" className="size-4" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function Level({ data, update }: Pick<Props, "data" | "update">) {
  return (
    <>
      <Heading
        title="Уровень и расписание"
        hint="Так мы не позовём тебя на марафон в первый же день."
      />
      <div className="flex flex-col gap-[10px] px-4" role="radiogroup" aria-label="Уровень">
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
                "box-border flex w-full items-center gap-[14px] rounded-[20px] border-2 border-ink px-4 py-[14px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                on ? "bg-secondary shadow-hard-sm" : "bg-card"
              )}
            >
              <span className="flex items-end gap-[3px]">
                {PIPS.map((h, i) => (
                  <span
                    key={h}
                    className={cn(
                      "box-border w-[9px] rounded-[3px] border-[1.5px] border-ink",
                      i < l.pips ? "bg-primary" : "bg-track"
                    )}
                    style={{ height: h }}
                  />
                ))}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal] font-bold text-foreground">
                <span className="font-display text-[15px]">{l.name}</span>
                <span
                  className={cn(
                    "overflow-hidden text-xs text-ellipsis whitespace-nowrap",
                    on ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {HINTS[l.id] ?? l.hint}
                </span>
              </span>
              {on ? (
                <span className="flex size-[26px] items-center justify-center rounded-[13px] border-2 border-ink bg-primary">
                  <img src={`${shapes}/check1.svg`} alt="" className="size-[14px]" />
                </span>
              ) : (
                <span className="box-border size-[26px] rounded-[13px] border-2 border-track bg-card" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4">
        <div className="box-border flex w-full flex-col gap-[14px] rounded-[22px] border-2 border-ink bg-card p-[18px]">
          <p className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
            Когда удобно?
          </p>
          <div className="flex gap-[5px]">
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
                    "box-border h-[46px] min-w-0 flex-1 rounded-xl border-2 border-ink text-xs font-extrabold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    on ? "bg-primary text-white" : "bg-card text-foreground"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div
            className="box-border flex h-12 w-full items-center gap-1 rounded-pill border-2 border-ink bg-card p-1"
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
            <span className="text-sm leading-[normal] font-extrabold whitespace-nowrap text-foreground">
              Радиус поиска
            </span>
            <Badge variant="outline" className={cn(pill, "bg-sky")}>
              {data.radius} КМ
            </Badge>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[data.radius]}
            onValueChange={([radius]) => update({ radius })}
            className="w-full"
          />
        </div>
      </div>
    </>
  );
}

function Home({ data, update }: Pick<Props, "data" | "update">) {
  return (
    <>
      <Heading title="Где ты живёшь?" hint="Подберём встречи рядом с домом. Можно пропустить." />
      <div className="px-4">
        <HomeLocationField value={data.home} onChange={(home) => update({ home })} mapClassName="h-[300px] w-full" />
      </div>
    </>
  );
}

function Pet({ data, update }: Pick<Props, "data" | "update">) {
  return (
    <>
      <Heading
        title="Познакомься с питомцем"
        hint="Он будет жить в приложении: подсказывать, радоваться и расти вместе с тобой."
      />
      <div className="px-4">
        <div className="box-border flex w-full flex-col items-center gap-[10px] overflow-hidden rounded-[26px] border-2 border-ink bg-sky px-5 pt-4 pb-5 shadow-[4px_4px_0_var(--ink)]">
          <img src={`${dir}/hero.png`} alt="" className="size-[150px] object-contain" />
          <label className="flex w-full flex-col gap-[6px] leading-[normal] font-extrabold whitespace-nowrap">
            <span className="text-[13px] text-foreground">Как его зовут?</span>
            <span className="box-border flex h-[52px] w-full items-center justify-between rounded-[14px] border-2 border-ink bg-card px-4">
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
      </div>

      <div className="px-4">
        <div className="box-border flex w-full flex-col gap-3 rounded-[22px] border-2 border-ink bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-base leading-[normal] font-bold text-foreground">
              Наряд
            </span>
            <Badge variant="secondary" className={cn(pill, "text-[9px]")}>
              КЕПКА В ПОДАРОК
            </Badge>
          </div>
          <div className="flex gap-[10px]" role="radiogroup" aria-label="Наряд">
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
                    "box-border flex h-[84px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl border-2 border-ink leading-[normal] whitespace-nowrap text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    on ? "bg-secondary shadow-hard-sm" : "bg-peach"
                  )}
                >
                  <span className="text-[13px] font-extrabold">{o.name}</span>
                  {o.hint ? (
                    <span className="text-[10px] font-bold text-muted-foreground">{o.hint}</span>
                  ) : null}
                </button>
              );
            })}
            <div className="box-border flex h-[84px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl border-2 border-dashed border-muted-foreground bg-card leading-[normal] whitespace-nowrap text-muted-foreground">
              <span className="text-[13px] font-extrabold">Шарф</span>
              <span className="text-[10px] font-bold">серия 7 дней</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="box-border flex w-full flex-col gap-1 rounded-[22px] border-2 border-ink bg-card pt-4 pr-4 pb-3 pl-4">
          <span className="font-display text-base leading-[normal] font-bold text-foreground">
            Чем помогать?
          </span>
          {HELPERS.map((h) => (
            <div key={h.key} className="flex h-[52px] items-center justify-between gap-3">
              <span className="text-sm leading-[normal] font-bold text-foreground">{h.label}</span>
              <Switch
                aria-label={h.label}
                checked={data.helpers[h.key]}
                onCheckedChange={(checked) =>
                  update({ helpers: { ...data.helpers, [h.key]: checked } })
                }
                className="h-[30px] w-[50px] rounded-[15px] p-[3px] [&>span]:size-[22px] [&>span]:rounded-[11px] [&>span[data-state=checked]]:translate-x-[18px]"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Done() {
  const petName = usePetName();
  return (
    <>
      <div className="flex flex-col items-start gap-2 px-4 pt-1">
        <Badge variant="secondary" className={pill}>
          ВСЁ ГОТОВО
        </Badge>
        <h1 className="w-full font-display text-[30px] leading-9 font-extrabold tracking-[-0.5px] text-foreground">
          Паспорт готов!
        </h1>
        <p className="w-full text-[15px] leading-[22px] font-medium text-muted-foreground">
          {petName} уже подобрал для тебя три события рядом. Загляни — вдруг там твоя команда.
        </p>
      </div>
      <img src={`${dir}/hero.png`} alt="" className="mx-auto size-[200px] object-contain" />
    </>
  );
}

/** Мобильная версия онбординга: одна колонка, кнопка действия закреплена внизу. */
export function OnboardingMobile({ step, setStep, data, update, canNext, finish }: Props) {
  const selected = data.sports.length + data.customSports.length;
  const nextLabel =
    step === 1 ? "Погнали" : step === 2 ? `Дальше · выбрано ${selected}` : "Дальше";

  return (
    <div className="relative isolate flex min-h-dvh overflow-clip flex-col gap-4 bg-background lg:hidden">
      <MemphisBackground variant="mobile" seed="onboarding" />
      <TopBar step={step} onBack={() => setStep(step - 1)} onSkip={() => finish("/")} />

      {step === 1 && <Welcome />}
      {step === 2 && <Sports data={data} update={update} />}
      {step === 3 && <Level data={data} update={update} />}
      {step === 4 && <Home data={data} update={update} />}
      {step === 5 && <Pet data={data} update={update} />}
      {step === 6 && <Done />}

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-background px-4 pt-3 pb-[26px]">
        {step < STEPS ? (
          <Button disabled={!canNext} onClick={() => setStep(step + 1)} className="h-14 w-full text-base">
            {nextLabel}
          </Button>
        ) : (
          <Button onClick={() => finish("/feed")} className="h-14 w-full text-base">
            Найти первое событие
          </Button>
        )}
        {step === 1 ? (
          <Button asChild variant="soft" className="h-12 w-full text-sm">
            <Link to="/auth/login">У меня есть аккаунт</Link>
          </Button>
        ) : null}
        {step === STEPS ? (
          <Button variant="soft" onClick={() => finish("/")} className="h-12 w-full text-sm">
            На главную
          </Button>
        ) : null}
      </div>
    </div>
  );
}
