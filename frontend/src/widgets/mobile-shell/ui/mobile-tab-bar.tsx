import { Link } from "react-router";
import { BookOpen, BriefcaseBusiness, ShieldCheck, type LucideIcon } from "lucide-react";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";
import { motion } from "motion/react";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";

export type MobileTab = "home" | "feed" | "blog" | "activity" | "profile" | "admin" | "orgs";

type Tab = { key: string; to: string; label: string; icon?: string; lucide?: LucideIcon; count?: number };

/**
 * Нижняя навигация мобильной версии. Иконки активного и неактивного состояния лежат
 * в папке экрана (`public/m-<экран>`), поэтому `current` выбирает и подсветку, и папку.
 * Набор вкладок зависит от роли: клубу вместо «Профиля» — «Кабинет», админу вместо плюса — «Админка».
 */
export function MobileTabBar({ current }: { current: MobileTab }) {
  // У админки своей папки иконок нет: в папке «Профиля» (этой вкладки у админа нет) остальные иконки неактивные.
  const dir = `m-${current === "admin" || current === "orgs" || current === "blog" ? "profile" : current}`;
  const nav = useNavAccess();
  const cabinet = useCabinetAccess();

  const left: Tab[] = [
    { key: "home", to: "/", label: "Главная", icon: "icon-home" },
    { key: "feed", to: "/feed", label: "Лента", icon: "icon-grid" },
  ];
  // «Активность» — колокольчиком в верхней панели (MobileAppBar): так по две вкладки с каждой стороны от плюса.
  const right: Tab[] = [
    { key: "blog", to: "/blog", label: "Блог", lucide: BookOpen },
    ...(nav.showProfile
      ? [{ key: "profile", to: "/profile", label: "Профиль", icon: "icon-user" }]
      : cabinet.isOrg ? [{ key: "profile", to: "/my/events", label: "Кабинет" }] : []),
    ...(nav.isAdmin ? [{ key: "admin", to: "/admin", label: "Админка", lucide: ShieldCheck }] : []),
  ];

  const tab = (t: Tab) => {
    const active = t.key === current;
    return (
      <Link
        key={t.key}
        to={t.to}
        aria-current={active ? "page" : undefined}
        className="flex h-[62px] flex-col items-center justify-center gap-[2px]"
      >
        <motion.span
          initial={active ? { scale: 0.6 } : false}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className={cn(
            "relative box-border flex h-[30px] w-[52px] items-center justify-center rounded-[15px]",
            active && "border-2 border-ink bg-secondary"
          )}
        >
          {t.icon ? <Icon name={`${dir}/${t.icon}`} className="size-5" /> : t.lucide ? <t.lucide className="size-5" strokeWidth={2.2} /> : <BriefcaseBusiness className="size-5" strokeWidth={2.2} />}
          {t.count ? (
            <span className="absolute top-[-4px] left-8 box-border flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border-[1.5px] border-ink bg-accent px-0.5 text-[10px] leading-[normal] font-extrabold text-white">
              {t.count > 99 ? "99+" : t.count}
            </span>
          ) : null}
        </motion.span>
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
      {nav.canCreate ? (
        // Плюс строго по центру, вкладки каждой стороны делят свою половину поровну:
        // слева их может быть больше, чем справа, а бар всё равно симметричен.
        <div className="mx-auto grid max-w-[480px] grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] pt-2">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${left.length}, minmax(0, 1fr))` }}>{left.map(tab)}</div>
          {/* админ событий не создаёт (правило 7): плюс в центре только у участника и клуба */}
          <div className="relative">
            <Link
              to="/events/new"
              aria-label="Создать событие"
              className="absolute top-[-28px] left-1/2 box-border flex size-[58px] -translate-x-1/2 items-center justify-center rounded-[29px] border-2 border-ink bg-primary shadow-hard-sm"
            >
              <Icon name={`${dir}/icon-plus`} className="size-[26px]" />
            </Link>
          </div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${right.length}, minmax(0, 1fr))` }}>{right.map(tab)}</div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[480px] pt-2" style={{ gridTemplateColumns: `repeat(${left.length + right.length}, minmax(0, 1fr))` }}>
          {left.map(tab)}
          {right.map(tab)}
        </div>
      )}
    </nav>
  );
}
