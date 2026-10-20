import { Link } from "react-router";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { useUser } from "@/entity/user/model/use-user";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { EditProfileDialog } from "@/features/edit-profile/ui/edit-profile-dialog";
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
import { CancelledStamp } from "@/shared/components/ui/cancelled-stamp";
import { useWardrobe } from "../model/use-wardrobe";
import { usePublicProfile } from "../model/public-profile";
import { ProfileBeaverPet, ProfilePetName } from "./profile-pet";
import { PetDressLinks } from "@/features/pet-wardrobe/ui/pet-dress-links";
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
import { ProfileShare } from "./profile-share";
import { handle } from "@/shared/lib/handle";
import { PassportWaves } from "@/features/share-link/ui/share-posters";
import { PassportPageHeader } from "./passport-decoration";

const CHIP_TONES = [
  "bg-sky-soft",
  "bg-lime-soft",
  "bg-peach",
  "bg-lavender-soft",
];

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
      <p className="text-[11px] leading-[16px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "truncate leading-[1.25] text-foreground",
          large
            ? "font-display text-[20px] font-bold"
            : "text-base font-bold",
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
        "flex items-center gap-2 rounded-pill border-[1.5px] border-ink px-[10px] py-[5px]",
        CHIP_TONES[index % CHIP_TONES.length],
      )}
    >
      <span className="text-sm font-extrabold whitespace-nowrap text-foreground">
        {sport.sport.name}
      </span>
      {sport.level ? (
        <span className="text-[13px] font-bold whitespace-nowrap text-muted-foreground">
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

/** Небо с узором Мемфис и полоса земли, на которой стоит питомец. */
function PetBackdrop() {
  const ink = "var(--ink)";
  const dots = [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => ({ x: 40 + c * 16, y: 250 + r * 16 })));
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 540 420"
        preserveAspectRatio="xMidYMin slice"
        className="pointer-events-none absolute inset-x-0 top-0 bottom-[84px] h-[calc(100%-84px)] w-full"
      >
        <circle cx="270" cy="210" r="150" fill="var(--sky-soft)" />
        <circle cx="86" cy="86" r="40" fill="var(--orange)" stroke={ink} strokeWidth="3" />
        <path d="M86 24 v-14 M86 148 v14 M24 86 h-14 M148 86 h14 M42 42 l-10 -10 M130 130 l10 10 M130 42 l10 -10 M42 130 l-10 10" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <path d="M330 120 h120 a22 22 0 0 0 0 -44 a30 30 0 0 0 -56 -8 a26 26 0 0 0 -64 18 a17 17 0 0 0 0 34 z" fill="var(--card)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M30 330 h96 a16 16 0 0 0 0 -32 a22 22 0 0 0 -42 -6 a20 20 0 0 0 -48 14 a12 12 0 0 0 -6 24 z" fill="var(--card)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="470" cy="250" r="30" fill="none" stroke="var(--primary)" strokeWidth="11" />
        <path d="M200 40 l30 52 h-60 z" fill="var(--lilac)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M400 330 l16 -24 l16 24 l16 -24 l16 24 l16 -24" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M190 200 q14 -20 28 0 t28 0 t28 0" fill="none" stroke="var(--orange)" strokeWidth="6" strokeLinecap="round" />
        <g stroke="var(--primary)" strokeWidth="6" strokeLinecap="round">
          <path d="M310 40 v24 M298 52 h24" />
          <path d="M60 220 v24 M48 232 h24" />
        </g>
        <rect x="470" y="150" width="26" height="26" rx="4" fill="var(--lime)" stroke={ink} strokeWidth="3" transform="rotate(14 483 163)" />
        {dots.map((d) => (
          <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r="3" fill={ink} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[84px] border-t-2 border-ink bg-lime">
        <div className="absolute inset-x-0 top-[14px] h-[6px] [background:repeating-linear-gradient(90deg,var(--ink)_0_14px,transparent_14px_30px)] opacity-25" />
      </div>
    </>
  );
}

/** Полоса страницы: тот же заголовок, но синий, как в макете профиля. */
const STRIP = "bg-primary px-5 text-primary-foreground";

/** Правая страница (стр. 2): питомец-сопровождающий. */
function PetPage() {
  const owner = usePublicProfile();
  const { user } = useUser();
  const { worn } = useWardrobe();
  const [speechContainer, setSpeechContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const pet = owner ? owner.pet : user?.pet;
  const mood = pet ? (MOOD_LABEL[pet.mood] ?? pet.mood) : undefined;
  const outfit =
    worn.length > 0 ? worn.map((w) => w.item).join(" + ") : "без образа";

  return (
    <section
      aria-label="Паспорт спортсмена: питомец"
      className="relative flex min-w-0 flex-1 basis-0 flex-col overflow-hidden bg-card"
    >
      <PassportWaves className="pointer-events-none absolute inset-0 text-primary/10" />
      <PassportPageHeader title="СОПРОВОЖДАЮЩИЙ" page={2} className={STRIP} />

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ProfilePetName nameClassName="font-display text-[26px] leading-8">
              {mood ? (
                <span className="mt-1 inline-flex rounded-pill border-[1.5px] border-ink bg-lavender-soft px-[10px] py-1 text-[11px] font-bold whitespace-nowrap text-foreground">
                  настроение: {mood}
                </span>
              ) : null}
            </ProfilePetName>
          </div>
        </div>

        <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-2xl border-2 border-ink bg-sky [container-type:size]">
          <PetBackdrop />
          <ProfileBeaverPet
            speechContainer={speechContainer}
            // .beaver-pet-container сам ставит position: relative, поэтому absolute — принудительно.
            // Размер бобра следует за сценой, а лапы бобра на 30px выше нижнего края (рисунок уходит на ~30% размера ниже центра): бобёр стоит на траве.
            className="absolute! bottom-[calc(30px_-_min(100cqw,85cqh)*0.2)] left-1/2 h-[min(100cqw,85cqh)] w-[min(100cqw,85cqh)] -translate-x-1/2 [&_.beaver-pet]:h-full [&_svg]:h-full"
          />
          {/* Облачко прямо над головой: низ — над шапкой (верх рисунка + 3% размера бобра), хвостик (18px от левого края)
              — над серединой головы (37% ширины рисунка). Длинная реплика растёт вверх, не выше края сцены. */}
          <div
            ref={setSpeechContainer}
            className="beaver-speech-corner absolute top-3 right-3 bottom-[calc(40px_+_min(100cqw,85cqh)*0.768)] left-[max(12px,calc(50%_-_min(100cqw,85cqh)*0.125_-_24px))] z-10 flex flex-col justify-end-safe [&_.beaver-speech--card]:text-[15px]! [&_.beaver-speech--card]:leading-5!"
          />
        </div>
        <p className="relative truncate text-[13px] leading-5 font-bold" title={`Образ: ${outfit}`}>Образ: {outfit}</p>
        {!owner && <PetDressLinks className="relative" />}
      </div>
    </section>
  );
}

/* ---------- Левая страница: данные и отметки о посещении ---------- */

type StampType = "round" | "rect" | "oval" | "star";

/** Оттиск печати: картинка, положение строк внутри и цвет — как в макете. */
const STAMP: Record<
  StampType,
  { w: number; h: number; img: string; color: string; kind: number; sport: number; date: number; place?: number; sportSize: number }
> = {
  round: { w: 132, h: 132, img: "stamp-round", color: "text-primary", kind: 26, sport: 42, date: 70, place: 90, sportSize: 19 },
  rect: { w: 172, h: 104, img: "stamp-rect", color: "text-accent", kind: 16, sport: 30, date: 62, sportSize: 19 },
  oval: { w: 168, h: 104, img: "stamp-oval", color: "text-green", kind: 20, sport: 34, date: 62, sportSize: 18 },
  star: { w: 136, h: 136, img: "stamp-star", color: "text-ink", kind: 34, sport: 48, date: 72, place: 90, sportSize: 15 },
};

/** Ряд печатей рисуется на холсте 640×148 и уменьшается до ширины страницы паспорта (≥ 384px). */
const STAMP_SCALE = 0.6;
const STAMP_CANVAS = { w: 640, h: 148 };

/** Четыре места под печати: центр на холсте, поворот и вид оттиска. */
const STAMP_SLOTS: { type: StampType; cx: number; cy: number; rotate: number }[] = [
  { type: "round", cx: 68, cy: 74, rotate: 6 },
  { type: "rect", cx: 230, cy: 70, rotate: -4 },
  { type: "oval", cx: 408, cy: 70, rotate: 3 },
  { type: "star", cx: 570, cy: 74, rotate: -7 },
];

/** Сколько виз (записей на будущие события) показываем. */
const MAX_VISAS = 2;

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
      title={[kind, item.event.sport.name, date, place].filter(Boolean).join(" · ")}
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
        src={`/profile/${s.img}.svg`}
        alt=""
        className="absolute inset-0 size-full max-w-none"
      />
      <p
        className="absolute inset-x-0 text-center text-[9px] font-extrabold tracking-[1.5px]"
        style={{ top: s.kind }}
      >
        {kind}
      </p>
      <p
        className="absolute inset-x-3 truncate text-center font-display font-extrabold"
        style={{ top: s.sport, fontSize: sportSize(sport.length, s.sportSize) }}
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
          className="absolute inset-x-3 truncate text-center text-[10px] font-bold"
          style={{ top: s.place }}
        >
          {place}
        </p>
      ) : null}
    </div>
  );
}

/** Виза в паспорте: запись на будущее событие или, в чужом профиле, событие, которое человек ведёт. */
type VisaItem = { id: string; title: string; startAt: string; status: string; pending?: boolean; cancelled?: boolean };

/** Отменено организатором, снято или удалено админом — виза гасится штампом «Отменено». */
const isCancelled = (reg: MyRegistrationResponse) =>
  reg.event.cancelledByOrganizer || reg.event.status !== "PUBLISHED";

const regVisa = (reg: MyRegistrationResponse): VisaItem => ({
  id: reg.id,
  title: reg.event.title,
  startAt: reg.myNextOccurrence?.startAt ?? reg.event.startAt,
  pending: reg.status === "PENDING",
  cancelled: isCancelled(reg),
  status: isCancelled(reg) ? "ОТМЕНЕНО" : reg.status === "PENDING" ? "ОЖИДАЕТ" : "ОДОБРЕНО",
});

function Visa({ visa }: { visa: VisaItem }) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-[2px] rounded-[10px] border-2 border-dashed px-[10px] py-[6px]",
        visa.cancelled ? "border-orange-ink text-orange-ink" : visa.pending ? "border-accent text-accent" : "border-primary text-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold whitespace-nowrap">
        <span className="tracking-[2px]">ВИЗА</span>
        <span className="tracking-[1px]">{visa.status}</span>
      </div>
      <p className="truncate font-display text-xs leading-4 font-bold" title={visa.title}>{visa.title}</p>
      <p className="text-[11px] font-extrabold whitespace-nowrap">{whenLabel(visa.startAt)}</p>
      {visa.cancelled && <CancelledStamp className="right-[-4px] bottom-[-8px] h-[24px] w-[78px] -rotate-[8deg]" />}
    </div>
  );
}

/** Печати за посещённые занятия и визы на будущие. */
function Stamps() {
  const owner = usePublicProfile();
  return owner ? (
    // посещения чужого человека не публичны: только общее число и события, которые он ведёт
    <StampsView
      total={owner.user.attendedCount}
      attended={[]}
      visas={owner.user.events.slice(0, MAX_VISAS).map((e) => ({
        id: e.id, title: e.title, startAt: e.startAt, status: "ВЕДЁТ",
      }))}
      hint="Виза — ближайшее событие, которое ведёт"
    />
  ) : (
    <MyStamps />
  );
}

function MyStamps() {
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
    .filter((r) => r.event.status !== "DELETED")
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
    .slice(0, MAX_VISAS);

  return (
    <StampsView
      total={total}
      attended={attended}
      visas={upcoming.map(regVisa)}
      hint="Печать ставится после занятия · виза — будущая запись"
      nextStamp
    />
  );
}

function StampsView({
  total,
  attended,
  visas,
  hint,
  nextStamp,
}: {
  total: number;
  attended: AttendedOccurrenceResponse[];
  visas: VisaItem[];
  hint: string;
  /** Пустая печать «следующая» — подсказка владельцу. */
  nextStamp?: boolean;
}) {
  const shown = attended.slice(0, STAMP_SLOTS.length);
  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
          ОТМЕТКИ О ПОСЕЩЕНИИ
        </h3>
        <span className="rounded-pill border-[1.5px] border-ink bg-secondary px-[10px] py-[2px] text-[11px] font-extrabold tracking-[1px] whitespace-nowrap text-foreground">
          ВСЕГО {total}
        </span>
      </div>

      {shown.length === 0 && !nextStamp ? (
        <span className="text-[13px] font-semibold text-muted-foreground">{hint}</span>
      ) : (
        <div className="relative w-full" style={{ height: STAMP_CANVAS.h * STAMP_SCALE }}>
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: STAMP_CANVAS.w, height: STAMP_CANVAS.h, transform: `scale(${STAMP_SCALE})` }}
          >
            {shown.map((item, i) => (
              <Stamp key={item.occurrenceId} slot={STAMP_SLOTS[i]} item={item} />
            ))}
            {/* пустая печать «следующая» — на первом свободном месте */}
            {nextStamp && shown.length < STAMP_SLOTS.length && (
              <div
                className="absolute flex size-[116px] flex-col items-center justify-center rounded-full border-[2.5px] border-dashed border-ultramarine bg-white text-[11px] leading-[14px] font-extrabold text-foreground"
                style={{ left: STAMP_SLOTS[shown.length].cx - 58, top: STAMP_SLOTS[shown.length].cy - 58 }}
              >
                <span className="font-display text-[30px] leading-[34px] text-ultramarine">+</span>
                <span>следующая</span>
                <span>печать</span>
              </div>
            )}
          </div>
        </div>
      )}

      {visas.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {visas.map((visa) => (
            <Visa key={visa.id} visa={visa} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Левая страница (стр. 1): данные владельца и отметки о посещении. */
function DataPage() {
  const owner = usePublicProfile();
  const { user: me } = useUser();
  const sports = useUsersMySports({ query: { enabled: !owner } });
  const user = owner ? owner.user : me;
  const list = owner
    ? owner.user.sports
    : sports.data?.status === 200 ? sports.data.data : [];
  const number = passportNumber(user?.id);

  return (
    <section
      aria-label="Паспорт спортсмена: данные и отметки"
      className="relative flex min-w-0 flex-1 basis-0 flex-col overflow-hidden border-r-2 border-ink bg-card"
    >
      <PassportWaves className="pointer-events-none absolute inset-0 text-primary/10" />
      <PassportPageHeader title="◉ ПАСПОРТ СПОРТСМЕНА" page={1} className={STRIP} />

      <div className="relative flex flex-1 flex-col gap-3 px-5 pt-4 pb-4">
        <div className="relative flex items-start gap-4">
          <UserAvatar user={user} className="h-[132px] w-[108px] shrink-0 rounded-xl border-2 border-ink object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pr-10">
            <Field
              label="ФАМИЛИЯ / SURNAME"
              value={user?.lastName ?? "—"}
              large
            />
            <Field label="ИМЯ / NAME" value={user?.firstName ?? "—"} large />
            <Field
              label="ЛОГИН"
              value={user?.username ? handle(user.username) : "—"}
            />
          </div>
          {!owner && (
            <EditProfileDialog user={me}>
              <Button
                variant="soft"
                aria-label="Править профиль"
                title="Править профиль"
                className="absolute top-0 right-0 size-9 shrink-0 p-0"
              >
                <Pencil className="size-5" />
              </Button>
            </EditProfileDialog>
          )}
        </div>

        <div className="grid grid-cols-3 items-end gap-x-3 gap-y-2">
          <Field label="ГОРОД" value={user?.city ?? "—"} />
          {owner ? (
            <Field label="ПОСЕЩЕНИЙ" value={String(owner.user.attendedCount)} />
          ) : (
            <Field label="ДАТА ВЫДАЧИ" value={dateFull(me?.createdAt)} />
          )}
          {owner ? (
            <Field label="ВЕДЁТ СОБЫТИЙ" value={String(owner.user.events.length)} />
          ) : (
            <Field
              label="СТАТУС"
              value={me?.systemRole ? ROLE_LABEL[me.systemRole] : "—"}
            />
          )}
          <Field label="ОРГАН ВЫДАЧИ" value="Движ" />
          <Field label="№ ПАСПОРТА" value={number} />
          <ProfileShare user={user} className="h-9 justify-self-end px-3" />
        </div>

        <div className="relative flex flex-col gap-[6px]">
          <p className="text-[11px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
            ВИДЫ СПОРТА И РАЗРЯД
          </p>
          <div className="flex max-h-[76px] flex-wrap gap-2 overflow-hidden">
            {list.length > 0 ? (
              list.map((s, i) => (
                <SportChip key={s.sport.id} sport={s} index={i} />
              ))
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">
                Виды спорта пока не выбраны.
              </span>
            )}
          </div>
        </div>

        <div className="relative flex flex-col gap-[2px]">
          <p className="text-[11px] font-extrabold tracking-[1.2px] whitespace-nowrap text-muted-foreground">
            ОСОБЫЕ ОТМЕТКИ
          </p>
          <p className="line-clamp-2 text-[15px] leading-[21px] font-medium text-foreground">
            {user?.bio || "Пока ничего не написано."}
          </p>
        </div>

        <div className="relative mt-auto">
          <Stamps />
        </div>
      </div>
    </section>
  );
}

/** Разворот паспорта спортсмена: данные и отметки слева, питомец справа. Ширину задаёт родитель, высоту — содержимое. */
export function PassportSpread({ className, ref }: { className?: string; ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex min-h-[520px] overflow-hidden rounded-[24px] border-2 border-ink bg-card shadow-hard",
        className,
      )}
    >
      <DataPage />
      <PetPage />
    </div>
  );
}
