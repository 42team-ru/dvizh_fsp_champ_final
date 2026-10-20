import { coverOf } from "@/entity/event/lib/cover";
import { MessageCircleQuestion } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { WavingBeaver } from "@/widgets/beaver-pet/ui/waving-beaver";
import { useRef, useState } from "react";
import { CancelledStamp } from "@/shared/components/ui/cancelled-stamp";
import { Link } from "react-router";
import { EventMobile } from "./event-mobile";
import { fullName, initials, privateNote, rejectedText, useEvent } from "../model/use-event";
import { plural } from "@/shared/lib/plural";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { LocationPicker } from "@/widgets/events-map/ui/location-picker";
import { Disc } from "@/shared/components/ui/disc";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { RoughBorder } from "@/shared/components/ui/rough-border";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { QrCode } from "@/shared/components/ui/qr-code";
import { EventShare } from "./event-share";
import { InviteActions } from "@/features/organizer-invite/ui/invite-actions";
import { EventGoingCrowd } from "@/widgets/event-going-crowd/ui/event-going-crowd";

type EventModel = ReturnType<typeof useEvent>;

const FACT_WIDTHS = ["w-[199.5px]", "w-[201.5px] border-l-2 border-dashed border-track", "w-[201.5px] border-l-2 border-dashed border-track"];
/**
 * Вырезы «отрывного билета» на линии отрыва: центр — середина пунктира (912px + 1px внутри
 * рамки 2px), отсюда 915px от внешнего края. Маска прорезает карточку вместе с рамкой и
 * полосой талона, а дуги `TicketNotch` дорисовывают обводку выреза.
 */
const NOTCH = { x: 915, r: 15 };
const notchMask = (height: number) => {
  const image = [0, height]
    .map((y) => `radial-gradient(circle at ${NOTCH.x}px ${y}px, transparent ${NOTCH.r}px, #000 ${NOTCH.r + 0.5}px)`)
    .join(", ");
  return { maskImage: image, maskComposite: "intersect", WebkitMaskImage: image, WebkitMaskComposite: "source-in" } as const;
};
const TICKET_HEIGHT = 400;

/** Обводка выреза: окружность 2px по краю дыры, видна только половина внутри билета. */
function TicketNotch({ side }: { side: "top" | "bottom" }) {
  const size = (NOTCH.r + 2) * 2;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute box-border rounded-full border-2 border-ink"
      style={{
        width: size,
        height: size,
        left: NOTCH.x - size / 2,
        top: side === "top" ? -size / 2 : `calc(100% - ${size / 2}px)`,
        clipPath: side === "top" ? "inset(50% 0 0 0)" : "inset(0 0 50% 0)",
      }}
    />
  );
}

const TONES = ["bg-sky", "bg-lime-soft", "bg-lavender-soft", "bg-peach", "bg-mint-soft"];
const TAKE_TONES = ["bg-lime-soft", "bg-lavender-soft", "bg-sky-soft", "bg-mint-soft"];

function Img({ src, className }: { src: string; className?: string }) {
  return <img src={`/event/${src}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function TopBar({ m }: { m: EventModel }) {
  const [shareOpen, setShareOpen] = useState(false);
  const e = m.event;
  return (
    <div className="flex h-10 w-[1216px] shrink-0 items-center justify-between">
      <Button asChild variant="soft" className="h-10 px-[18px] text-sm leading-[19px]">
        <Link to="/feed">
          <Icon name="event/icon-back" className="size-[18px]" />К ленте
        </Link>
      </Button>
      <div className="flex h-10 w-[148px] items-start">
        <Button variant="soft" className="h-10 shrink-0 px-[18px] text-sm leading-[19px]" disabled={!e || Boolean(m.moderated)} onClick={() => setShareOpen(true)}>
          <Icon name="event/icon-share" className="size-[18px]" />
          Поделиться
        </Button>
      </div>
      <EventShare m={m} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

/** Кнопка записи по блоку viewer: записаться, подать заявку, отменить или причина, почему нельзя. */
function RegisterAction({ m, className, hintClassName }: { m: EventModel; className: string; hintClassName: string }) {
  const viewer = m.event!.viewer;
  const active = viewer.registrationStatus === "CONFIRMED" || viewer.registrationStatus === "PENDING";
  const rejected = viewer.registrationStatus === "REJECTED";
  const hint = m.actionError ?? (rejected ? rejectedText(viewer.decisionReason) : m.status && active ? m.status.label : viewer.canRegister
    ? (m.event!.joinMode === "REQUEST" ? "Организатор рассмотрит заявку" : "Отменить можно в любой момент")
    : viewer.registerBlockedReason ?? (viewer.isOrganizer ? "Вы организатор" : ""));
  return (
    <>
      {active && viewer.canCancel ? (
        <Button variant="soft" className={className} disabled={m.busy} onClick={m.cancel}>
          {viewer.registrationStatus === "PENDING" ? "Отозвать заявку" : "Отменить запись"}
        </Button>
      ) : (
        <Button variant="ink" className={className} disabled={!viewer.canRegister || m.busy} onClick={m.register}>
          {m.event!.joinMode === "REQUEST" ? "Подать заявку" : "Записаться"}
        </Button>
      )}
      <p role={m.actionError ? "alert" : undefined} title={hint} className={hintClassName}>{hint}</p>
    </>
  );
}

function TicketHero({ m }: { m: EventModel }) {
  const e = m.event!;
  const cover = coverOf(e);
  return (
    // Тень — drop-shadow на обёртке (box-shadow маска срезала бы целиком). Внешняя обёртка
    // шире на тень и вырезает те же дыры уже из тени, чтобы сквозь вырез был виден фон.
    <div className="-mr-[6px] -mb-[6px] h-[406px] w-[1222px] shrink-0" style={notchMask(TICKET_HEIGHT)}>
    <div className="relative h-[400px] w-[1216px] drop-shadow-[6px_6px_0_var(--ink)]">
    <Card className="relative h-[400px] w-[1216px] flex-row items-start overflow-hidden rounded-[28px] p-0" style={notchMask(TICKET_HEIGHT)}>
      <div className="relative h-[396px] w-[270px] shrink-0 overflow-hidden border-r-2 border-ink">
        <img src={cover.src} style={{ objectPosition: cover.position }} alt="" className="absolute top-0 left-0 h-[396px] w-[268px] object-cover" />
        <div className="absolute top-0 left-0 h-[396px] w-[268px] bg-gradient-to-b from-[rgba(22,24,31,0.05)] via-[rgba(22,24,31,0.15)] via-55% to-[rgba(22,24,31,0.7)]" />
        <div className="absolute top-[18px] right-[18px] left-[18px] flex gap-[6px]">
          <Badge variant="outline" title={e.sport.name} className="min-w-0 shrink"><span className="truncate">{e.sport.name}</span></Badge>
          <Badge variant="outline">{m.levelLabel}</Badge>
        </div>
        <div className="absolute top-[339px] left-5 w-[230px]">
          <Eyebrow className="text-white opacity-90">ОРГАНИЗАТОР</Eyebrow>
          <p className="mt-1 truncate font-display text-base leading-5 font-bold text-white">{m.organizerName}</p>
        </div>
      </div>

      {/* полоса «посадочного талона» над основной частью билета */}
      <div className="absolute top-0 left-[270px] z-10 flex h-10 w-[642px] items-center justify-between bg-primary px-8 text-[11px] font-extrabold whitespace-nowrap">
        <span className="tracking-[2px] text-secondary">ПОСАДОЧНЫЙ ТАЛОН · {m.kindLabel.toUpperCase()}</span>
        <img src="/event/dots.svg" alt="" className="absolute left-[340px] h-[26px] w-[40px] max-w-none" />
        <span className="tracking-[1.5px] text-white">
          БИЛЕТ № {e.id.slice(0, 4).toUpperCase()} · {m.joinLabel.toUpperCase()}
        </span>
      </div>

      <div className="flex h-[396px] w-[642px] shrink-0 flex-col items-start justify-between pt-[64px] pr-[30px] pb-[26px] pl-[10px]">
        <div className="relative h-[86px] w-[602px]">
          <h1 className="absolute top-0 left-5 line-clamp-2 w-[560px] font-display text-[40px] leading-[43px] font-extrabold tracking-[-1px] text-foreground">
            {e.title}
          </h1>
        </div>

        <div className="flex h-[87px] w-[602px]">
          {m.facts.map((f, i) => (
            <div key={f.label} className={cn("relative h-[87px] shrink-0", FACT_WIDTHS[i])}>
              <div className="absolute top-0 left-5 flex h-4 items-center gap-[6px]">
                <Icon name={`event/${f.icon}`} className="size-4" />
                <Eyebrow>{f.label}</Eyebrow>
              </div>
              <p title={f.value} className="absolute top-[23px] left-5 w-[175px] truncate font-display text-[19px] leading-6 font-bold text-foreground">
                {f.value}
              </p>
              <p className="absolute top-[51px] left-5 w-[175px] text-[13px] leading-[18px] font-semibold text-muted-foreground">
                <span title={f.lines[0]} className="block truncate">{f.lines[0]}</span>
                <span title={f.lines[1]} className="block truncate">{f.lines[1]}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex h-[396px] w-[300px] shrink-0 flex-col items-start justify-between overflow-hidden bg-secondary pt-[50px] pr-[26px] pb-[26px] pl-8">
        <Img src="memphis.svg" className="top-0 left-0 h-[400px] w-[300px]" />
        <span className="absolute top-[14px] left-8 text-[10px] font-extrabold tracking-[2px] text-foreground">
          КОНТРОЛЬ
        </span>
        <span className="absolute top-[14px] right-[26px] text-[10px] font-extrabold tracking-[1px] text-foreground">
          № {e.id.slice(0, 4).toUpperCase()}
        </span>
        {!m.moderated && <QrCode path={`/events/${e.id}`} label="QR-код: страница встречи" className="absolute top-[46px] right-[26px] z-10 size-[68px]" />}
        {/* штамп организатора: только пока моя запись подтверждена — после «Отменить» пропадает */}
        {(e.status !== "PUBLISHED" || e.singleOccurrence?.status === "CANCELLED") && (
          <CancelledStamp big className="top-[220px] left-[34px] h-[66px] w-[178px] rotate-[9deg]" />
        )}
        {e.viewer.registrationStatus === "CONFIRMED" && e.status === "PUBLISHED" && e.singleOccurrence?.status !== "CANCELLED" && (
          <div className="pointer-events-none absolute top-[220px] left-[34px] h-[66px] w-[178px] rotate-[9deg] text-primary">
            <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
            <p className="absolute inset-x-0 top-3 text-center font-display text-[20px] font-extrabold">ДОПУЩЕН</p>
            <p className="absolute inset-x-0 top-10 truncate px-3 text-center text-[9px] font-extrabold tracking-[1px]">
              орг. {e.organization?.name ?? `${e.author.firstName} ${e.author.lastName?.[0] ?? ""}.`} · {new Date(e.startAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
            </p>
          </div>
        )}
        <div className="relative h-[143px] w-[242px]">
          <Eyebrow className="text-foreground">УЧАСТНИКИ</Eyebrow>
          <p className="absolute top-[14px] left-0 font-display text-[54px] leading-[67px] font-extrabold text-foreground">
            {m.going}
          </p>
          {e.capacity != null && (
            <span className="absolute top-[47px] left-[81px] text-xl leading-[27px] font-bold text-foreground">
              / {e.capacity}
            </span>
          )}
          <Progress value={m.percent} className="absolute top-[89px] left-0 h-3" />
          <div className="absolute top-[113px] left-0 h-[30px] w-[242px]">
            {e.participants.slice(0, 4).map((p, i) => (
              <Disc
                key={p.id}
                initials={initials(p)}
                user={p}
                tone={TONES[i % TONES.length]}
                className="absolute top-0 size-[30px]"
                textClassName="text-[10px] leading-[14px]"
                style={{ left: i * 22 }}
              />
            ))}
            {m.going > 4 && (
              <span className="absolute top-[6px] left-[104px] text-[13px] leading-[18px] font-bold whitespace-nowrap text-muted-foreground">
                и ещё {m.going - 4}
              </span>
            )}
          </div>
        </div>
        <div className="relative h-[81px] w-[242px]">
          {m.moderated ? (
            <p className="rounded-2xl border-2 border-ink bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground">
              Запись закрыта
            </p>
          ) : (
            <RegisterAction m={m} className="h-[54px] w-[242px] px-7 text-base leading-[22px]"
              hintClassName="absolute top-[60px] left-0 line-clamp-2 w-full text-center text-xs leading-[15px] font-bold text-foreground" />
          )}
        </div>
      </div>

      <div className="absolute top-[26px] left-[912px] h-[344px] w-[2px] border-l-2 border-dashed border-ink" />
    </Card>
    <TicketNotch side="top" />
    <TicketNotch side="bottom" />
    </div>
    </div>
  );
}

function About({ m }: { m: EventModel }) {
  const e = m.event!;
  const take = (e.equipment ?? "").split(/[,\n;]/).map((t) => t.trim()).filter(Boolean).slice(0, 4);
  const note = privateNote(e);
  return (
    // текст — в левой половине карточки, правую занимает бобр хозяина, который машет зрителю
    <Card className="relative min-h-[330px] shrink-0 gap-4 p-7 pr-[calc(50%+12px)]">
      <h2 className="font-display text-[22px] leading-[27px] font-bold text-foreground">
        О встрече
      </h2>
      {e.viewer.registrationStatus === "REJECTED" && (
        <p role="status" className="max-w-[560px] rounded-[14px] border-2 border-ink bg-salmon px-4 py-3 text-[15px] font-bold text-foreground">
          {rejectedText(e.viewer.decisionReason)}. Вы не участник этой встречи — посмотрите другие в ленте.
        </p>
      )}
      <p className="whitespace-pre-wrap break-words text-base leading-[25.5px] font-medium text-foreground">
        {e.description || "Организатор не добавил описание — спросите в обсуждении."}
      </p>
      <div className="flex flex-col items-start gap-3">
        {e.requirements && (
          <div className="flex flex-col gap-1">
            <Eyebrow>ТРЕБОВАНИЯ</Eyebrow>
            <p className="whitespace-pre-wrap break-words text-base leading-[25.5px] font-medium text-foreground">
              {e.requirements}
            </p>
          </div>
        )}
        <div className="relative rounded-[18px] border-2 border-ink bg-card px-4 py-2">
          <p className="break-words text-sm leading-[20.5px] font-semibold text-foreground">{note}</p>
          {/* хвостик облачка: квадрат, повёрнутый углом к бобру, — облачко «говорит» бобр */}
          <span aria-hidden className="absolute top-1/2 -right-[11px] box-border size-5 -translate-y-1/2 -rotate-45 rounded-br-[4px] border-r-2 border-b-2 border-ink bg-card" />
        </div>
      </div>
      {take.length > 0 && (
        <>
          <Eyebrow>ЧТО ВЗЯТЬ</Eyebrow>
          <div className="relative z-10 flex flex-wrap gap-2">
            {take.map((t, i) => (
              <Badge key={t} className={cn("max-w-full whitespace-normal break-words text-[13px] leading-[18px] text-foreground", TAKE_TONES[i])}>
                {t}
              </Badge>
            ))}
          </div>
        </>
      )}
      <div className="absolute right-4 bottom-2 w-[calc(50%-24px)]">
        <WavingBeaver />
      </div>
    </Card>
  );
}

function Organizer({ m }: { m: EventModel }) {
  const e = m.event!;
  /** Событие организации ведёт на её страницу, личное — на профиль автора. */
  const organizerHref = e.organization ? `/orgs/${e.organization.id}` : `/users/${e.author.id}`;
  return (
    // Обычный поток с отступами: при крупном шрифте браузера блоки раздвигаются, а не наезжают друг на друга.
    <Card className="relative min-h-[286.5px] shrink-0 gap-[17px] overflow-hidden bg-sky-soft p-[22px]">
      <div className="flex min-h-14 items-center gap-[14px]">
        <Link to={organizerHref} aria-label={m.organizerName} className="shrink-0">
          <Disc
            initials={e.organization ? e.organization.name.slice(0, 2).toUpperCase() : initials(e.author)}
            user={e.organization ? undefined : e.author}
            tone="bg-sky"
            className="size-14"
            textClassName="text-[19px] leading-[26px] tracking-[-0.5px]"
          />
        </Link>
        <div className="min-w-0">
          <Link to={organizerHref} className="block truncate text-[17px] leading-[23px] font-extrabold text-foreground hover:underline">{m.organizerName}</Link>
          <p className="truncate text-[13px] leading-[18px] font-medium text-muted-foreground">
            {e.organization ? `Организация · ведёт ${fullName(e.author)}` : `Организатор${e.author.city ? ` · ${e.author.city}` : ""}`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: String(m.going), l: "записались", tone: "bg-lime-soft" },
          { v: String(e.organizers.filter((o) => !o.invited).length), l: "организаторов", tone: "bg-background" },
        ].map((s) => (
          <div
            key={s.l}
            className={cn("relative min-h-[61px] rounded-[14px] border-2 border-transparent px-[10px] pt-2 pb-[6px]", s.tone)}
          >
            <p className="font-display text-lg leading-[22px] font-extrabold text-foreground">
              {s.v}
            </p>
            <p className="text-[11px] leading-[15px] font-semibold text-muted-foreground">
              {s.l}
            </p>
            <RoughBorder radius={14} roughness={0.9} />
          </div>
        ))}
      </div>
      {e.viewer.canManage ? (
        <Button asChild variant="ink" className="w-full">
          <Link to={`/my/events/${e.id}/manage`}>Управлять: участники и заявки</Link>
        </Button>
      ) : (
        <Button asChild variant="soft" className="w-full">
          <a href="#event-chat">
            <Icon name="event/icon-plus1" className="size-[18px]" />
            Задать вопрос организатору
          </a>
        </Button>
      )}
      {e.organization && (
        <Link to={`/orgs/${e.organization.id}`} className="self-start text-sm font-extrabold text-primary underline">
          Страница организации →
        </Link>
      )}
    </Card>
  );
}

function RouteMap({ m }: { m: EventModel }) {
  const e = m.event!;
  const point: [number, number] | null = e.lon != null && e.lat != null ? [e.lon, e.lat] : null;
  return (
    <Card className="relative h-[290px] shrink-0 overflow-hidden bg-mint-soft">
      {point ? (
        <LocationPicker value={point} className="absolute inset-0 rounded-none border-0" />
      ) : (
        <Img src="online.svg" className="top-0 left-0 h-full w-full object-cover" />
      )}
      <Badge variant="outline" className="absolute top-[18px] left-[18px] bg-card text-[13px] leading-[18px]">
        <Icon name="event/icon-route1" className="size-[14px]" />
        {e.format === "ONLINE" ? "Онлайн" : "Место встречи"}
      </Badge>
      <div className="absolute top-[228px] left-[18px] flex h-10 w-[455px] items-center justify-between gap-2">
        <Badge variant="outline" className="min-w-0 bg-card text-[13px] leading-[18px]">
          <Icon name="event/icon-pin1" className="size-[14px]" />
          <span className="truncate">{e.locationNote || e.address || "Ссылка появится после записи"}</span>
        </Badge>
      </div>
    </Card>
  );
}

function Chat({ m }: { m: EventModel }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; who: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canComment = m.event!.viewer.canComment;
  // «Ответить»: сразу в поле ввода — фокус и прокрутка к нему, без второго клика
  const reply = (id: string, who: string) => {
    setReplyTo({ id, who });
    input.current?.focus({ preventScroll: true });
    input.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const send = async () => {
    if (!text.trim()) return;
    try {
      await m.sendComment(text.trim(), replyTo?.id);
      setText("");
      setReplyTo(null);
    } catch {
      // текст ошибки — под полем
    }
  };
  return (
    <Card id="event-chat" className="h-[559px] shrink-0 gap-4 p-[26px]">
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <Icon name="event/icon-chat" className="size-[22px]" />
          <h2 className="font-display text-[22px] leading-[27px] font-bold text-foreground">Обсуждение</h2>
        </div>
        <span className="text-[13px] leading-[18px] font-bold text-muted-foreground">{m.comments.length} {plural(m.comments.length, ["сообщение", "сообщения", "сообщений"])}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
        {m.comments.length === 0 && (
          <EmptyState size="sm" icon={MessageCircleQuestion} tone="bg-sky" title="Пока тихо" text="Спросите о месте, уровне или снаряжении — организатор ответит здесь." />
        )}
        {m.comments.map((c) => (
          <div key={c.id} className="flex shrink-0 items-start gap-3">
            <Link to={`/users/${c.author.id}`} aria-label={fullName(c.author)} className="shrink-0">
              <Disc user={c.author} initials={initials(c.author)} tone="bg-sky" className="size-9 shrink-0" textClassName="text-xs leading-[17px]" />
            </Link>
            <div className={cn(
              "box-border min-w-0 max-w-[580px] break-words rounded-tl-[4px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] border-2 border-ink px-4 py-2.5",
              c.isOrganizer ? "bg-lime-soft" : "bg-card",
            )}>
              <p className="text-[13px] leading-[18px]">
                <span className="font-extrabold text-foreground">{fullName(c.author)} </span>
                {c.isOrganizer && <Badge className="mx-1 h-5 bg-secondary px-2 text-[11px] text-foreground">Организатор</Badge>}
                <span className="font-semibold text-muted-foreground">
                  · {new Date(c.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {c.editedAt && " · изменено"}
                </span>
              </p>
              {c.replyTo && (
                <p className="mt-1 border-l-2 border-ink pl-2 text-[13px] text-muted-foreground">
                  {fullName(c.replyTo.author)}: {c.replyTo.deleted ? "сообщение удалено" : c.replyTo.text}
                </p>
              )}
              <p className="mt-0.5 text-[15px] leading-[22px] font-medium text-foreground">
                {c.deleted ? <span className="text-muted-foreground italic">Сообщение удалено</span> : c.text}
              </p>
              {canComment && !c.deleted && (
                <button type="button" className="mt-1 text-xs font-bold text-muted-foreground underline"
                  onClick={() => reply(c.id, fullName(c.author))}>Ответить</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {canComment ? (
        <form className="flex shrink-0 flex-col gap-2"
          onSubmit={(event) => { event.preventDefault(); void send(); }}>
          {replyTo && (
            <p className="text-sm font-semibold text-muted-foreground">
              Ответ для {replyTo.who} <button type="button" className="underline" onClick={() => setReplyTo(null)}>отменить</button>
            </p>
          )}
          <div className="box-border flex h-12 items-center gap-[10px] rounded-pill border-2 border-ink bg-background pr-1.5 pl-5">
            <input ref={input} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} aria-label="Сообщение"
              placeholder="Задайте вопрос или напишите участникам" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            <Button type="submit" size="sm" disabled={!text.trim() || m.commentPending}>Отправить</Button>
          </div>
          {m.commentError && <p role="alert" className="text-sm font-bold text-destructive">{m.commentError}</p>}
        </form>
      ) : (
        <div className="box-border flex min-h-12 shrink-0 items-center gap-[10px] rounded-pill border-2 border-dashed border-ink bg-background px-5">
          <Icon name="event/icon-lock" className="size-[18px]" />
          <span className="text-sm leading-[19px] font-semibold whitespace-nowrap text-muted-foreground">
            Обсуждение закрыто
          </span>
        </div>
      )}
    </Card>
  );
}

function Going({ m }: { m: EventModel }) {
  const e = m.event!;
  return <EventGoingCrowd participants={m.crowd} going={m.going} capacity={e.capacity} />;
}

export default function EventPage() {
  const m = useEvent();
  return (
    <>
    <EventMobile m={m} />
    <div className="relative isolate hidden min-h-dvh overflow-clip bg-background lg:block">
      <MemphisBackground seed="event" />
      <AppHeader current="feed" />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-7 px-8 pt-8 pb-12">
        <TopBar m={m} />
        {m.query.isPending && <p className="w-[1216px] text-lg font-semibold text-muted-foreground">Загружаем событие…</p>}
        {m.query.isError && (
          <p role="alert" className="w-[1216px] text-lg font-semibold text-destructive">
            {m.query.error?.detail ?? "Событие не найдено"}
          </p>
        )}
        {m.moderated && (
          <div role="alert" className="w-[1216px] rounded-[22px] border-2 border-ink bg-destructive px-6 py-4 text-destructive-foreground">
            <p className="font-display text-lg font-bold">{m.moderated.title}</p>
            {m.moderated.reason && <p className="mt-1 text-base font-semibold">Причина: {m.moderated.reason}</p>}
          </div>
        )}
        {m.event?.viewer.organizerInvite && (
          <div role="status" className="flex w-[1216px] items-center gap-5 rounded-[22px] border-2 border-ink bg-lime-soft px-6 py-4 shadow-hard-sm">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-foreground">Вас зовут в организаторы</p>
              <p className="mt-1 text-base font-semibold text-muted-foreground">
                {fullName(m.event.author)} приглашает вести встречу вместе: править карточку и решать заявки.
              </p>
            </div>
            <InviteActions eventId={m.event.id} />
          </div>
        )}
        {m.event && (
          <>
            <TicketHero m={m} />
            <div className="grid w-[1216px] shrink-0 grid-cols-[701px_495px] items-start gap-5">
              <div className="flex min-w-0 flex-col gap-5">
                <About m={m} />
                <Chat m={m} />
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <Organizer m={m} />
                <RouteMap m={m} />
                <Going m={m} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
    </>
  );
}
