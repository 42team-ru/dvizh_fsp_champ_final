import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { toast } from "@/shared/lib/toast";
import { cn } from "cn";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { LocationPicker } from "@/widgets/events-map/ui/location-picker";
import { fullName, initials, type useEvent } from "../model/use-event";

const dir = "m-event";
const TONES = ["bg-sky", "bg-mint", "bg-peach", "bg-secondary", "bg-lavender-soft"];
const TAKE_TONES = ["bg-sky-soft", "bg-lime-soft", "bg-peach", "bg-lavender-soft"];

type EventModel = ReturnType<typeof useEvent>;

function CircleButton({
  label,
  icon,
  className,
  to,
  onClick,
}: {
  label: string;
  icon: string;
  className: string;
  to?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "absolute top-4 box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card",
    className
  );
  const img = <Icon name={`${dir}/${icon}`} className="size-5" />;
  return to ? (
    <Link to={to} aria-label={label} className={cls}>
      {img}
    </Link>
  ) : (
    <button type="button" aria-label={label} className={cls} onClick={onClick}>
      {img}
    </button>
  );
}

function IconRow({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="box-border flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-lavender-soft">
        <Icon name={`${dir}/${icon}`} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px leading-[normal] whitespace-nowrap">
        <span className="text-[10px] font-extrabold tracking-[1px] text-muted-foreground">
          {label}
        </span>
        <span className="overflow-hidden text-[15px] font-extrabold text-ellipsis text-foreground">{value}</span>
        <span className="overflow-hidden text-xs font-medium text-ellipsis text-muted-foreground">
          {hint}
        </span>
      </div>
    </div>
  );
}

function MobileChat({ m }: { m: EventModel }) {
  const [text, setText] = useState("");
  const canComment = m.event!.viewer.canComment;
  return (
    <Card className="gap-[10px] rounded-[22px] p-[18px]">
      <div className="flex items-center justify-between leading-[normal] font-bold whitespace-nowrap">
        <h2 className="font-display text-[17px] text-foreground">Обсуждение</h2>
        <span className="text-[13px] text-muted-foreground">{m.comments.length} сообщений</span>
      </div>
      {m.comments.length === 0 && <p className="text-[13px] font-medium text-muted-foreground">Спросите о месте или снаряжении — организатор ответит здесь.</p>}
      {m.comments.map((c, i) => (
        <div key={c.id} className="flex items-start gap-2">
          <Disc initials={initials(c.author)} tone={TONES[i % TONES.length]} className="size-8 shrink-0" textClassName="text-xs leading-[normal]" />
          <div className={cn(
            "box-border flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] border-[1.5px] border-ink px-3 py-2",
            c.isOrganizer ? "bg-lime-soft" : "bg-sky-soft",
          )}>
            <span className="text-[11px] leading-[normal] font-bold text-muted-foreground">
              {fullName(c.author)}{c.isOrganizer && " · Организатор"} · {new Date(c.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {c.replyTo && <span className="border-l-2 border-ink pl-2 text-xs text-muted-foreground">{fullName(c.replyTo.author)}: {c.replyTo.text}</span>}
            <span className="text-[13px] leading-[18px] font-medium text-foreground">
              {c.deleted ? "Сообщение удалено" : c.text}
            </span>
          </div>
        </div>
      ))}
      {canComment ? (
        <form className="flex items-center gap-2 rounded-[14px] border-2 border-ink px-[14px] py-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) void m.sendComment(text.trim()).then(() => setText("")).catch(() => undefined);
          }}>
          <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Сообщение" maxLength={2000}
            placeholder="Задать вопрос" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <Button type="submit" size="sm" disabled={!text.trim() || m.commentPending}>→</Button>
        </form>
      ) : (
        <div className="box-border flex items-center gap-[10px] rounded-[14px] border-2 border-dashed border-muted-foreground px-[14px] py-3">
          <Icon name={`${dir}/icon-lock`} className="size-[18px] shrink-0" />
          <p className="flex-1 text-xs leading-[17px] font-bold text-muted-foreground">Обсуждение закрыто</p>
        </div>
      )}
      {m.commentError && <p role="alert" className="text-xs font-bold text-destructive">{m.commentError}</p>}
    </Card>
  );
}

export function EventMobile({ m }: { m: EventModel }) {
  const e = m.event;
  if (!e) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 lg:hidden">
        <p role={m.query.isError ? "alert" : undefined} className="text-base font-semibold text-muted-foreground">
          {m.query.isError ? m.query.error?.detail ?? "Событие не найдено" : "Загружаем событие…"}
        </p>
      </div>
    );
  }
  const viewer = e.viewer;
  const active = viewer.registrationStatus === "CONFIRMED" || viewer.registrationStatus === "PENDING";
  const point: [number, number] | null = e.lon != null && e.lat != null ? [e.lon, e.lat] : null;
  const take = (e.equipment ?? "").split(/[,\n;]/).map((t) => t.trim()).filter(Boolean);
  const free = e.capacity != null ? Math.max(0, e.capacity - m.going) : null;
  const share = () => navigator.clipboard.writeText(window.location.href).then(() => toast.success("Ссылка скопирована"), () => undefined);
  return (
    <div className="relative isolate flex min-h-dvh overflow-clip flex-col gap-4 bg-background pb-[100px] lg:hidden">
      <MemphisBackground variant="mobile" seed="event" />
      <div className="relative h-[230px] w-full shrink-0 overflow-hidden bg-sky">
        <img
          src={e.photos[0]?.url ?? e.sport.imageUrl}
          alt=""
          className="absolute top-0 left-0 size-full max-w-none object-cover"
        />
        <CircleButton label="Назад" icon="icon-back" to="/feed" className="left-4" />
        <CircleButton label="Поделиться" icon="icon-share" className="right-4" onClick={() => void share()} />
        <Badge
          variant="outline"
          className="absolute top-[188px] left-4 h-auto border-[1.5px] bg-card px-[10px] py-1 text-[11px] leading-[normal] font-extrabold tracking-[1px]"
        >
          {e.sport.name.toUpperCase()}
        </Badge>
        <span className="absolute top-[192px] right-4 rounded-pill bg-ink px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
          {m.levelLabel.toUpperCase()}
        </span>
      </div>

      {m.moderated && (
        <div role="alert" className="mx-4 rounded-[20px] border-2 border-ink bg-destructive px-4 py-3 text-destructive-foreground">
          <p className="font-display text-base font-bold">{m.moderated.title}</p>
          {m.moderated.reason && <p className="mt-1 text-sm font-semibold">Причина: {m.moderated.reason}</p>}
        </div>
      )}

      <h1 className="px-4 font-display text-2xl leading-[31px] font-extrabold text-foreground">{e.title}</h1>

      <div className="px-4">
        <div className="box-border flex w-full items-center gap-3 rounded-[20px] border-2 border-ink bg-card p-3">
          <Disc
            initials={e.organization ? e.organization.name.slice(0, 2).toUpperCase() : initials(e.author)}
            tone="bg-sky"
            className="size-12 shrink-0"
            textClassName="text-[15px] leading-[normal]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal] whitespace-nowrap">
            <span className="overflow-hidden text-[15px] font-extrabold text-ellipsis text-foreground">{m.organizerName}</span>
            <span className="overflow-hidden text-xs font-medium text-ellipsis text-muted-foreground">
              Организатор{e.author.city ? ` · ${e.author.city}` : ""}
            </span>
          </div>
          <Button asChild variant="soft" className="h-10 w-[112px] shrink-0 px-5 text-xs">
            <a href="#event-chat-mobile">Спросить</a>
          </Button>
        </div>
      </div>

      <div className="px-4">
        <div className="box-border w-full overflow-hidden rounded-[26px] border-2 border-ink bg-primary shadow-[4px_4px_0_var(--ink)]">
          <div className="flex flex-col gap-[6px] px-5 pt-[18px] pb-3">
            <Badge
              variant="secondary"
              className="h-auto w-fit border-[1.5px] px-[10px] py-1 text-[9px] leading-[normal] font-extrabold tracking-[1px]"
            >
              {m.kindLabel.toUpperCase()} · № {e.id.slice(0, 4).toUpperCase()}
            </Badge>
            <p className="font-display text-[28px] leading-[normal] font-extrabold whitespace-nowrap text-white">
              {m.joinLabel}
            </p>
          </div>
          <div className="relative h-[22px]">
            <img
              src={`/${dir}/dash.svg`}
              alt=""
              className="absolute top-[10px] right-[29px] left-[29px] h-[2px] w-[calc(100%-58px)] max-w-none"
            />
            <span className="absolute top-0 left-[-11px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-background" />
            <span className="absolute top-0 right-[-11px] box-border size-[22px] rounded-[11px] border-2 border-ink bg-background" />
          </div>
          <div className="flex flex-col gap-3 bg-card px-5 pt-[6px] pb-[18px]">
            {m.facts.slice(0, 2).map((f) => (
              <IconRow key={f.label} icon={f.icon} label={f.label} value={`${f.value}${f.label === "КОГДА" ? ` · ${f.lines[0]}` : ""}`}
                hint={f.label === "КОГДА" ? f.lines[1] : f.lines.filter(Boolean).join(" · ")} />
            ))}
            {viewer.canSeePrivateDetails && (e.privateDetails || e.onlineUrl) && (
              <p className="rounded-xl border-2 border-dashed border-ink px-3 py-2 text-xs leading-[17px] font-bold text-foreground">
                {e.privateDetails}{e.onlineUrl && <> <a href={e.onlineUrl} className="underline">{e.onlineUrl}</a></>}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-4">
        <div className="box-border flex min-w-0 flex-1 flex-col gap-1 rounded-[22px] border-2 border-ink bg-secondary p-4 text-foreground">
          <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap">
            {m.facts[2]?.label}
          </span>
          <span className="font-display text-[20px] leading-[normal] font-extrabold">{m.facts[2]?.value}</span>
          <span className="text-xs leading-4 font-bold">{m.facts[2]?.lines.join(", ")}</span>
        </div>
        <div className="box-border flex min-w-0 flex-1 flex-col items-start gap-2 rounded-[22px] border-2 border-ink bg-card p-4">
          <Eyebrow className="text-[10px] tracking-[1.2px]">КТО ИДЁТ</Eyebrow>
          <span className="font-display text-[22px] leading-[normal] font-extrabold whitespace-nowrap text-foreground">
            {m.going}{e.capacity != null ? `/${e.capacity}` : ""}
          </span>
          <span className="flex items-center">
            {e.participants.slice(0, 4).map((g, i) => (
              <Disc
                key={g.id}
                initials={initials(g)}
                tone={TONES[i % TONES.length]}
                className={cn("size-7", i < 3 && "mr-[-8px]")}
                textClassName="text-xs leading-[normal]"
              />
            ))}
          </span>
          <Progress value={m.percent} className="w-[120px] bg-card" />
        </div>
      </div>

      <div className="px-4">
        <Card className="gap-3 rounded-[22px] p-[18px]">
          <div className="flex items-center gap-[10px]">
            <h2 className="font-display text-[17px] leading-[normal] font-bold whitespace-nowrap text-foreground">
              О встрече
            </h2>
            <img src={`/${dir}/img.png`} alt="" className="ml-auto size-14 object-contain" />
          </div>
          <p className="text-sm leading-[21px] font-medium text-foreground">
            {e.description || "Организатор не добавил описание — спросите в обсуждении."}
          </p>
          {e.requirements && <p className="text-sm leading-[21px] font-medium text-muted-foreground">{e.requirements}</p>}
          {take.length > 0 && (
            <>
              <Eyebrow className="text-[10px] tracking-[1.2px]">ЧТО ВЗЯТЬ</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {take.map((t, i) => (
                  <span
                    key={t}
                    className={cn(
                      "rounded-pill border-[1.5px] border-ink px-[14px] py-2 text-[13px] leading-[normal] font-bold whitespace-nowrap text-foreground",
                      TAKE_TONES[i % TAKE_TONES.length]
                    )}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {point && (
        <div className="px-4">
          <Card className="overflow-hidden rounded-[22px]">
            <div className="relative h-[150px] shrink-0 overflow-hidden bg-photo-map">
              <LocationPicker value={point} className="size-full rounded-none border-0" />
            </div>
            <div className="flex items-center gap-3 px-4 py-[14px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal] whitespace-nowrap">
                <span className="font-display text-[15px] font-bold text-foreground">Место встречи</span>
                <span className="overflow-hidden text-[13px] font-medium text-ellipsis text-muted-foreground">
                  {e.locationNote || e.address}
                </span>
              </div>
              <Button asChild variant="soft" className="h-11 w-[92px] shrink-0 gap-2 px-5 text-[13px]">
                <a href={`https://2gis.ru/geo/${point[0]},${point[1]}`} target="_blank" rel="noreferrer">
                  <Icon name={`${dir}/icon-map`} className="size-[18px]" />
                  Карта
                </a>
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="px-4">
        <Card className="gap-[14px] rounded-[22px] p-[18px]">
          <div className="flex items-center justify-between leading-[normal] font-bold whitespace-nowrap">
            <h2 className="font-display text-[17px] text-foreground">Кто идёт</h2>
            <span className="text-[13px] text-muted-foreground">{m.going}{e.capacity != null ? ` из ${e.capacity}` : ""}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {e.participants.length === 0 && <p className="text-[13px] font-medium text-muted-foreground">Пока никого — будьте первым.</p>}
            {e.participants.map((g, i) => (
              <div key={g.id} className="flex w-[46px] flex-col items-center gap-1">
                <Disc
                  initials={initials(g)}
                  tone={TONES[i % TONES.length]}
                  className="size-[46px]"
                  textClassName="text-xs leading-[normal]"
                />
                <span className="max-w-[46px] truncate text-[11px] leading-[normal] font-bold text-muted-foreground">
                  {g.firstName || g.username}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div id="event-chat-mobile" className="px-4">
        <MobileChat m={m} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex h-[100px] items-center justify-between gap-3 border-t-2 border-ink bg-card px-4 pt-3 pb-[26px] lg:hidden">
        <div className="flex min-w-0 flex-col gap-[2px] leading-[normal] font-bold">
          <span className="truncate font-display text-[17px] text-foreground">{m.status && active ? m.status.label : m.joinLabel}</span>
          <span className="truncate text-xs text-accent">
            {m.actionError ?? (m.moderated ? "Запись закрыта" : !viewer.canRegister && !active
              ? viewer.registerBlockedReason ?? (viewer.isOrganizer ? "Вы организатор" : "")
              : free != null ? `осталось ${free} мест` : "мест без лимита")}
          </span>
        </div>
        {m.moderated ? null : active && viewer.canCancel ? (
          <Button variant="soft" className="h-14 w-[180px] shrink-0 px-5 text-base" disabled={m.busy} onClick={m.cancel}>
            {viewer.registrationStatus === "PENDING" ? "Отозвать" : "Отменить"}
          </Button>
        ) : (
          <Button className="h-14 w-[180px] shrink-0 px-5 text-base" disabled={!viewer.canRegister || m.busy} onClick={m.register}>
            {e.joinMode === "REQUEST" ? "Подать заявку" : "Записаться"}
          </Button>
        )}
      </div>
    </div>
  );
}
