import { Link } from "react-router";
import { Disc } from "@/shared/components/ui/disc";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";

/** Верхняя панель мобильной версии: значок, заголовок, колокольчик и аватар. */
export function MobileAppBar({
  dir,
  title,
  titleClassName,
}: {
  /** Папка в `public/` с иконками экрана (`m-feed`). */
  dir: string;
  title: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-[11px] border-2 border-ink bg-secondary">
          <Icon name={`${dir}/icon-run`} className="size-5" />
        </span>
        <span
          className={cn(
            "font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground",
            titleClassName
          )}
        >
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/activity"
          aria-label="Активность"
          className="relative box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-bell`} className="size-5" />
          <span className="absolute top-[6px] left-6 box-border size-3 rounded-[6px] border-[1.5px] border-ink bg-accent" />
        </Link>
        <Link to="/profile" aria-label="Профиль">
          <Disc
            initials="АС"
            tone="bg-sky"
            className="size-11"
            textClassName="text-xs leading-[normal]"
          />
        </Link>
      </div>
    </div>
  );
}
