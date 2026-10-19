import { useState } from "react";
import { Link } from "react-router";
import { EventMobile } from "./event-mobile";
import { fullName, initials, useEvent } from "../model/use-event";
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
import { toast } from "@/shared/lib/toast";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

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
const GOING_LEFT = [0, 114, 227.5, 341.5];
const TAKE_TONES = ["bg-lime-soft", "bg-lavender-soft", "bg-sky-soft", "bg-mint-soft"];

function Img({ src, className }: { src: string; className?: string }) {
  return <img src={`/event/${src}`} alt="" className={cn("absolute max-w-none", className)} />;
}

function TopBar() {
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Ссылка скопирована");
    } catch {
      toast.info(window.location.href);
    }
  };
  return (
    <div className="flex h-10 w-[1216px] shrink-0 items-center justify-between">
      <Button asChild variant="soft" className="h-10 px-[18px] text-sm leading-[19px]">
        <Link to="/feed">
          <Icon name="event/icon-back" className="size-[18px]" />К ленте
        </Link>
      </Button>
      <div className="flex h-10 w-[148px] items-start">
        <Button variant="soft" className="h-10 shrink-0 px-[18px] text-sm leading-[19px]" onClick={() => void share()}>
          <Icon name="event/icon-share" className="size-[18px]" />
          Поделиться
        </Button>
      </div>
    </div>
  );
}

/** Кнопка записи по блоку viewer: записаться, подать заявку, отменить или причина, почему нельзя. */
function RegisterAction({ m, className, hintClassName }: { m: EventModel; className: string; hintClassName: string }) {
  const viewer = m.event!.viewer;
  const active = viewer.registrationStatus === "CONFIRMED" || viewer.registrationStatus === "PENDING";
  const hint = m.actionError ?? (m.status && active ? m.status.label : viewer.canRegister
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
      <p role={m.actionError ? "alert" : undefined} className={hintClassName}>{hint}</p>
    </>
  );
}

function TicketHero({ m }: { m: EventModel }) {
  const e = m.event!;
  const cover = e.photos[0]?.url ?? e.sport.imageUrl;
  return (
    // Тень — drop-shadow на обёртке (box-shadow маска срезала бы целиком). Внешняя обёртка
    // шире на тень и вырезает те же дыры уже из тени, чтобы сквозь вырез был виден фон.
    <div className="-mr-[6px] -mb-[6px] h-[406px] w-[1222px] shrink-0" style={notchMask(TICKET_HEIGHT)}>
    <div className="relative h-[400px] w-[1216px] drop-shadow-[6px_6px_0_var(--ink)]">
    <Card className="relative h-[400px] w-[1216px] flex-row items-start overflow-hidden rounded-[28px] p-0" style={notchMask(TICKET_HEIGHT)}>
      <div className="relative h-[396px] w-[270px] shrink-0 overflow-hidden border-r-2 border-ink">
        <img src={cover} alt="" className="absolute top-0 left-0 h-[396px] w-[268px] object-cover" />
        <div className="absolute top-0 left-0 h-[396px] w-[268px] bg-gradient-to-b from-[rgba(22,24,31,0.05)] via-[rgba(22,24,31,0.15)] via-55% to-[rgba(22,24,31,0.7)]" />
        <div className="absolute top-[18px] left-[18px] flex gap-[6px]">
          <Badge variant="outline">{e.sport.name}</Badge>
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
              <p className="absolute top-[23px] left-5 w-[175px] truncate font-display text-[19px] leading-6 font-bold text-foreground">
                {f.value}
              </p>
              <p className="absolute top-[51px] left-5 w-[175px] text-[13px] leading-[18px] font-semibold text-muted-foreground">
                <span className="block truncate">{f.lines[0]}</span>
                <span className="block truncate">{f.lines[1]}</span>
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
          № 0124
        </span>
        {/* штамп организатора: запись подтверждена */}
        <div className="pointer-events-none absolute top-[220px] left-[34px] h-[66px] w-[178px] rotate-[9deg] text-primary">
          <img src="/event/stamp-admitted.svg" alt="" className="absolute inset-0 size-full max-w-none" />
          <p className="absolute inset-x-0 top-3 text-center font-display text-[20px] font-extrabold">ДОПУЩЕН</p>
          <p className="absolute inset-x-0 top-10 text-center text-[9px] font-extrabold tracking-[1px]">
            орг. Дима К. · 18.10
          </p>
        </div>
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
              hintClassName="absolute top-[64px] left-0 w-full truncate text-center text-xs leading-[17px] font-semibold text-foreground" />
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
  const note = e.viewer.canSeePrivateDetails && e.privateDetails
    ? e.privateDetails
    : "Запишись — и здесь появятся детали для участников";
  return (
    <Card className="absolute top-0 left-0 h-[286.5px] w-[701px] overflow-hidden">
      <h2 className="absolute top-7 left-7 font-display text-[22px] leading-[27px] font-bold text-foreground">
        О встрече
      </h2>
      <p className="absolute top-[70px] left-7 line-clamp-2 w-[513px] text-base leading-[25.5px] font-medium text-foreground">
        {e.description || "Организатор не добавил описание — спросите в обсуждении."}
      </p>
      {e.requirements && (
        <p className="absolute top-[131px] left-7 line-clamp-2 w-[320px] text-base leading-[25.5px] font-medium text-muted-foreground">
          {e.requirements}
        </p>
      )}
      {take.length > 0 && (
        <>
          <Eyebrow className="absolute top-[203.5px] left-7">ЧТО ВЗЯТЬ</Eyebrow>
          <div className="absolute top-[228.5px] left-7 flex gap-2">
            {take.map((t, i) => (
              <Badge key={t} className={cn("text-[13px] leading-[18px] text-foreground", TAKE_TONES[i])}>
                {t}
              </Badge>
            ))}
          </div>
        </>
      )}
      <Img src="wave.png" className="top-[164.5px] left-[557px] h-[118px] w-[114px] object-cover" />
      <div className="absolute top-36 left-[349px] box-border h-[68.5px] w-[200px] rounded-[18px] border-2 border-ink bg-card">
        <p className="absolute top-2 left-4 line-clamp-2 w-[168px] text-sm leading-[20.5px] font-semibold text-foreground" title={note}>
          {note}
        </p>
        <span className="absolute top-[19px] left-[188px] box-border size-5 border-r-2 border-b-2 border-ink bg-card" />
      </div>
    </Card>
  );
}

function Organizer({ m }: { m: EventModel }) {
  const e = m.event!;
  return (
    <Card className="absolute top-0 left-[721px] h-[286.5px] w-[495px] overflow-hidden bg-sky-soft">
      <div className="absolute top-[22px] left-[22px] flex h-14 w-[447px] items-center gap-[14px]">
        <Link to={`/users/${e.author.id}`} aria-label={fullName(e.author)} className="shrink-0">
          <Disc
            initials={e.organization ? e.organization.name.slice(0, 2).toUpperCase() : initials(e.author)}
            user={e.organization ? undefined : e.author}
            tone="bg-sky"
            className="size-14"
            textClassName="text-[19px] leading-[26px] tracking-[-0.5px]"
          />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[17px] leading-[23px] font-extrabold text-foreground">{m.organizerName}</p>
          <p className="truncate text-[13px] leading-[18px] font-medium text-muted-foreground">
            {e.organization ? `Организация · ведёт ${fullName(e.author)}` : `Организатор${e.author.city ? ` · ${e.author.city}` : ""}`}
          </p>
        </div>
      </div>
      <div className="absolute top-24 left-[22px] flex h-[61px] w-[447px] gap-2">
        {[
          { v: String(m.going), l: "записались", tone: "bg-lime-soft" },
          { v: String(e.organizers.length), l: "организаторов", tone: "bg-background" },
        ].map((s) => (
          <div
            key={s.l}
            className={cn("relative h-[61px] w-[219.5px] rounded-[14px] border-2 border-transparent", s.tone)}
          >
            <p className="absolute top-[10px] left-3 font-display text-lg leading-[22px] font-extrabold text-foreground">
              {s.v}
            </p>
            <p className="absolute top-8 left-3 text-[11px] leading-[15px] font-semibold text-muted-foreground">
              {s.l}
            </p>
            <RoughBorder radius={14} roughness={0.9} />
          </div>
        ))}
      </div>
      <Button asChild variant="soft" className="absolute top-[173px] left-[22px] w-[447px]">
        <a href="#event-chat">
          <Icon name="event/icon-plus1" className="size-[18px]" />
          Задать вопрос организатору
        </a>
      </Button>
    </Card>
  );
}

function RouteMap({ m }: { m: EventModel }) {
  const e = m.event!;
  const point: [number, number] | null = e.lon != null && e.lat != null ? [e.lon, e.lat] : null;
  return (
    <Card className="absolute top-[306.5px] left-[721px] h-[290px] w-[495px] overflow-hidden bg-mint-soft">
      {point ? (
        <LocationPicker value={point} className="absolute inset-0 rounded-none border-0" />
      ) : (
        <Img src="memphis1.svg" className="top-0 left-0 h-[300px] w-[620px]" />
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
        {point && (
          <Button asChild variant="soft" className="h-10 shrink-0 px-[18px] text-sm leading-[19px]">
            <a href={`https://2gis.ru/geo/${point[0]},${point[1]}`} target="_blank" rel="noreferrer">Открыть карту</a>
          </Button>
        )}
      </div>
    </Card>
  );
}

function Chat({ m }: { m: EventModel }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; who: string } | null>(null);
  const canComment = m.event!.viewer.canComment;
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
    <Card id="event-chat" className="absolute top-[306.5px] left-0 h-[559px] w-[701px] overflow-hidden">
      <div className="absolute top-[26px] left-[26px] flex h-[27px] w-[645px] items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <Icon name="event/icon-chat" className="size-[22px]" />
          <h2 className="font-display text-[22px] leading-[27px] font-bold text-foreground">Обсуждение</h2>
        </div>
        <span className="text-[13px] leading-[18px] font-bold text-muted-foreground">{m.comments.length} сообщений</span>
      </div>
      <div className="absolute top-[69px] left-[26px] flex h-[330px] w-[645px] flex-col gap-3 overflow-y-auto pr-2">
        {m.comments.length === 0 && (
          <p className="text-[15px] font-medium text-muted-foreground">Пока тихо. Спросите о месте, уровне или снаряжении — организатор ответит здесь.</p>
        )}
        {m.comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            <Link to={`/users/${c.author.id}`} aria-label={fullName(c.author)} className="shrink-0">
              <Disc user={c.author} initials={initials(c.author)} tone="bg-sky" className="size-9 shrink-0" textClassName="text-xs leading-[17px]" />
            </Link>
            <div className={cn(
              "box-border max-w-[580px] rounded-tl-[4px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px] border-2 border-ink px-4 py-2.5",
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
                  onClick={() => setReplyTo({ id: c.id, who: fullName(c.author) })}>Ответить</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {canComment ? (
        <form className="absolute top-[414px] left-[26px] flex w-[645px] flex-col gap-2"
          onSubmit={(event) => { event.preventDefault(); void send(); }}>
          {replyTo && (
            <p className="text-sm font-semibold text-muted-foreground">
              Ответ для {replyTo.who} <button type="button" className="underline" onClick={() => setReplyTo(null)}>отменить</button>
            </p>
          )}
          <div className="box-border flex h-12 items-center gap-[10px] rounded-pill border-2 border-ink bg-background pr-1.5 pl-5">
            <input value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} aria-label="Сообщение"
              placeholder="Задайте вопрос или напишите участникам" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            <Button type="submit" size="sm" disabled={!text.trim() || m.commentPending}>Отправить</Button>
          </div>
          {m.commentError && <p role="alert" className="text-sm font-bold text-destructive">{m.commentError}</p>}
        </form>
      ) : (
        <div className="absolute top-[414px] left-[26px] box-border flex h-12 w-[645px] items-center gap-[10px] rounded-pill border-2 border-dashed border-ink bg-background px-5">
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
  const shown = e.participants.slice(0, e.participants.length > 8 ? 7 : 8);
  const rest = m.going - shown.length;
  return (
    <Card className="absolute top-[616.5px] left-[721px] h-[249px] w-[495px] overflow-hidden">
      <div className="absolute top-6 left-6 flex h-[25px] w-[443px] items-center justify-between">
        <h2 className="font-display text-xl leading-[25px] font-bold text-foreground">Кто идёт</h2>
        <span className="text-[13px] leading-[18px] font-bold text-muted-foreground">
          {m.going}{e.capacity != null ? ` из ${e.capacity}` : ""}
        </span>
      </div>
      <div className="absolute top-[67px] left-6 h-[154px] w-[443px]">
        {shown.length === 0 && <p className="text-sm font-semibold text-muted-foreground">Пока никого — будьте первым.</p>}
        {shown.map((g, i) => (
          <Link
            key={g.id}
            to={`/users/${g.id}`}
            className="absolute flex h-[71px] w-[102px] flex-col items-center gap-[6px]"
            style={{ left: GOING_LEFT[i % 4], top: i < 4 ? 0 : 83 }}
          >
            <Disc
              initials={initials(g)}
              user={g}
              tone={TONES[i % TONES.length]}
              className="size-12"
              textClassName="text-base leading-[22px] tracking-[-0.5px]"
            />
            <span className="max-w-[100px] truncate text-xs leading-[17px] font-bold text-foreground">{g.firstName || g.username}</span>
          </Link>
        ))}
        {rest > 0 && (
          <div
            className="absolute flex h-[71px] w-[102px] flex-col items-center gap-[6px]"
            style={{ left: 341.5, top: 83 }}
          >
            <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-ink text-sm leading-[19px] font-extrabold text-foreground">
              +{rest}
            </span>
            <span className="text-xs leading-[17px] font-bold text-muted-foreground">ещё</span>
          </div>
        )}
      </div>
    </Card>
  );
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
        <TopBar />
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
        {m.event && (
          <>
            <TicketHero m={m} />
            <div className="relative h-[865.5px] w-[1216px] shrink-0">
              <About m={m} />
              <Organizer m={m} />
              <RouteMap m={m} />
              <Chat m={m} />
              <Going m={m} />
            </div>
          </>
        )}
      </main>
    </div>
    </>
  );
}
