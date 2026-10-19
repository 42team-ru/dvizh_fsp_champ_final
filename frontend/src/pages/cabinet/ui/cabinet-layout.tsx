import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { useUser } from "@/entity/user/model/use-user";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { useOrganizationsMe } from "@/shared/api/generated/core/organizations/organizations";
import { ORGANIZATION_STATUS } from "@/shared/lib/statuses";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Chip } from "./parts";

const item =
  "flex items-center justify-between gap-2 rounded-[12px] px-3.5 py-[11px] text-[15px] leading-5 font-extrabold whitespace-nowrap text-foreground transition-colors hover:bg-muted";

/** Кто ведёт кабинет: организация с логотипом и статусом допуска или сам человек. */
function Owner() {
  const { user } = useUser();
  const { isOrg } = useCabinetAccess();
  const org = useOrganizationsMe({ query: { enabled: isOrg, retry: false } });
  const mine = org.data?.status === 200 ? org.data.data : undefined;

  if (isOrg) {
    const status = mine?.status ? ORGANIZATION_STATUS[mine.status] : undefined;
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        {mine?.logoUrl ? (
          <img src={mine.logoUrl} alt="" className="size-11 shrink-0 rounded-[12px] border-2 border-ink object-cover" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink bg-secondary font-display text-xl font-extrabold text-foreground">
            {(mine?.name ?? user?.firstName ?? "?")[0]}
          </span>
        )}
        <div className="flex min-w-0 flex-col items-start gap-[3px]">
          <span className="text-[15px] leading-5 font-extrabold break-words text-foreground">{mine?.name ?? "Анкета не заполнена"}</span>
          {status && <Chip tone={status.tone} className="normal-case">{status.label}</Chip>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar user={user} className="size-11 shrink-0 rounded-full border-2 border-ink object-cover" />
      <div className="flex min-w-0 flex-col items-start gap-[3px]">
        <span className="truncate text-[15px] leading-5 font-extrabold text-foreground">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username}</span>
        <Chip tone="bg-lime-soft" className="normal-case">организатор</Chip>
      </div>
    </div>
  );
}

/** Левое меню кабинета; на телефоне — строка над содержимым. */
function Rail() {
  const { user } = useUser();
  const { isOrg, eventsCount } = useCabinetAccess();
  const org = useOrganizationsMe({ query: { enabled: isOrg, retry: false } });
  const mine = org.data?.status === 200 ? org.data.data : undefined;
  return (
    <aside className="flex w-full shrink-0 flex-col gap-1.5 rounded-[24px] border-2 border-ink bg-card px-3.5 py-4 lg:sticky lg:top-6 lg:w-[232px]">
      <Owner />
      <div className="h-2" />
      <div className="flex flex-wrap gap-1.5 lg:flex-col">
        <NavLink to="/my/events" end={false} className={({ isActive }) => cn(item, isActive && "bg-ink text-white hover:bg-ink")}>
          Мои мероприятия
          {eventsCount > 0 && (
            <span className="rounded-pill bg-secondary px-2 py-px text-xs font-extrabold text-foreground">{eventsCount}</span>
          )}
        </NavLink>
        {isOrg && (
          <NavLink to="/my/org" className={({ isActive }) => cn(item, isActive && "bg-ink text-white hover:bg-ink")}>
            Анкета клуба
            {mine?.status !== "APPROVED" && (
              <span className="rounded-pill bg-peach px-2 py-px text-xs font-extrabold text-foreground">!</span>
            )}
          </NavLink>
        )}
        {isOrg && mine?.status === "APPROVED" && mine.id && (
          <Link to={`/orgs/${mine.id}`} className={item}>
            Публичная страница
            <ArrowUpRight className="size-4" strokeWidth={2.6} />
          </Link>
        )}
        {!isOrg && user?.id && (
          <Link to={`/users/${user.id}`} className={item}>
            Публичная страница
            <ArrowUpRight className="size-4" strokeWidth={2.6} />
          </Link>
        )}
      </div>
    </aside>
  );
}

/** Каркас кабинета: шапка, меню слева и содержимое. */
export function CabinetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-0">
      <div className="hidden lg:block">
        <AppHeader current="cabinet" />
      </div>
      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-5 px-4 pt-5 pb-10 lg:flex-row lg:gap-7 lg:px-8 lg:pt-8">
        <Rail />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">{children}</div>
      </main>
      <div className="lg:hidden">
        <MobileTabBar current="profile" />
      </div>
    </div>
  );
}
