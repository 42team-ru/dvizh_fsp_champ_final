import { Link } from "react-router";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { AccountMenu } from "@/features/auth/sign-out/ui/account-menu";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { Building2, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { SearchPalette } from "@/widgets/search-palette/ui/search-palette";

const NAV = [
  { key: "home", to: "/", label: "Главная", icon: "icon-home" },
  { key: "feed", to: "/feed", label: "Лента", icon: "icon-grid" },
  { key: "activity", to: "/activity", label: "Активность", icon: "icon-bell" },
  { key: "profile", to: "/profile", label: "Профиль", icon: "icon-user" },
] as const;

/** Папка иконки: в папке страницы активная иконка белая; в кабинете и админке ни одна из четырёх не активна. */
const iconFolder = (current: string, key: string) =>
  current !== "cabinet" && current !== "admin" && current !== "orgs" ? current : key === "home" ? "feed" : "home";

/**
 * Шапка одна и та же на всех страницах: ширина контейнера не зависит от страницы, шапка прилипает к верху —
 * при переходах ничего не прыгает. Вкладка «Кабинет» — только организаторам.
 */
export function AppHeader({ current = "home" }: { current?: "home" | "feed" | "profile" | "activity" | "cabinet" | "admin" | "orgs" }) {
  const cabinet = useCabinetAccess();
  const nav = useNavAccess();
  const items = NAV.filter((item) =>
    (item.key !== "activity" || nav.showActivity) && (item.key !== "profile" || nav.showProfile));
  return (
    <header className="sticky top-0 z-40 box-border h-[76px] border-b-2 border-ink bg-background">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center px-4 xl:px-8">
        <Link to="/" aria-label="Движ — на главную">
          <BrandPlate className="gap-[10px]">
            <img src="/icon.svg" alt="" className="size-10 shrink-0" />
            <span className="font-display text-[17px] leading-[21px] font-bold text-foreground">
              Движ
            </span>
          </BrandPlate>
        </Link>

        <nav className="ml-3 flex min-w-0 gap-[2px]">
          {items.map((item) => (
            <Button
              key={item.label}
              asChild
              variant="nav"
              size="nav"
              className="relative justify-start px-2 text-[13px] font-bold xl:px-3 xl:text-sm"
            >
              <Link to={item.to} aria-current={item.key === current ? "page" : undefined}>
                <Icon name={`${iconFolder(current, item.key)}/${item.icon}`} className="size-[19px]" />
                <span className="sr-only xl:not-sr-only">{item.label}</span>
                {item.key === "activity" && nav.unread > 0 ? (
                  <Badge
                    variant="accent"
                    aria-label={`${nav.unread} непрочитанных`}
                    className="ml-1 h-[22px] min-w-[22px] justify-center rounded-[11px] px-1 text-xs leading-[17px] font-extrabold text-white"
                  >
                    {nav.unread > 99 ? "99+" : nav.unread}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          ))}
          <Button asChild variant="nav" size="nav" className="justify-start px-2 text-[13px] xl:px-3 xl:text-sm">
            <Link to="/orgs" aria-current={current === "orgs" ? "page" : undefined}><Building2 className="size-[19px]" />Организации</Link>
          </Button>
          {nav.isAdmin && (
            <Button asChild variant="nav" size="nav" className="justify-start font-bold">
              <Link to="/admin" aria-current={current === "admin" ? "page" : undefined}>
                <ShieldCheck className="size-[19px]" strokeWidth={2.2} />
                Админка
              </Link>
            </Button>
          )}
          {cabinet.allowed && (
            <Button asChild variant="nav" size="nav" className="justify-start font-bold">
              <Link to="/my/events" aria-current={current === "cabinet" ? "page" : undefined}>
                <BriefcaseBusiness className="size-[19px]" strokeWidth={2.2} />
                Кабинет
              </Link>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:gap-3">
          <SearchPalette />

          {/* админ событий не создаёт (правило 7) */}
          {nav.canCreate && (
            <Button asChild className="shrink-0">
              <Link to="/events/new">
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
