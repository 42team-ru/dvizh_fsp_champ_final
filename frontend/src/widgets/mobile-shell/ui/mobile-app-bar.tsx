import { Link } from "react-router";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { useUser } from "@/entity/user/model/use-user";
import { useUnreadNotifications } from "@/entity/notification/model/use-unread-notifications";
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
  const { user } = useUser();
  const unread = useUnreadNotifications().total;
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <BrandPlate>
        <img src="/icon.svg" alt="" className="size-9 shrink-0" />
        <span
          className={cn(
            "font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground",
            titleClassName
          )}
        >
          {title}
        </span>
      </BrandPlate>
      <div className="flex items-center gap-2">
        <Link
          to="/activity"
          aria-label={unread > 0 ? `Активность: ${unread} непрочитанных` : "Активность"}
          className="relative box-border flex size-11 items-center justify-center rounded-[22px] border-2 border-ink bg-card"
        >
          <Icon name={`${dir}/icon-bell`} className="size-5" />
          {unread > 0 && <span className="absolute top-[6px] left-6 box-border size-3 rounded-[6px] border-[1.5px] border-ink bg-accent" />}
        </Link>
        <Link to="/profile" aria-label="Профиль">
          <Disc
            user={user}
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
