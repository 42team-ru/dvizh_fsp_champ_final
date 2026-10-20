import { Link } from "react-router";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { AccountMenu } from "@/features/auth/sign-out/ui/account-menu";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { BookOpen, Building2, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { SearchPalette } from "@/widgets/search-palette/ui/search-palette";

const NAV = [
  { key: "home", to: "/", label: "Главная", icon: "icon-home" },
  { key: "feed", to: "/feed", label: "Лента", icon: "icon-grid" },
  { key: "blog", to: "/blog", label: "Блог", icon: null },
  { key: "activity", to: "/activity", label: "Активность", icon: "icon-bell" },
  { key: "profile", to: "/profile", label: "Профиль", icon: "icon-user" },
] as const;

/**
 * Ширина пунктов задаётся брейкпоинтом, а не содержимым: до 2xl (1536px) все пункты — квадратные иконки 42×42,
 * с 2xl — иконка и подпись, а контейнер шапки расширяется до 1440px (иначе подписи не влезают в 1280). Поэтому шапка одинаковая на всех страницах и не наезжает на поиск и «Создать».
 */
const NAV_ITEM = "relative w-[42px] shrink-0 justify-center px-0 text-sm font-bold 2xl:w-auto 2xl:justify-start 2xl:px-3";
const NAV_LABEL = "sr-only 2xl:not-sr-only 2xl:whitespace-nowrap";

/** Папка иконки: в папке страницы активная иконка белая; в кабинете и админке ни одна из четырёх не активна. */
const iconFolder = (current: string, key: string) =>
  current !== "cabinet" && current !== "admin" && current !== "orgs" && current !== "blog" ? current : key === "home" ? "feed" : "home";

/**
 * Шапка одна и та же на всех страницах: ширина контейнера не зависит от страницы, шапка прилипает к верху —
 * при переходах ничего не прыгает. Вкладка «Кабинет» — только организаторам.
 */
export function AppHeader({ current = "home" }: { current?: "home" | "feed" | "blog" | "profile" | "activity" | "cabinet" | "admin" | "orgs" }) {
  const cabinet = useCabinetAccess();
  const nav = useNavAccess();
  const items = NAV.filter((item) =>
    (item.key !== "activity" || nav.showActivity) && (item.key !== "profile" || nav.showProfile));
  return (
    <header className="sticky top-0 z-40 box-border h-[76px] border-b-2 border-ink bg-background">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center px-4 xl:px-8 2xl:max-w-[1440px]">
        <Link to="/" aria-label="Движ — на главную">
          <BrandPlate className="gap-[10px] py-0">
            <img src="/icon.svg" alt="" className="size-10 shrink-0" />
            <span className="font-display text-[17px] leading-[21px] font-bold text-foreground">
              Движ
            </span>
          </BrandPlate>
        </Link>

        <nav className="ml-3 flex shrink-0 gap-[2px] 2xl:ml-4">
          {items.map((item) => (
            <Button key={item.label} asChild variant="nav" size="nav" className={NAV_ITEM}>
              <Link to={item.to} title={item.label} aria-current={item.key === current ? "page" : undefined}>
                {item.icon
                  ? <Icon name={`${iconFolder(current, item.key)}/${item.icon}`} className="size-[19px] shrink-0" />
                  : <BookOpen className="size-[19px] shrink-0" strokeWidth={2.2} />}
                <span className={NAV_LABEL}>{item.label}</span>
                {item.key === "activity" && nav.unread > 0 ? (
                  <Badge
                    variant="accent"
                    aria-label={`${nav.unread} непрочитанных`}
                    className="absolute -top-1 -right-1 h-[20px] min-w-[20px] justify-center rounded-[10px] px-1 text-[11px] leading-[16px] font-extrabold text-white 2xl:static 2xl:ml-1 2xl:h-[22px] 2xl:min-w-[22px] 2xl:rounded-[11px] 2xl:text-xs 2xl:leading-[17px]"
                  >
                    {nav.unread > 99 ? "99+" : nav.unread}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          ))}
          <Button asChild variant="nav" size="nav" className={NAV_ITEM}>
            <Link to="/orgs" title="Организации" aria-current={current === "orgs" ? "page" : undefined}>
              <Building2 className="size-[19px] shrink-0" />
              <span className={NAV_LABEL}>Организации</span>
            </Link>
          </Button>
          {nav.isAdmin && (
            <Button asChild variant="nav" size="nav" className={NAV_ITEM}>
              <Link to="/admin" title="Админка" aria-current={current === "admin" ? "page" : undefined}>
                <ShieldCheck className="size-[19px] shrink-0" strokeWidth={2.2} />
                <span className={NAV_LABEL}>Админка</span>
              </Link>
            </Button>
          )}
          {cabinet.allowed && (
            <Button asChild variant="nav" size="nav" className={NAV_ITEM}>
              <Link to="/my/events" title="Кабинет" aria-current={current === "cabinet" ? "page" : undefined}>
                <BriefcaseBusiness className="size-[19px] shrink-0" strokeWidth={2.2} />
                <span className={NAV_LABEL}>Кабинет</span>
              </Link>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:gap-3">
          <SearchPalette />

          {/* админ событий не создаёт (правило 7) */}
          {nav.canCreate && (
            <Button asChild className="shrink-0">
              <Link to="/events/new" className="whitespace-nowrap">
                <Icon name="icon-plus" className="size-[18px]" />
                Создать
              </Link>
            </Button>
          )}

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
