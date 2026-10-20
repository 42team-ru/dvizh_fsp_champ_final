import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Check, Clock, Home, Shirt, Star, Trophy, User } from "lucide-react";
import { BeaverPet, type BeaverMood, type BeaverPetHandle } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { cn } from "cn";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import type { Pet, Prefs, Profile, SportRow } from "./onboarding-steps";

/** Шаги, о которых бобр «знает» — трекер внизу панели. */
const TRACK = [
  { label: "Ты", icon: User },
  { label: "Спорт", icon: Trophy },
  { label: "Время", icon: Clock },
  { label: "Связь", icon: Bell },
  { label: "Бобр", icon: Shirt },
  { label: "Подборка", icon: Star },
];

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Пн", TUESDAY: "Вт", WEDNESDAY: "Ср", THURSDAY: "Чт", FRIDAY: "Пт", SATURDAY: "Сб", SUNDAY: "Вс",
};
const DAY_WHEN: Record<string, string> = {
  MONDAY: "понедельникам", TUESDAY: "вторникам", WEDNESDAY: "средам", THURSDAY: "четвергам",
  FRIDAY: "пятницам", SATURDAY: "субботам", SUNDAY: "воскресеньям",
};
const DAYTIME_LABEL: Record<string, { say: string; card: string }> = {
  MORNING: { say: "Утром", card: "утром, до 12" },
  DAY: { say: "Днём", card: "днём, 12–18" },
  EVENING: { say: "Вечером", card: "вечером, после 18" },
};

type Scene = {
  /** Фон панели, холм и его обводка. */
  bg: string;
  hill: string;
  /** Что сейчас делает бобр — подпись над репликой. */
  doing: string;
  mood: BeaverMood;
  /** Цвет жёсткой тени облачка. */
  shadow: string;
  dark?: boolean;
};

const SCENES: Scene[] = [
  { bg: "bg-sky", hill: "bg-mint", doing: "знакомится", mood: "happy", shadow: "shadow-[5px_5px_0_var(--lime)]" },
  { bg: "bg-lime", hill: "bg-sky", doing: "радуется", mood: "surprised", shadow: "shadow-[5px_5px_0_var(--primary)]" },
  { bg: "bg-ink", hill: "bg-primary", doing: "задумался", mood: "thinking", shadow: "shadow-[5px_5px_0_var(--primary)]", dark: true },
  { bg: "bg-peach", hill: "bg-orange", doing: "подмигивает", mood: "wink", shadow: "shadow-[5px_5px_0_var(--primary)]" },
];

export type PanelData = { step: number; profile: Profile; sports: SportRow[]; prefs: Prefs; pet: Pet };

/** Правая половина шагов 1–4: живой бобр комментирует то, что заполняют слева. */
export function OnboardingPanel(data: PanelData) {
  const { step, pet } = data;
  const scene = SCENES[step - 1];
  const say = speech(data);
  const beaver = useRef<BeaverPetHandle>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => beaver.current?.react(scene.mood, { ms: 1400, wave: true }), 350);
    return () => window.clearTimeout(timer);
  }, [step, scene.mood]);

  return (
    <aside className={cn("relative hidden overflow-hidden border-l-2 border-ink transition-colors duration-500 lg:block", scene.bg)}>
      <Decor dark={scene.dark} />
      <motion.div
        key={`hill-${step}`}
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        className={cn("absolute inset-x-[-140px] bottom-[-160px] h-[420px] rounded-[50%] border-2 border-ink", scene.hill)}
      />

      <div className="absolute top-7 left-9 flex flex-col items-start gap-3">
        <span className="flex items-center gap-2 rounded-pill border-2 border-ink bg-card py-1 pr-3 pl-1 text-xs font-extrabold">
          <span className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-ink bg-secondary text-[11px]">
            {pet.name.trim().charAt(0).toUpperCase() || "Б"}
          </span>
          {pet.name.trim() || "Бублик"} · {scene.doing}
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={say}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className={cn(
              "relative rounded-[20px] border-2 border-ink bg-card px-5 py-4 text-lg leading-6 font-bold text-foreground",
              scene.shadow,
              // на шаге 1 справа сверху паспорт — облачко уже, чтобы не наезжать
              step === 1 ? "max-w-[250px]" : "max-w-[350px]",
            )}
          >
            {say}
            <span aria-hidden className="absolute -bottom-[11px] left-[118px] size-5 rotate-45 border-r-2 border-b-2 border-ink bg-card" />
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-[200px] left-1/2 w-[380px] -translate-x-1/2">
        <BeaverPet
          ref={beaver}
          mood="happy"
          outfit={pet.outfit as BeaverOutfit}
          activity={pet.activity as BeaverActivity}
          className="[&_.beaver-speech]:hidden"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0"
        >
          <Floating {...data} />
        </motion.div>
      </AnimatePresence>

      <Tracker step={step} />
    </aside>
  );
}

function speech({ step, profile, sports, prefs }: PanelData): string {
  if (step === 1) {
    const name = profile.firstName.trim();
    return name.length >= 2 ? `${name}? Отличное имя! Вписываю в твой паспорт` : "Как тебя зовут? Впишу тебя в паспорт спортсмена";
  }
  if (step === 2) {
    if (sports.length === 0) return "Во что играем? Выбирай смело, можно несколько";
    const names = sports.slice(0, 2).map((s) => s.name);
    return `${names.join(" и ")}${sports.length > 2 ? " и не только" : ""}? Отлично, беру форму!`;
  }
  if (step === 3) {
    if (prefs.days.length === 0) return "Выбери хотя бы один день — подберу встречи под него";
    const days = prefs.days.slice(0, 2).map((d) => DAY_WHEN[d]).join(" и ");
    const more = prefs.days.length > 2 ? " и не только" : "";
    return `${DAYTIME_LABEL[prefs.daytime].say} по ${days}${more}? Поищу встречи в ${prefs.radiusKm} км от дома`;
  }
  return "Вот так я буду писать. Только по делу!";
}

/** Карточки вокруг бобра: что он уже понял про тебя. */
function Floating({ step, profile, sports, prefs, pet }: PanelData) {
  if (step === 1) {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    return (
      <Float className="top-6 right-6 w-[260px] rotate-[3deg] shadow-[6px_6px_0_var(--primary)]" delay={0.1}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold tracking-[1.2px] text-primary">ПАСПОРТ СПОРТСМЕНА</span>
          <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-2 text-[10px] font-extrabold">СТР. 1</span>
        </div>
        <div className="mt-2 flex gap-3">
          <UserAvatar user={{ ...profile, pet }} className="h-[84px] w-[70px] shrink-0 rounded-[10px] border-2 border-ink bg-sky-soft" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold tracking-[1px] text-muted-foreground">ИМЯ</p>
            <p className="line-clamp-2 font-display text-lg leading-6 font-extrabold break-words">{name || "—"}</p>
            <p className="mt-1 text-[10px] font-extrabold tracking-[1px] text-muted-foreground">ГОРОД</p>
            <p className="truncate text-sm font-bold">{profile.city.trim() || "—"}</p>
          </div>
        </div>
        {profile.bio.trim() && <p className="mt-2 line-clamp-2 text-xs font-medium text-muted-foreground">«{profile.bio.trim()}»</p>}
      </Float>
    );
  }
  if (step === 2) {
    const spots = [
      "top-[250px] left-[22px]", "top-[250px] right-[22px]", "top-[372px] left-[22px]",
      "top-[380px] right-[22px]", "top-[494px] left-[22px]", "top-[500px] right-[22px]",
    ];
    return (
      <>
        {sports.slice(0, spots.length).map((s, i) => (
          <Float key={s.sportId ?? s.name} className={cn("w-[66px] px-1 py-2 text-center", spots[i])} delay={0.05 * i}>
            <span className="block truncate text-xs font-extrabold">{s.name}</span>
          </Float>
        ))}
      </>
    );
  }
  if (step === 3) {
    return (
      <>
        <Float className="top-[560px] left-[24px] flex items-center gap-2 rounded-pill px-3 py-2 shadow-[4px_4px_0_var(--lime)]" delay={0.1}>
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-primary text-white"><Home className="size-4" /></span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-extrabold">Дом</span>
            <span className="text-[11px] text-muted-foreground">{prefs.home ? `радиус ${prefs.radiusKm} км` : "не указан"}</span>
          </span>
        </Float>
        <Float className="top-[510px] right-[16px] w-[170px] rotate-[-4deg] bg-sun" delay={0.2}>
          <p className="text-[10px] font-extrabold tracking-[1.2px]">УДОБНО</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {prefs.days.map((d) => (
              <span key={d} className="rounded-pill border-[1.5px] border-ink bg-primary px-2 text-[11px] font-bold text-white">{DAY_SHORT[d]}</span>
            ))}
          </div>
          <p className="mt-1.5 text-xs font-bold">{DAYTIME_LABEL[prefs.daytime].card}</p>
        </Float>
      </>
    );
  }
  // шаг 4: карточки уведомлений закрывали бобра — оставляем его одного
  return null;
}

function Float({ className, style, delay = 0, children }: { className?: string; style?: React.CSSProperties; delay?: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
      transition={{
        opacity: { delay, duration: 0.3 },
        scale: { delay, type: "spring", stiffness: 300, damping: 18 },
        y: { delay: delay + 0.4, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      }}
      style={style}
      className={cn("absolute rounded-[16px] border-2 border-ink bg-card p-3", className)}
    >
      {children}
    </motion.div>
  );
}

function Tracker({ step }: { step: number }) {
  return (
    <div className="absolute inset-x-7 bottom-7 flex items-center gap-4 rounded-[22px] border-2 border-ink bg-card px-5 py-3 shadow-hard-sm">
      <p className="shrink-0 text-sm leading-tight font-extrabold">
        <span className="block text-[10px] tracking-[1.2px] text-primary">БОБР</span>о тебе знает
      </p>
      <ol className="flex flex-1 items-start">
        {TRACK.map((t, i) => {
          const done = i + 1 < step;
          const now = i + 1 === step;
          return (
            <li key={t.label} className="relative flex flex-1 flex-col items-center gap-1">
              {i > 0 && (
                <span aria-hidden className={cn("absolute top-5 right-1/2 w-full -translate-y-1/2 border-t-2 border-dashed",
                  done || now ? "border-ink" : "border-track")} />
              )}
              <motion.span
                animate={now ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={now ? { duration: 1.6, repeat: Infinity } : undefined}
                className={cn(
                  "relative z-10 flex size-10 items-center justify-center rounded-full border-2",
                  done ? "border-ink bg-secondary" : now ? "border-ink bg-primary text-white" : "border-dashed border-track bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : <t.icon className="size-4" />}
              </motion.span>
              <span className={cn("text-[11px] font-bold", now ? "text-primary" : "text-muted-foreground")}>{t.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Мемфис-декор панели: зигзаг, точки, кольцо, плюс. */
function Decor({ dark }: { dark?: boolean }) {
  const ink = dark ? "var(--card)" : "var(--ink)";
  return (
    <svg aria-hidden viewBox="0 0 580 860" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="xMidYMin slice">
      <path d="M390 48 l12 -10 l12 10 l12 -10 l12 10 l12 -10 l12 10 l12 -10 l12 10" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => (
        <circle key={`${r}-${c}`} cx={480 + c * 14} cy={180 + r * 12} r="2.5" fill={ink} opacity="0.5" />
      )))}
      <circle cx="490" cy="300" r="20" fill="none" stroke="var(--orange)" strokeWidth="5" />
      <path d="M50 312 v24 M38 324 h24" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
