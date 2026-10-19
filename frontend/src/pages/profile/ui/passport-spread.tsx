import { useUser } from "@/entity/user/model/use-user";
import { EditProfileDialog } from "@/features/edit-profile/ui/edit-profile-dialog";
import { Button } from "@/shared/components/ui/button";
import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import { useUsersHistory, useUsersHistorySummary, useUsersMySports } from "@/shared/api/generated/core/users/users";
import type {
  AttendedOccurrenceResponse,
  MyRegistrationResponse,
  UserSportResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { cn } from "cn";
import {
  KIND_LABEL,
  LEVEL_PIPS,
  MOOD_LABEL,
  ROLE_LABEL,
  SPORT_LEVEL_LABEL,
  dateFull,
  dateShort,
  mrzLines,
  passportNumber,
  whenLabel,
} from "./passport-utils";

const IMG = "/profile";
const CHIP_TONES = ["bg-sky-soft", "bg-lime-soft", "bg-peach", "bg-lavender-soft"];

/** Вся подпись поля паспорта: мелкий заголовок и значение. */
function Field({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
      <p className="text-[9px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-foreground",
          large ? "font-display text-[17px] font-bold" : "text-[15px] font-bold",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SportChip({ sport, index }: { sport: UserSportResponse; index: number }) {
  const pips = sport.level ? LEVEL_PIPS[sport.level] : 0;
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-pill border-[1.5px] border-ink px-3 py-[6px]",
        CHIP_TONES[index % CHIP_TONES.length],
      )}
    >
      <span className="text-[13px] font-extrabold whitespace-nowrap text-foreground">{sport.sport.name}</span>
      {sport.level ? (
        <span className="text-xs font-bold whitespace-nowrap text-muted-foreground">
          · {SPORT_LEVEL_LABEL[sport.level]}
        </span>
      ) : null}
      {pips ? (
        <span className="flex items-end gap-[2px]" aria-hidden="true">
          {[6, 9, 12, 15].map((h, i) => (
            <span
              key={h}
              className={cn("w-[5px] rounded-[1.5px]", i < pips ? "bg-primary" : "bg-track")}
              style={{ height: h }}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** Левая страница: данные владельца паспорта. */
function DataPage() {
  const { user } = useUser();
  const sports = useUsersMySports();
  const list = sports.data?.status === 200 ? sports.data.data : [];
  const number = passportNumber(user?.id);
  const issued = dateShort(user?.createdAt);
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  const mood = user?.pet ? (MOOD_LABEL[user.pet.mood] ?? user.pet.mood) : undefined;
  const [mrz1, mrz2] = mrzLines(user ?? {});

  return (
    <section
      aria-label="Паспорт спортсмена: данные"
      className="absolute top-[12px] left-[12px] flex h-[572px] w-[594px] flex-col gap-4 overflow-hidden rounded-tl-[20px] rounded-tr-[4px] rounded-br-[4px] rounded-bl-[20px] border-2 border-ink bg-card px-[26px] pt-6 pb-[22px]"
    >
      <img
        src={`${IMG}/guilloche.svg`}
        alt=""
        className="pointer-events-none absolute top-[-2px] left-[-2px] h-[572px] w-[594px] max-w-none"
      />

      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`${IMG}/ring-logo.svg`} alt="" className="size-[22px]" />
          <h2 className="text-xs font-extrabold tracking-[2px] whitespace-nowrap text-foreground">
            ПАСПОРТ СПОРТСМЕНА
          </h2>
        </div>
        <span className="text-[9px] font-extrabold tracking-[1.5px] whitespace-nowrap text-muted-foreground">
          SPORT PASSPORT · стр. 2
        </span>
      </header>

      <div className="relative flex items-start gap-[22px]">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-[190px] w-[150px] shrink-0 rounded-xl border-2 border-ink object-cover"
          />
        ) : (
          <div className="flex h-[190px] w-[150px] shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sky">
            <span className="font-display text-[44px] font-extrabold text-foreground">{initials}</span>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex gap-4">
            <Field label="ФАМИЛИЯ / SURNAME" value={user?.lastName ?? "—"} large />
            <Field label="ИМЯ / NAME" value={user?.firstName ?? "—"} large />
          </div>
          <div className="flex gap-4">
            <Field label="ЛОГИН" value={user?.username ? `@${user.username}` : "—"} />
            <Field label="ГОРОД" value={user?.city ?? "—"} />
          </div>
          <div className="flex gap-4">
            <Field label="ДАТА ВЫДАЧИ" value={dateFull(user?.createdAt)} />
            <Field label="ОРГАН ВЫДАЧИ" value="Спорт рядом" />
          </div>
          <div className="flex gap-4">
            <Field label="СТАТУС" value={user?.systemRole ? ROLE_LABEL[user.systemRole] : "—"} />
            <Field label="№ ПАСПОРТА" value={number} />
          </div>
        </div>
      </div>

      {/* штамп «действителен» поверх фото */}
      <div className="pointer-events-none absolute top-[157px] left-[102px] flex size-[99px] items-center justify-center">
        <div className="relative size-[83px] -rotate-12 text-accent">
          <img src={`${IMG}/stamp-valid.svg`} alt="" className="absolute inset-0 size-full" />
          <p className="absolute inset-x-0 top-6 text-center text-[6.4px] font-extrabold tracking-[0.8px]">
            ДЕЙСТВИТЕЛЕН
          </p>
          <p className="absolute inset-x-0 top-[35px] text-center font-display text-[11.2px] font-extrabold">ГОДЕН</p>
          <p className="absolute inset-x-0 top-[51px] text-center text-[7.2px] font-extrabold">с {issued}</p>
        </div>
      </div>

      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
            ВИДЫ СПОРТА И РАЗРЯД
          </p>
          <EditProfileDialog user={user}>
            <Button variant="soft" className="h-8 px-4 text-xs leading-[17px]">
              Править
            </Button>
          </EditProfileDialog>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.length > 0 ? (
            list.map((s, i) => <SportChip key={s.sport.id} sport={s} index={i} />)
          ) : (
            <span className="text-[13px] font-semibold text-muted-foreground">
              Виды спорта пока не выбраны.
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[9px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
            ОСОБЫЕ ОТМЕТКИ
          </p>
          <p className="text-[13px] leading-[18px] font-medium text-foreground">
            {user?.bio || "Пока ничего не написано."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[10px] rounded-[14px] border-[1.5px] border-ink bg-sky-soft py-[6px] pr-3 pl-[6px]">
          <img src={`${IMG}/wave.png`} alt="" className="size-12 object-contain" />
          <div className="flex flex-col gap-px whitespace-nowrap">
            <span className="text-[8px] font-extrabold tracking-[1.2px] text-muted-foreground">СОПРОВОЖДАЮЩИЙ</span>
            <span className="text-[13px] font-extrabold text-foreground">Бобр Бублик</span>
            {mood ? <span className="text-[11px] font-bold text-muted-foreground">настроение: {mood}</span> : null}
          </div>
        </div>
      </div>

      <div className="relative mt-auto flex flex-col gap-[2px] overflow-hidden rounded-lg bg-lilac/30 px-3 py-[10px] font-mono text-[13px] font-medium tracking-[1.2px] whitespace-nowrap text-foreground">
        <p aria-label="Машиночитаемая зона, строка 1">{mrz1}</p>
        <p aria-label="Машиночитаемая зона, строка 2">{mrz2}</p>
      </div>
    </section>
  );
}

/* ---------- Правая страница: отметки о посещении ---------- */

type StampType = "round" | "rect" | "oval" | "star" | "rectGreen";

/** Размеры оттиска, положение текста внутри и цвет — как в макете. */
const STAMP: Record<
  StampType,
  { w: number; h: number; img: string; color: string; kind: number; sport: number; date: number; place?: number; sportSize: number }
> = {
  round: { w: 132, h: 132, img: "stamp-round", color: "text-primary", kind: 26, sport: 42, date: 70, place: 90, sportSize: 19 },
  rect: { w: 172, h: 104, img: "stamp-rect", color: "text-accent", kind: 16, sport: 30, date: 62, sportSize: 19 },
  oval: { w: 168, h: 104, img: "stamp-oval", color: "text-green", kind: 20, sport: 34, date: 62, sportSize: 18 },
  star: { w: 136, h: 136, img: "stamp-star", color: "text-ink", kind: 34, sport: 48, date: 72, place: 90, sportSize: 15 },
  rectGreen: { w: 172, h: 104, img: "stamp-rect-green", color: "text-green", kind: 16, sport: 30, date: 62, sportSize: 19 },
};

/** Шесть мест под печати: центр в px страницы, поворот и вид оттиска. */
const STAMP_SLOTS: { type: StampType; cx: number; cy: number; rotate: number }[] = [
  { type: "round", cx: 64.7, cy: 82.5, rotate: 6 },
  { type: "rect", cx: 267.4, cy: 71.9, rotate: -4 },
  { type: "oval", cx: 451.2, cy: 62.3, rotate: 3 },
  { type: "star", cx: 95.8, cy: 227.2, rotate: -7 },
  { type: "round", cx: 257.2, cy: 242.4, rotate: 4 },
  { type: "rectGreen", cx: 450.2, cy: 194.3, rotate: -5 },
];

/** Места под визы (записи на будущие события). */
const VISA_SLOTS = [
  { cx: 104.3, cy: 371.2, rotate: 2 },
  { cx: 308.3, cy: 359.1, rotate: -3 },
];

/** Название вида спорта в оттиске: чем длиннее, тем мельче, чтобы влезло. */
function sportSize(length: number, base: number) {
  if (length <= 6) return base;
  if (length <= 8) return base - 6;
  return base - 9;
}

function Stamp({ slot, item }: { slot: (typeof STAMP_SLOTS)[number]; item: AttendedOccurrenceResponse }) {
  const s = STAMP[slot.type];
  const sport = item.event.sport.name.toUpperCase();
  const kind = item.event.kind ? KIND_LABEL[item.event.kind] : "ЗАНЯТИЕ";
  const place = item.event.address ?? item.event.locationNote ?? "";
  const date = dateShort(item.startAt);
  const inline = s.place === undefined;
  return (
    <div
      className={cn("absolute", s.color)}
      style={{
        width: s.w,
        height: s.h,
        left: slot.cx - s.w / 2,
        top: slot.cy - s.h / 2,
        transform: `rotate(${slot.rotate}deg)`,
      }}
    >
      <img src={`${IMG}/${s.img}.svg`} alt="" className="absolute inset-0 size-full max-w-none" />
      <p className="absolute inset-x-0 text-center text-[8px] font-extrabold tracking-[1.5px]" style={{ top: s.kind }}>
        {kind}
      </p>
      <p
        className="absolute inset-x-3 truncate text-center font-display font-extrabold"
        style={{ top: s.sport, fontSize: sportSize(sport.length, s.sportSize) }}
        title={item.event.sport.name}
      >
        {sport}
      </p>
      <p
        className={cn(
          "absolute inset-x-3 truncate text-center font-extrabold",
          inline ? "text-[11px] tracking-[0.5px]" : "text-xs tracking-[1px]",
        )}
        style={{ top: s.date }}
      >
        {inline ? [date, place].filter(Boolean).join(" · ") : date}
      </p>
      {!inline && place ? (
        <p className="absolute inset-x-3 truncate text-center text-[9px] font-bold" style={{ top: s.place }}>
          {place}
        </p>
      ) : null}
    </div>
  );
}

function Visa({ slot, reg }: { slot: (typeof VISA_SLOTS)[number]; reg: MyRegistrationResponse }) {
  const pending = reg.status === "PENDING";
  return (
    <div
      className={cn(
        "absolute flex w-[184px] flex-col gap-1 rounded-[10px] border-[2.5px] border-dashed px-3 py-[10px]",
        pending ? "border-accent text-accent" : "border-primary text-primary",
      )}
      style={{ left: slot.cx - 92, top: slot.cy - 42, transform: `rotate(${slot.rotate}deg)` }}
    >
      <div className="flex items-center justify-between text-[9px] font-extrabold whitespace-nowrap">
        <span className="tracking-[2px]">ВИЗА</span>
        <span className="tracking-[1.2px]">{pending ? "ОЖИДАЕТ" : "ОДОБРЕНО"}</span>
      </div>
      <p className="line-clamp-2 font-display text-xs leading-4 font-bold">{reg.event.title}</p>
      <p className="text-[11px] font-extrabold whitespace-nowrap">
        {whenLabel(reg.myNextOccurrence?.startAt ?? reg.event.startAt)}
      </p>
    </div>
  );
}

/** Правая страница: печати за посещённые занятия и визы на будущие. */
function StampsPage() {
  const history = useUsersHistory({ page: 0, size: STAMP_SLOTS.length });
  const summary = useUsersHistorySummary({});
  const mine = useRegistrationsMine();

  const attended = history.data?.status === 200 ? (history.data.data.items ?? []) : [];
  const total = summary.data?.status === 200 ? summary.data.data.total : attended.length;
  const upcoming = (mine.data?.status === 200 ? (mine.data.data.items ?? []) : [])
    .filter((r) => r.status === "PENDING" || r.status === "CONFIRMED")
    .filter((r) => r.event.status === "PUBLISHED" && !r.event.cancelledByOrganizer)
    .filter((r) => new Date(r.myNextOccurrence?.startAt ?? r.event.startAt).getTime() > Date.now())
    .sort(
      (a, b) =>
        new Date(a.myNextOccurrence?.startAt ?? a.event.startAt).getTime() -
        new Date(b.myNextOccurrence?.startAt ?? b.event.startAt).getTime(),
    )
    .slice(0, VISA_SLOTS.length);

  // пустая печать «следующая»: на первом свободном месте, а когда все заняты — на отдельном, как в макете
  const emptyAt = attended.length < STAMP_SLOTS.length ? STAMP_SLOTS[attended.length] : { cx: 470, cy: 358 };

  return (
    <section
      aria-label="Паспорт спортсмена: отметки о посещении"
      className="absolute top-[12px] left-[606px] flex h-[572px] w-[594px] flex-col gap-[14px] overflow-hidden rounded-tl-[4px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[4px] border-2 border-ink bg-card px-[26px] pt-6 pb-[22px]"
    >
      <img
        src={`${IMG}/guilloche.svg`}
        alt=""
        className="pointer-events-none absolute top-[-2px] left-[-2px] h-[572px] w-[594px] max-w-none"
      />

      <header className="relative flex items-center justify-between">
        <h2 className="text-xs font-extrabold tracking-[2px] whitespace-nowrap text-foreground">
          ОТМЕТКИ О ПОСЕЩЕНИИ
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-[10px] py-1 text-[10px] font-extrabold tracking-[1px] whitespace-nowrap text-foreground">
            ВСЕГО {total}
          </span>
          <span className="text-[9px] font-extrabold tracking-[1.5px] whitespace-nowrap text-muted-foreground">
            стр. 3
          </span>
        </div>
      </header>

      <div className="relative h-[440px] w-full">
        {attended.slice(0, STAMP_SLOTS.length).map((item, i) => (
          <Stamp key={item.occurrenceId} slot={STAMP_SLOTS[i]} item={item} />
        ))}

        {upcoming.map((reg, i) => (
          <Visa key={reg.id} slot={VISA_SLOTS[i]} reg={reg} />
        ))}

        <div
          className="absolute flex size-[116px] flex-col items-center justify-center rounded-full border-[2.5px] border-dashed border-track font-bold text-muted-foreground"
          style={{ left: emptyAt.cx - 58, top: emptyAt.cy - 58 }}
        >
          <span className="font-display text-[22px]">+</span>
          <span className="text-[10px]">следующая</span>
          <span className="text-[10px]">печать</span>
        </div>
      </div>

      <footer className="relative flex items-center gap-2">
        <img src={`${IMG}/icon-info.svg`} alt="" className="size-4" />
        <p className="text-xs font-bold whitespace-nowrap text-muted-foreground">
          Печать ставится сама после занятия. Виза — твоя будущая запись.
        </p>
      </footer>
    </section>
  );
}

/** Разворот паспорта спортсмена: данные слева, отметки о посещении справа. */
export function PassportSpread() {
  return (
    <div className="absolute top-0 left-0 h-[600px] w-[1216px] rounded-[28px] border-2 border-ink bg-primary shadow-hard">
      <DataPage />
      <StampsPage />
      <div aria-hidden="true" className="absolute top-[12px] left-[605px] h-[572px] w-[2px] bg-ink" />
    </div>
  );
}
