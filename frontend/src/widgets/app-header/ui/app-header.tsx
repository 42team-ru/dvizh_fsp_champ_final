import { Link } from "react-router";
import { BrandPlate } from "@/shared/components/ui/brand-plate";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { AccountMenu } from "@/features/auth/sign-out/ui/account-menu";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { useUnreadNotifications } from "@/entity/notification/model/use-unread-notifications";
import { BriefcaseBusiness } from "lucide-react";
import { SearchPalette } from "@/widgets/search-palette/ui/search-palette";

const NAV = [
  { key: "home", to: "/", label: "Главная", icon: "icon-home", w: "w-[119px]" },
  { key: "feed", to: "/feed", label: "Лента", icon: "icon-grid", w: "w-[104.5px]" },
  { key: "activity", to: "/activity", label: "Активность", icon: "icon-bell", w: "w-[178.5px]" },
  { key: "profile", to: "/profile", label: "Профиль", icon: "icon-user", w: "w-[126.5px]" },
];

/** Папка иконки: в папке страницы активная иконка белая; в кабинете ни одна из четырёх не активна. */
const iconFolder = (current: string, key: string) =>
  current !== "cabinet" ? current : key === "home" ? "feed" : "home";

/** `wide` — контейнер 1440px, как у ленты; остальные страницы 1280px. Вкладка «Кабинет» — только организаторам. */
export function AppHeader({ current = "home", wide }: { current?: "home" | "feed" | "profile" | "activity" | "cabinet"; wide?: boolean }) {
  const cabinet = useCabinetAccess();
  const unread = useUnreadNotifications().total;
  return (
    <header className="box-border h-[76px] border-b-2 border-ink bg-background">
      <div className={`mx-auto flex h-full w-full ${wide ? "max-w-[1440px]" : "max-w-[1280px]"} items-center px-8`}>
        <Link to="/" aria-label="Движ — на главную">
          <BrandPlate className="gap-[10px]">
            <img src="/icon.svg" alt="" className="size-10 shrink-0" />
            <span className="font-display text-[17px] leading-[21px] font-bold text-foreground">
              Движ
            </span>
          </BrandPlate>
        </Link>

        <nav className="ml-7 flex shrink-0 gap-[2px]">
          {NAV.map((item) => (
            <Button
              key={item.label}
              asChild
              variant="nav"
              size="nav"
              className={`relative justify-start font-bold ${item.w}`}
            >
              <Link to={item.to} aria-current={item.key === current ? "page" : undefined}>
                <Icon name={`${iconFolder(current, item.key)}/${item.icon}`} className="size-[19px]" />
                {item.label}
                {item.key === "activity" && unread > 0 ? (
                  <Badge
                    variant="accent"
                    aria-label={`${unread} непрочитанных`}
                    className="absolute top-1/2 left-[140.5px] h-[22px] -translate-y-1/2 min-w-[22px] justify-center rounded-[11px] px-1 py-px text-xs leading-[17px] font-extrabold text-white"
                  >
                    {unread > 99 ? "99+" : unread}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          ))}
          {cabinet.allowed && (
            <Button asChild variant="nav" size="nav" className="justify-start font-bold">
              <Link to="/my/events" aria-current={current === "cabinet" ? "page" : undefined}>
                <BriefcaseBusiness className="size-[19px]" strokeWidth={2.2} />
                Кабинет
              </Link>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <SearchPalette />

          <Button asChild className="shrink-0">
            <Link to="/events/new">
              <Icon name="icon-plus" className="size-[18px]" />
              Создать
            </Link>
          </Button>

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
