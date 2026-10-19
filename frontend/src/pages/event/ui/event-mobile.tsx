import { Link } from "react-router";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "cn";

const dir = "m-event";

const GOING = [
  { i: "ДК", name: "Дима", tone: "bg-sky" },
  { i: "ЛП", name: "Лера", tone: "bg-mint" },
  { i: "МС", name: "Макс", tone: "bg-peach" },
  { i: "КЕ", name: "Катя", tone: "bg-secondary" },
  { i: "ТС", name: "Тёма", tone: "bg-lavender-soft" },
  { i: "РМ", name: "Рома", tone: "bg-sky" },
];

const MESSAGES = [
  { i: "ДК", tone: "bg-sky", bubble: "bg-sky-soft", who: "Дима", time: "10:12", text: "Собираемся у таблички с картой острова, жду до 9:05." },
  { i: "ЛП", tone: "bg-mint", bubble: "bg-lime-soft", who: "Лера", time: "11:40", text: "Можно с собакой? Она спокойная и бегает рядом." },
  { i: "ДК", tone: "bg-sky", bubble: "bg-sky-soft", who: "Дима", time: "11:52", text: "Конечно, только на поводке у моста — там велосипедисты." },
];

const TAKE = [
  { label: "Вода", tone: "bg-sky-soft" },
  { label: "Светоотражатели", tone: "bg-lime-soft" },
  { label: "Удобные кроссовки", tone: "bg-peach" },
  { label: "Ветровка", tone: "bg-lavender-soft" },
];

function CircleButton({
  label,
  icon,
  className,
  to,
}: {
  label: string;
  icon: string;
  className: string;
  to?: string;
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
    <button type="button" aria-label={label} className={cls}>
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
        <span className="text-[15px] font-extrabold text-foreground">{value}</span>
        <span className="overflow-hidden text-xs font-medium text-ellipsis text-muted-foreground">
          {hint}
        </span>
      </div>
    </div>
  );
}

export function EventMobile() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-background pb-[100px] lg:hidden">
      <div className="relative h-[230px] w-full shrink-0 overflow-hidden bg-sky">
        <img
          src={`/${dir}/photo-decor.svg`}
          alt=""
          className="absolute top-0 left-0 size-full max-w-none object-cover"
        />
        <CircleButton label="Назад" icon="icon-back" to="/feed" className="left-4" />
        <CircleButton label="Поделиться" icon="icon-share" className="right-[68px]" />
        <CircleButton label="В избранное" icon="icon-heart" className="right-4" />
        <Badge
          variant="outline"
          className="absolute top-[188px] left-4 h-auto border-[1.5px] bg-card px-[10px] py-1 text-[11px] leading-[normal] font-extrabold tracking-[1px]"
        >
          БЕГ
        </Badge>
        <span className="absolute top-[192px] left-[76px] rounded-pill bg-ink px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px] whitespace-nowrap text-secondary">
          СРЕДНИЙ УРОВЕНЬ
        </span>
      </div>

      <h1 className="px-4 font-display text-2xl leading-[31px] font-extrabold text-foreground">
        Пробежка вокруг Татышева
      </h1>

      <div className="px-4">
        <div className="box-border flex w-full items-center gap-3 rounded-[20px] border-2 border-ink bg-card p-3">
          <Disc
            initials="ДК"
            tone="bg-sky"
            className="size-12 shrink-0"
            textClassName="text-[15px] leading-[normal]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal] whitespace-nowrap">
            <span className="text-[15px] font-extrabold text-foreground">Дима Ковалёв</span>
            <span className="overflow-hidden text-xs font-medium text-ellipsis text-muted-foreground">
              Организатор · 14 пробежек · ★ 4,9
            </span>
          </div>
          <Button variant="soft" className="h-10 w-[112px] shrink-0 px-5 text-xs">
            Подписаться
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
              БИЛЕТ НА ТРЕНИРОВКУ · № 0124
            </Badge>
            <p className="font-display text-[28px] leading-[normal] font-extrabold whitespace-nowrap text-white">
              Бесплатно
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
            <IconRow
              icon="icon-clock"
              label="КОГДА"
              value="Сб, 24 окт · 9:00–10:30"
              hint="через 5 дней"
            />
            <IconRow
              icon="icon-pin"
              label="ГДЕ"
              value="о. Татышев"
              hint="вход с Коммунального моста · 1,8 км"
            />
            <div className="flex items-center gap-3">
              <img src={`/${dir}/qr.svg`} alt="" className="size-14 shrink-0" />
              <p className="flex-1 text-xs leading-[17px] font-bold text-muted-foreground">
                Покажи QR у входа — организатор отметит тебя.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-4">
        <div className="box-border flex min-w-0 flex-1 flex-col gap-1 rounded-[22px] border-2 border-ink bg-secondary p-4 text-foreground">
          <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.2px] whitespace-nowrap">
            МАРШРУТ
          </span>
          <span className="font-display text-[26px] leading-[normal] font-extrabold whitespace-nowrap">
            8 км
          </span>
          <span className="text-xs leading-4 font-bold">темп 5:30–6:00 /км, круг по острову</span>
        </div>
        <div className="box-border flex min-w-0 flex-1 flex-col items-start gap-2 rounded-[22px] border-2 border-ink bg-card p-4">
          <Eyebrow className="text-[10px] tracking-[1.2px]">КТО ИДЁТ</Eyebrow>
          <span className="font-display text-[22px] leading-[normal] font-extrabold whitespace-nowrap text-foreground">
            12/20
          </span>
          <span className="flex items-center">
            {GOING.slice(0, 4).map((g, i) => (
              <Disc
                key={g.i}
                initials={g.i}
                tone={g.tone}
                className={cn("size-7", i < 3 && "mr-[-8px]")}
                textClassName="text-xs leading-[normal]"
              />
            ))}
          </span>
          <Progress value={60} className="w-[120px] bg-card" />
        </div>
      </div>

      <div className="px-4">
        <Card className="gap-3 rounded-[22px] p-[18px]">
          <div className="flex items-center gap-[10px]">
            <h2 className="font-display text-[17px] leading-[normal] font-bold whitespace-nowrap text-foreground">
              О пробежке
            </h2>
            <img src={`/${dir}/img.png`} alt="" className="ml-auto size-14 object-contain" />
          </div>
          <p className="text-sm leading-[21px] font-medium text-foreground">
            Бежим спокойно, в разговорном темпе, никого не бросаем. После финиша по желанию — кофе у
            моста.
          </p>
          <p className="text-sm leading-[21px] font-medium text-muted-foreground">
            Возьми воду и что-то светоотражающее: утром на острове ещё сумрачно.
          </p>
          <Eyebrow className="text-[10px] tracking-[1.2px]">ЧТО ВЗЯТЬ</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {TAKE.map((t) => (
              <span
                key={t.label}
                className={cn(
                  "rounded-pill border-[1.5px] border-ink px-[14px] py-2 text-[13px] leading-[normal] font-bold whitespace-nowrap text-foreground",
                  t.tone
                )}
              >
                {t.label}
              </span>
            ))}
          </div>
          <div className="flex h-12 items-center justify-between">
            <span className="text-sm leading-[normal] font-bold text-foreground">
              Напомню за 2 часа до старта
            </span>
            <Switch
              aria-label="Напомнить за 2 часа до старта"
              defaultChecked
              className="h-[30px] w-[50px] rounded-[15px] p-[3px] [&>span]:size-[22px] [&>span]:rounded-[11px] [&>span[data-state=checked]]:translate-x-5"
            />
          </div>
        </Card>
      </div>

      <div className="px-4">
        <Card className="overflow-hidden rounded-[22px]">
          <div className="relative h-[150px] shrink-0 overflow-hidden bg-photo-map">
            <img
              src={`/${dir}/route.svg`}
              alt=""
              className="absolute top-0 left-0 size-full max-w-none object-cover"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-[14px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal] whitespace-nowrap">
              <span className="font-display text-[15px] font-bold text-foreground">
                Маршрут · 8 км
              </span>
              <span className="overflow-hidden text-[13px] font-medium text-ellipsis text-muted-foreground">
                Старт: табличка с картой острова
              </span>
            </div>
            <Button variant="soft" className="h-11 w-[92px] shrink-0 gap-2 px-5 text-[13px]">
              <Icon name={`${dir}/icon-map`} className="size-[18px]" />
              Карта
            </Button>
          </div>
        </Card>
      </div>

      <div className="px-4">
        <Card className="gap-[14px] rounded-[22px] p-[18px]">
          <div className="flex items-center justify-between leading-[normal] font-bold whitespace-nowrap">
            <h2 className="font-display text-[17px] text-foreground">Кто идёт</h2>
            <span className="text-[13px] text-muted-foreground">12 из 20</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {GOING.map((g) => (
              <div key={g.i + g.name} className="flex w-[46px] flex-col items-center gap-1">
                <Disc
                  initials={g.i}
                  tone={g.tone}
                  className="size-[46px]"
                  textClassName="text-xs leading-[normal]"
                />
                <span className="text-[11px] leading-[normal] font-bold whitespace-nowrap text-muted-foreground">
                  {g.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="px-4">
        <Card className="gap-[10px] rounded-[22px] p-[18px]">
          <div className="flex items-center justify-between leading-[normal] font-bold whitespace-nowrap">
            <h2 className="font-display text-[17px] text-foreground">Чат события</h2>
            <span className="text-[13px] text-muted-foreground">18 сообщений</span>
          </div>
          {MESSAGES.map((m) => (
            <div key={m.time} className="flex items-start gap-2">
              <Disc
                initials={m.i}
                tone={m.tone}
                className="size-8 shrink-0"
                textClassName="text-xs leading-[normal]"
              />
              <div
                className={cn(
                  "box-border flex min-w-0 flex-1 flex-col gap-[2px] rounded-[14px] border-[1.5px] border-ink px-3 py-2",
                  m.bubble
                )}
              >
                <span className="text-[11px] leading-[normal] font-bold whitespace-nowrap text-muted-foreground">
                  {m.who} · {m.time}
                </span>
                <span className="text-[13px] leading-[18px] font-medium text-foreground">
                  {m.text}
                </span>
              </div>
            </div>
          ))}
          <div className="box-border flex items-center gap-[10px] rounded-[14px] border-2 border-dashed border-muted-foreground px-[14px] py-3">
            <Icon name={`${dir}/icon-lock`} className="size-[18px] shrink-0" />
            <p className="flex-1 text-xs leading-[17px] font-bold text-muted-foreground">
              Писать могут участники — запишись, и чат откроется
            </p>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex h-[100px] items-center justify-between border-t-2 border-ink bg-card px-4 pt-3 pb-[26px] lg:hidden">
        <div className="flex flex-col gap-[2px] leading-[normal] font-bold whitespace-nowrap">
          <span className="font-display text-[17px] text-foreground">Бесплатно</span>
          <span className="text-xs text-accent">осталось 8 мест</span>
        </div>
        <Button className="h-14 w-[210px] px-5 text-base">Записаться</Button>
      </div>
    </div>
  );
}
