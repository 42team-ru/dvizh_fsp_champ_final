import { profilePath } from "@/entity/user/lib/profile-path";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, TriangleAlert, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import type { UserShortResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { fullName } from "@/pages/event/model/use-event";
import { handle } from "@/shared/lib/handle";

/** Плашка статуса: текст капсом, цвет — только подсказка. */
export function Chip({ tone = "bg-card", className, children }: { tone?: string; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-pill border-[1.5px] border-ink px-2.5 py-0.5 text-[11px] leading-[15px] font-extrabold whitespace-nowrap text-foreground uppercase",
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Счётчик внутри вкладки: на активной — лаймовый, на остальных — лавандовый. */
function Count({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span className={cn("rounded-pill px-[7px] py-px text-[11px] leading-[15px] font-extrabold text-foreground", active ? "bg-secondary" : "bg-lavender-soft")}>
      {children}
    </span>
  );
}

export type PillTab<K extends string> = { key: K; label: string; count?: number };

/** Переключатель-«пилюля» из макета: вкладки мероприятия, фильтр статусов, период. */
export function PillTabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: PillTab<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-pill border-2 border-ink bg-card p-1", className)}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-[7px] text-sm leading-[19px] font-extrabold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            {t.label}
            {t.count ? <Count active={active}>{t.count}</Count> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Оранжевая плашка с предупреждением или текстом ошибки сервера. */
export function Warning({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex items-center gap-3 rounded-[14px] border-[1.5px] border-orange bg-peach px-4 py-3", className)}>
      <TriangleAlert className="size-[18px] shrink-0 text-orange" strokeWidth={2.4} />
      <p className="min-w-0 flex-1 text-sm leading-[19px] font-bold text-foreground">{children}</p>
      {action}
    </div>
  );
}

/** Подпись капсом над блоком («НЕДАВНИЕ РЕШЕНИЯ»). */
export function Divider({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-[15px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">{children}</p>;
}

/** Хлебные крошки «‹ Мои мероприятия / Название». */
export function Crumbs({ title }: { title?: string }) {
  return (
    <nav className="flex min-w-0 items-center gap-2 text-sm">
      <Link to="/my/events" className="flex items-center gap-1 font-extrabold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" strokeWidth={2.6} />
        Мои мероприятия
      </Link>
      {title && (
        <>
          <span className="font-medium text-muted-foreground">/</span>
          <span className="truncate font-extrabold text-foreground">{title}</span>
        </>
      )}
    </nav>
  );
}

/** Аватар с обводкой: фото или инициалы. */
export function Avatar({ user, className }: { user: UserShortResponse; className?: string }) {
  return <UserAvatar user={user} className={cn("size-11 shrink-0 rounded-full border-2 border-ink object-cover", className)} />;
}

/** Имя и «@логин · город» в одну строку. */
export function PersonLine({ user, extra }: { user: UserShortResponse; extra?: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <Link to={profilePath(user)} className="truncate text-[15px] leading-[21px] font-extrabold text-foreground hover:underline">
        {fullName(user)}
      </Link>
      <span className="truncate text-[13px] font-medium text-muted-foreground">
        {handle(user.username)}
        {(extra ?? user.city) ? ` · ${extra ?? user.city}` : ""}
      </span>
    </div>
  );
}

/** Кнопка «опасного» действия в списке: белая с оранжевой рамкой. */
export function OrangeButton(props: React.ComponentProps<typeof Button>) {
  return <Button variant="soft" size="sm" rough={{ color: "var(--orange)" }} {...props} className={cn("text-orange-ink", props.className)} />;
}

/** Каркас диалога кабинета: тёмная подложка, белая карточка с жёсткой тенью, крестик, футер справа. */
export function CabinetDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] grid-cols-[minmax(0,1fr)] gap-3.5 overflow-y-auto rounded-[24px] border-[3px] border-ink p-[22px] shadow-[5px_5px_0_var(--ink)] ring-0 sm:max-w-[520px]"
      >
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="font-display text-xl leading-[26px] font-extrabold text-foreground">{title}</DialogTitle>
          <DialogClose asChild>
            <Button variant="outline" size="icon-sm" rough={false} className="size-[34px] shadow-none" aria-label="Закрыть">
              <X className="size-3.5" strokeWidth={3} />
            </Button>
          </DialogClose>
        </div>
        {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
        {children}
        <div className="flex flex-wrap justify-end gap-2.5">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

/** Подпись поля в диалоге. */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] leading-[15px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">
      {children}
    </label>
  );
}

export const textareaClass =
  "w-full resize-none rounded-[12px] border-2 border-ink bg-card px-3.5 py-3 text-[15px] leading-5 font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30";

export const inputClass =
  "h-12 w-full min-w-0 rounded-[12px] border-2 border-ink bg-card px-3.5 text-[15px] font-bold text-foreground outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30";
