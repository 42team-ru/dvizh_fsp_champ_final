import { Link } from "react-router";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useUser } from "@/entity/user/model/use-user";
import { SearchPalette } from "@/widgets/search-palette/ui/search-palette";

const NAV = [
  { key: "home", to: "/", label: "Главная", icon: "icon-home", w: "w-[119px]" },
  { key: "feed", to: "/feed", label: "Лента", icon: "icon-grid", w: "w-[104.5px]" },
  { key: "activity", to: "/activity", label: "Активность", icon: "icon-bell", w: "w-[178.5px]", count: 3 },
  { key: "profile", to: "/profile", label: "Профиль", icon: "icon-user", w: "w-[126.5px]" },
];

export function AppHeader({ current = "home" }: { current?: "home" | "feed" | "profile" | "activity" }) {
  const { user } = useUser();
  return (
    <header className="box-border h-[76px] border-b-2 border-ink bg-background">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center px-8">
        <Link to="/" className="flex h-10 items-center gap-[10px]">
          <img src="/icon.svg" alt="" className="size-10 shrink-0" />
          <span className="font-display text-[17px] leading-[21px] font-bold text-foreground">
            Движ
          </span>
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
                <Icon name={`${current === "home" ? "home" : current}/${item.icon}`} className="size-[19px]" />
                {item.label}
                {item.count ? (
                  <Badge
                    variant="accent"
                    className="absolute top-[10px] left-[140.5px] size-[22px] justify-center rounded-[11px] p-px text-xs leading-[17px] font-extrabold text-white"
                  >
                    {item.count}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <SearchPalette />

          <Button asChild className="shrink-0">
            <Link to="/events/new">
              <Icon name="icon-plus" className="size-[18px]" />
              Создать
            </Link>
          </Button>

          <Link to="/profile" aria-label="Профиль" className="shrink-0">
            <Avatar className="size-[42px] after:hidden">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" className="border-2 border-ink object-cover" />}
              <AvatarFallback className="border-2 border-ink bg-sky text-sm leading-[19px] font-extrabold text-foreground">
                {((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
