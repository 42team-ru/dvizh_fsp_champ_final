import { useState } from "react";
import { useUser } from "@/entity/user/model/use-user";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { EditProfileDialog } from "@/features/edit-profile/ui/edit-profile-dialog";
import { PetNameEditor } from "@/features/rename-pet/ui/pet-name-editor";
import { WardrobeDialog } from "@/features/pet-wardrobe/ui/wardrobe-dialog";
import { MyBeaverPet } from "@/widgets/beaver-pet/ui/my-beaver-pet";
import { Button } from "@/shared/components/ui/button";
import { useRegistrationsMine } from "@/shared/api/generated/core/registrations/registrations";
import {
  useUsersHistory,
  useUsersHistorySummary,
  useUsersMySports,
} from "@/shared/api/generated/core/users/users";
import type {
  AttendedOccurrenceResponse,
  MyRegistrationResponse,
  UserSportResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { cn } from "cn";
import { useWardrobe } from "../model/use-wardrobe";
import {
  KIND_LABEL,
  LEVEL_PIPS,
  MOOD_LABEL,
  ROLE_LABEL,
  SPORT_LEVEL_LABEL,
  dateFull,
  dateShort,
  passportNumber,
  whenLabel,
} from "./passport-utils";

const IMG = "/profile";
const CHIP_TONES = [
  "bg-sky-soft",
  "bg-lime-soft",
  "bg-peach",
  "bg-lavender-soft",
];

/** Высота страницы паспорта; разворот выше на 2 × 12 px рамки. */
const PAGE_H = 700;

/** Вся подпись поля паспорта: мелкий заголовок и значение. */
function Field({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
      <p className="text-[9px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-foreground",
          large
            ? "font-display text-[17px] font-bold"
            : "text-[15px] font-bold",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SportChip({
  sport,
  index,
}: {
  sport: UserSportResponse;
  index: number;
}) {
  const pips = sport.level ? LEVEL_PIPS[sport.level] : 0;
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-pill border-[1.5px] border-ink px-3 py-[6px]",
        CHIP_TONES[index % CHIP_TONES.length],
      )}
    >
      <span className="text-[13px] font-extrabold whitespace-nowrap text-foreground">
        {sport.sport.name}
      </span>
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
              className={cn(
                "w-[5px] rounded-[1.5px]",
                i < pips ? "bg-primary" : "bg-track",
              )}
              style={{ height: h }}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** Левая страница (стр. 2): питомец-сопровождающий. */
function PetPage() {
  const { user } = useUser();
  const { worn } = useWardrobe();
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const mood = user?.pet
    ? (MOOD_LABEL[user.pet.mood] ?? user.pet.mood)
    : undefined;
  const outfit =
    worn.length > 0 ? worn.map((w) => w.item).join(" + ") : "без образа";

  return (
    <section
      aria-label="Паспорт спортсмена: питомец"
      style={{ height: PAGE_H }}
      className="absolute top-[12px] left-[12px] flex w-[594px] flex-col gap-[14px] overflow-hidden rounded-tl-[20px] rounded-tr-[4px] rounded-br-[4px] rounded-bl-[20px] border-2 border-ink bg-card px-[26px] pt-6 pb-[22px]"
    >
      <img
        src={`${IMG}/guilloche.svg`}
        alt=""
        className="pointer-events-none absolute top-[-2px] left-[-2px] w-[594px] max-w-none"
        style={{ height: PAGE_H }}
      />

      <header className="relative flex items-center justify-between">
        <h2 className="text-xs font-extrabold tracking-[2px] whitespace-nowrap text-foreground">
          СОПРОВОЖДАЮЩИЙ
        </h2>
        <span className="text-[9px] font-extrabold tracking-[1.5px] whitespace-nowrap text-muted-foreground">
          стр. 2
        </span>
      </header>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PetNameEditor nameClassName="font-display text-[32px] leading-10">
            {mood ? (
              <span className="mt-1 inline-flex rounded-pill border-[1.5px] border-ink bg-lavender-soft px-[10px] py-1 text-[11px] font-bold whitespace-nowrap text-foreground">
                настроение: {mood}
              </span>
            ) : null}
          </PetNameEditor>
        </div>
        <WardrobeDialog>
          <Button
            variant="soft"
            className="mt-1 h-10 shrink-0 px-4 text-[13px]"
          >
            Изменить образ
          </Button>
        </WardrobeDialog>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] border-2 border-ink bg-sky">
        <img
          src={`${IMG}/memphis1.svg`}
          alt=""
          className="pointer-events-none absolute bottom-0 left-1/2 size-[440px] max-w-none -translate-x-1/2"
        />
        <MyBeaverPet
          speechContainer={speechContainer}
          className="absolute top-[24px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 [&_.beaver-pet]:h-full [&_svg]:h-full"
        />
        <div
          ref={setSpeechContainer}
          className="beaver-speech-corner absolute top-3 right-3 z-10 w-[170px]"
        />
        <div className="absolute bottom-[14px] left-[14px] flex items-center gap-2 rounded-pill border-[1.5px] border-ink bg-card py-[6px] pr-3 pl-[10px]">
          <span className="text-[9px] font-extrabold tracking-[1.5px] text-muted-foreground">
            ОБРАЗ
          </span>
          <span className="text-xs font-bold text-foreground">{outfit}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Правая страница: данные и отметки о посещении ---------- */

type StampType = "round" | "rect" | "oval" | "star";

/** Размеры оттиска, положение текста внутри и цвет — как в макете. */
const STAMP: Record<
  StampType,
  {
    w: number;
    h: number;
    img: string;
    color: string;
    kind: number;
    sport: number;
    date: number;
    place?: number;
    sportSize: number;
  }
> = {
  round: {
    w: 132,
    h: 132,
    img: "stamp-round",
    color: "text-primary",
    kind: 26,
    sport: 42,
    date: 70,
    place: 90,
    sportSize: 19,
  },
  rect: {
    w: 172,
    h: 104,
    img: "stamp-rect",
    color: "text-accent",
    kind: 16,
    sport: 30,
    date: 62,
    sportSize: 19,
  },
  oval: {
    w: 168,
    h: 104,
    img: "stamp-oval",
    color: "text-green",
    kind: 20,
    sport: 34,
    date: 62,
    sportSize: 18,
  },
  star: {
    w: 136,
    h: 136,
    img: "stamp-star",
    color: "text-ink",
    kind: 34,
    sport: 48,
    date: 72,
    place: 90,
    sportSize: 15,
  },
};

/** Холст штампов 753×278 (потом уменьшается до ширины страницы). */
const STAMP_SCALE = 0.72;
const STAMP_CANVAS = { w: 753, h: 278 };

/** Четыре места под печати: центр на холсте, поворот и вид оттиска. */
const STAMP_SLOTS: {
  type: StampType;
  cx: number;
  cy: number;
  rotate: number;
}[] = [
  { type: "round", cx: 80, cy: 78, rotate: 6 },
  { type: "rect", cx: 275, cy: 72, rotate: -4 },
  { type: "oval", cx: 470, cy: 70, rotate: 3 },
  { type: "star", cx: 655, cy: 78, rotate: -7 },
];

/** Места под визы (записи на будущие события). */
const VISA_SLOTS = [
  { cx: 110, cy: 205, rotate: 2 },
  { cx: 330, cy: 200, rotate: -3 },
];

/** Название вида спорта в оттиске: чем длиннее, тем мельче, чтобы влезло. */
function sportSize(length: number, base: number) {
  if (length <= 6) return base;
  if (length <= 8) return base - 6;
  return base - 9;
}

function Stamp({
  slot,
  item,
}: {
  slot: (typeof STAMP_SLOTS)[number];
  item: AttendedOccurrenceResponse;
}) {
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
      <img
        src={`${IMG}/${s.img}.svg`}
        alt=""
        className="absolute inset-0 size-full max-w-none"
      />
      <p
        className="absolute inset-x-0 text-center text-[8px] font-extrabold tracking-[1.5px]"
        style={{ top: s.kind }}
      >
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
        <p
          className="absolute inset-x-3 truncate text-center text-[9px] font-bold"
          style={{ top: s.place }}
        >
          {place}
        </p>
      ) : null}
    </div>
  );
}

function Visa({
  slot,
  reg,
}: {
  slot: (typeof VISA_SLOTS)[number];
  reg: MyRegistrationResponse;
}) {
  const pending = reg.status === "PENDING";
  return (
    <div
      className={cn(
        "absolute flex w-[184px] flex-col gap-1 rounded-[10px] border-[2.5px] border-dashed px-3 py-[10px]",
        pending ? "border-accent text-accent" : "border-primary text-primary",
      )}
      style={{
        left: slot.cx - 92,
        top: slot.cy - 42,
        transform: `rotate(${slot.rotate}deg)`,
      }}
    >
      <div className="flex items-center justify-between text-[9px] font-extrabold whitespace-nowrap">
        <span className="tracking-[2px]">ВИЗА</span>
        <span className="tracking-[1.2px]">
          {pending ? "ОЖИДАЕТ" : "ОДОБРЕНО"}
        </span>
      </div>
      <p className="line-clamp-2 font-display text-xs leading-4 font-bold">
        {reg.event.title}
      </p>
      <p className="text-[11px] font-extrabold whitespace-nowrap">
        {whenLabel(reg.myNextOccurrence?.startAt ?? reg.event.startAt)}
      </p>
    </div>
  );
}

/** Печати за посещённые занятия и визы на будущие. */
function Stamps() {
  const history = useUsersHistory({ page: 0, size: STAMP_SLOTS.length });
  const summary = useUsersHistorySummary({});
  const mine = useRegistrationsMine();

  const attended =
    history.data?.status === 200 ? (history.data.data.items ?? []) : [];
  const total =
    summary.data?.status === 200 ? summary.data.data.total : attended.length;
  const upcoming = (
    mine.data?.status === 200 ? (mine.data.data.items ?? []) : []
  )
    .filter((r) => r.status === "PENDING" || r.status === "CONFIRMED")
    .filter(
      (r) => r.event.status === "PUBLISHED" && !r.event.cancelledByOrganizer,
    )
    .filter(
      (r) =>
        new Date(r.myNextOccurrence?.startAt ?? r.event.startAt).getTime() >
        Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.myNextOccurrence?.startAt ?? a.event.startAt).getTime() -
        new Date(b.myNextOccurrence?.startAt ?? b.event.startAt).getTime(),
    )
    .slice(0, VISA_SLOTS.length);

  // пустая печать «следующая»: на первом свободном месте, а когда все заняты — во втором ряду
  const emptyAt =
    attended.length < STAMP_SLOTS.length
      ? STAMP_SLOTS[attended.length]
      : { cx: 570, cy: 205 };

  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[9px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
          ОТМЕТКИ О ПОСЕЩЕНИИ
        </h3>
        <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-[10px] py-[3px] text-[10px] font-extrabold tracking-[1px] whitespace-nowrap text-foreground">
          ВСЕГО {total}
        </span>
        <span className="min-w-0 truncate text-[10px] font-semibold text-muted-foreground">
          Печать ставится после занятия · виза — будущая запись
        </span>
      </div>

      <div
        className="relative w-full"
        style={{ height: STAMP_CANVAS.h * STAMP_SCALE }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: STAMP_CANVAS.w,
            height: STAMP_CANVAS.h,
            transform: `scale(${STAMP_SCALE})`,
          }}
        >
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
      </div>
    </div>
  );
}

/** Правая страница (стр. 3): данные владельца и отметки о посещении. */
function DataPage() {
  const { user } = useUser();
  const sports = useUsersMySports();
  const list = sports.data?.status === 200 ? sports.data.data : [];
  const number = passportNumber(user?.id);
  const issued = dateShort(user?.createdAt);

  return (
    <section
      aria-label="Паспорт спортсмена: данные и отметки"
      style={{ height: PAGE_H }}
      className="absolute top-[12px] left-[606px] flex w-[594px] flex-col gap-3 overflow-hidden rounded-tl-[4px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[4px] border-2 border-ink bg-card px-[26px] pt-6 pb-[22px]"
    >
      <img
        src={`${IMG}/guilloche.svg`}
        alt=""
        className="pointer-events-none absolute top-[-2px] left-[-2px] w-[594px] max-w-none"
        style={{ height: PAGE_H }}
      />

      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`${IMG}/ring-logo.svg`} alt="" className="size-[22px]" />
          <h2 className="text-xs font-extrabold tracking-[2px] whitespace-nowrap text-foreground">
            ПАСПОРТ СПОРТСМЕНА
          </h2>
        </div>
        <span className="text-[9px] font-extrabold tracking-[1.5px] whitespace-nowrap text-muted-foreground">
          SPORT PASSPORT · стр. 3
        </span>
      </header>

      <div className="relative flex items-start gap-[22px]">
        <UserAvatar
          user={user}
          className="h-[190px] w-[150px] shrink-0 rounded-xl border-2 border-ink object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex gap-4">
            <Field
              label="ФАМИЛИЯ / SURNAME"
              value={user?.lastName ?? "—"}
              large
            />
            <Field label="ИМЯ / NAME" value={user?.firstName ?? "—"} large />
          </div>
          <div className="flex gap-4">
            <Field
              label="ЛОГИН"
              value={user?.username ? `@${user.username}` : "—"}
            />
            <Field label="ГОРОД" value={user?.city ?? "—"} />
          </div>
          <div className="flex gap-4">
            <Field label="ДАТА ВЫДАЧИ" value={dateFull(user?.createdAt)} />
            <Field label="ОРГАН ВЫДАЧИ" value="Движ" />
          </div>
          <div className="flex gap-4">
            <Field
              label="СТАТУС"
              value={user?.systemRole ? ROLE_LABEL[user.systemRole] : "—"}
            />
            <Field label="№ ПАСПОРТА" value={number} />
          </div>
        </div>
      </div>

      {/* штамп «действителен» поверх фото */}
      <div className="pointer-events-none absolute top-[157px] left-[102px] flex size-[99px] items-center justify-center">
        <div className="relative size-[83px] -rotate-12 text-accent">
          <img
            src={`${IMG}/stamp-valid.svg`}
            alt=""
            className="absolute inset-0 size-full"
          />
          <p className="absolute inset-x-0 top-6 text-center text-[6.4px] font-extrabold tracking-[0.8px]">
            ДЕЙСТВИТЕЛЕН
          </p>
          <p className="absolute inset-x-0 top-[35px] text-center font-display text-[11.2px] font-extrabold">
            ГОДЕН
          </p>
          <p className="absolute inset-x-0 top-[51px] text-center text-[7.2px] font-extrabold">
            с {issued}
          </p>
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
        <div className="flex max-h-[72px] flex-wrap gap-2 overflow-hidden">
          {list.length > 0 ? (
            list.map((s, i) => (
              <SportChip key={s.sport.id} sport={s} index={i} />
            ))
          ) : (
            <span className="text-[13px] font-semibold text-muted-foreground">
              Виды спорта пока не выбраны.
            </span>
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-1">
        <p className="text-[9px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
          ОСОБЫЕ ОТМЕТКИ
        </p>
        <p className="line-clamp-2 text-[13px] leading-[18px] font-medium text-foreground">
          {user?.bio || "Пока ничего не написано."}
        </p>
      </div>

      <div className="relative mt-auto">
        <Stamps />
      </div>
    </section>
  );
}

/** Во сколько раз разворот уменьшен, чтобы справа осталось место под достижения. */
export const SPREAD_SCALE = 0.76;
export const SPREAD_W = Math.round(1216 * SPREAD_SCALE);
export const SPREAD_H = Math.round((PAGE_H + 28) * SPREAD_SCALE);

/** Разворот паспорта спортсмена: питомец слева, данные и отметки справа. */
export function PassportSpread() {
  return (
    <div
      className="absolute top-0 left-0"
      style={{ width: SPREAD_W, height: SPREAD_H }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left rounded-[28px] border-2 border-ink bg-primary shadow-hard"
        style={{
          width: 1216,
          height: PAGE_H + 28,
          transform: `scale(${SPREAD_SCALE})`,
        }}
      >
        <PetPage />
        <DataPage />
        <div
          aria-hidden="true"
          className="absolute top-[12px] left-[605px] w-[2px] bg-ink"
          style={{ height: PAGE_H }}
        />
      </div>
    </div>
  );
}
