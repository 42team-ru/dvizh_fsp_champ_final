import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Disc } from "@/shared/components/ui/disc";
import { Icon } from "@/shared/components/ui/icon";
import { Progress } from "@/shared/components/ui/progress";
import { cn } from "cn";

const dir = "m-activity";
const CHIPS = ["Все", "Заявки", "Напоминания", "Подписки"];

const b = "font-extrabold";
const dim = (t: string) => <span className="text-muted-foreground"> · {t}</span>;

function Unread() {
  return <span className="box-border size-[10px] shrink-0 rounded-[5px] border-[1.5px] border-ink bg-accent" />;
}

/** Строка уведомления: слева значок или аватар, текст, справа кнопка. */
function Row({
  lead,
  action,
  unread,
  children,
}: {
  lead: React.ReactNode;
  action?: React.ReactNode;
  unread?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4">
      <div className="box-border flex w-full items-center gap-3 rounded-[20px] border-2 border-ink bg-card p-[14px]">
        {lead}
        <div className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">{children}</div>
        {action}
        {unread ? <Unread /> : null}
      </div>
    </div>
  );
}

function IconBox({ tone, icon }: { tone: string; icon: string }) {
  return (
    <span
      className={cn(
        "box-border flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink",
        tone
      )}
    >
      <Icon name={`${dir}/${icon}`} className="size-[22px]" />
    </span>
  );
}

function Avatar({ i, tone }: { i: string; tone: string }) {
  return (
    <Disc initials={i} tone={tone} className="size-11 shrink-0" textClassName="text-[13px] leading-[normal]" />
  );
}

const small = (label: string, w: string) => (
  <Button variant="soft" className={cn("h-10 shrink-0 px-5 text-xs", w)}>
    {label}
  </Button>
);

function Label({ children }: { children: string }) {
  return (
    <p className="px-4 text-[11px] leading-[normal] font-extrabold tracking-[1.5px] text-muted-foreground">
      {children}
    </p>
  );
}

export function ActivityMobile() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-background pb-[110px] lg:hidden">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-[11px] border-2 border-ink bg-secondary">
            <Icon name={`${dir}/icon-run`} className="size-5" />
          </span>
          <span className="font-display text-xl leading-[normal] font-bold text-foreground">
            Активность
          </span>
        </div>
        <button
          type="button"
          aria-label="Поиск"
          className="box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-search`} className="size-5" />
        </button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {CHIPS.map((c, i) => (
          <Button
            key={c}
            variant={i === 0 ? "ink" : "soft"}
            className="h-11 shrink-0 px-[18px] text-sm shadow-none"
          >
            {c}
          </Button>
        ))}
      </div>

      <Label>СЕГОДНЯ</Label>

      <div className="px-4">
        <div className="box-border flex w-full flex-col gap-3 rounded-[20px] border-2 border-ink bg-lime-soft p-[14px]">
          <div className="flex items-start gap-3">
            <Avatar i="ЛП" tone="bg-sky" />
            <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">
              <span className={b}>Лера Петрова</span> хочет пойти на{" "}
              <span className={b}>«Вечерний футбол 6×6»</span>
              {dim("10 мин")}
            </p>
            <Unread />
          </div>
          <div className="flex gap-[10px]">
            <Button className="h-12 min-w-0 flex-1 px-5 text-sm">Принять</Button>
            <Button variant="soft" className="h-12 min-w-0 flex-1 px-5 text-sm">
              Нет
            </Button>
          </div>
        </div>
      </div>

      <Row
        lead={<IconBox tone="bg-lavender-soft" icon="icon-clock" />}
        action={small("Билет", "w-[84px]")}
        unread
      >
        Через 2 часа <span className={b}>«Вечерний футбол 6×6»</span>. Сбор в 19:20 у входа
        {dim("17:30")}
      </Row>
      <Row lead={<IconBox tone="bg-rose" icon="icon-heart" />}>
        <span className={b}>Дима и ещё 5</span> оценили твою пробежку{dim("9:12")}
      </Row>

      <Label>ВЧЕРА</Label>

      <Row lead={<Avatar i="СМ" tone="bg-sky" />} action={small("Ответить", "w-[84px]")}>
        <span className={b}>Саша</span> ответила: «В субботу со мной?»{dim("21:04")}
      </Row>

      <div className="px-4">
        <div className="box-border flex w-full items-center gap-3 rounded-[20px] border-2 border-ink bg-card p-[14px]">
          <IconBox tone="bg-secondary" icon="icon-trophy" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="text-sm leading-[normal] font-medium whitespace-nowrap text-foreground">
              Новый бейдж
            </span>
            <Badge
              variant="secondary"
              className="h-auto border-[1.5px] px-[10px] py-1 text-[10px] leading-[normal] font-extrabold tracking-[1px]"
            >
              СЕРИЯ 7 ДНЕЙ
            </Badge>
            <span className="text-xs leading-[normal] font-bold whitespace-nowrap text-muted-foreground">
              +50 монет · 20:00
            </span>
          </div>
          {small("Смотреть", "w-[92px]")}
        </div>
      </div>

      <Row lead={<Avatar i="МС" tone="bg-mint" />} action={small("В ответ", "w-[84px]")}>
        <span className={b}>Макс Сидоров</span> подписался на тебя{dim("14:36")}
      </Row>

      <div className="px-4">
        <div className="box-border flex w-full items-center gap-2 overflow-hidden rounded-[24px] border-2 border-ink bg-secondary p-[18px] shadow-[4px_4px_0_var(--ink)]">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px] text-foreground">
            <span className="text-[10px] leading-[normal] font-extrabold tracking-[1.5px] whitespace-nowrap">
              ЦЕЛЬ НЕДЕЛИ
            </span>
            <span className="font-display text-[32px] leading-[normal] font-extrabold whitespace-nowrap">
              4 / 5
            </span>
            <span className="text-[13px] leading-[normal] font-bold whitespace-nowrap">
              ещё одна — и цель закрыта
            </span>
            <Progress value={80} className="w-[170px] bg-card" />
          </div>
          <img src="/m-home/img.png" alt="" className="h-28 w-[104px] shrink-0 object-contain" />
        </div>
      </div>

      <MobileTabBar current="activity" />
    </div>
  );
}
