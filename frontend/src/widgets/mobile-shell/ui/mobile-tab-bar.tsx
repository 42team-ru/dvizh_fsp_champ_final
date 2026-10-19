import { Link } from "react-router";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";

export type MobileTab = "home" | "feed" | "activity" | "profile";

const TABS = [
  { key: "home", to: "/", label: "Главная", icon: "icon-home" },
  { key: "feed", to: "/feed", label: "Лента", icon: "icon-grid" },
  { key: "activity", to: "/activity", label: "Активность", icon: "icon-bell", count: 3 },
  { key: "profile", to: "/profile", label: "Профиль", icon: "icon-user" },
] as const;

/**
 * Нижняя навигация мобильной версии. Иконки активного и неактивного состояния лежат
 * в папке экрана (`public/m-<экран>`), поэтому `current` выбирает и подсветку, и папку.
 */
export function MobileTabBar({ current }: { current: MobileTab }) {
  const dir = `m-${current}`;
  const tab = (t: (typeof TABS)[number]) => {
    const active = t.key === current;
    return (
      <Link
        key={t.key}
        to={t.to}
        aria-current={active ? "page" : undefined}
        className="flex h-[62px] flex-col items-center justify-center gap-[2px]"
      >
        <span
          className={cn(
            "relative box-border flex h-[30px] w-[52px] items-center justify-center rounded-[15px]",
            active && "border-2 border-ink bg-secondary"
          )}
        >
          <Icon name={`${dir}/${t.icon}`} className="size-5" />
          {"count" in t ? (
            <span className="absolute top-[-4px] left-8 box-border flex size-[18px] items-center justify-center rounded-[9px] border-[1.5px] border-ink bg-accent text-[10px] leading-[normal] font-extrabold text-white">
              {t.count}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "text-[11px] leading-[normal]",
            active ? "font-extrabold text-foreground" : "font-bold text-muted-foreground"
          )}
        >
          {t.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-card pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-5 px-0 pt-2">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <div className="relative">
          <Link
            to="/events/new"
            aria-label="Создать событие"
            className="absolute top-[-28px] left-1/2 box-border flex size-[58px] -translate-x-1/2 items-center justify-center rounded-[29px] border-2 border-ink bg-primary shadow-hard-sm"
          >
            <Icon name={`${dir}/icon-plus`} className="size-[26px]" />
          </Link>
        </div>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  );
}
