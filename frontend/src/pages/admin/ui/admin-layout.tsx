import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";
import { ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { useAdminListAwards, useAdminStats } from "@/shared/api/generated/core/admin/admin";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Chip } from "./parts";
import { useScrollActiveIntoView } from "@/shared/lib/use-scroll-active";

const item =
  "flex items-center justify-between gap-2 rounded-[12px] px-3.5 py-[11px] text-sm leading-5 font-extrabold whitespace-nowrap text-foreground transition-colors hover:bg-muted";
const active = "bg-ink text-white hover:bg-ink";

/** Сколько заявок ждёт решения и ждёт ли «Организация месяца» подтверждения — для меток в меню. */
export function useAdminAttention() {
  const stats = useAdminStats({ days: 30 });
  const awards = useAdminListAwards();
  const pending = stats.data?.status === 200 ? stats.data.data.organizationsPending : 0;
  const moderation = stats.data?.status === 200 ? stats.data.data.moderationQueue : 0;
  const award = awards.data?.status === 200 ? awards.data.data.award : undefined;
  return { pending, moderation, awardWaiting: award?.status === "PROPOSED", award };
}

/** Левое меню админки; на телефоне — строка вкладок над содержимым. */
function Rail() {
  const { pending, moderation, awardWaiting } = useAdminAttention();
  const nav = useScrollActiveIntoView<HTMLElement>(useLocation().pathname);
  const links: { to: string; label: string; end?: boolean; badge?: ReactNode }[] = [
    { to: "/admin", label: "Обзор", end: true },
    {
      to: "/admin/organizations",
      label: "Организации",
      badge: pending > 0 && <span className="rounded-pill bg-peach px-2 py-px text-[11px] font-extrabold text-foreground group-aria-[current=page]:bg-secondary">{pending}</span>,
    },
    {
      to: "/admin/moderation",
      label: "Модерация",
      badge: moderation > 0 && <span className="rounded-pill bg-peach px-2 py-px text-[11px] font-extrabold text-foreground group-aria-[current=page]:bg-secondary">{moderation}</span>,
    },
    { to: "/admin/events", label: "Мероприятия" },
    { to: "/admin/sports", label: "Виды спорта" },
    { to: "/admin/users", label: "Пользователи" },
    {
      to: "/admin/awards",
      label: "Организация месяца",
      badge: awardWaiting && <span className="rounded-pill bg-accent px-2 py-px text-[11px] font-extrabold text-white">!</span>,
    },
    { to: "/admin/pets", label: "Бобр: вещи" },
  ];
  return (
    <aside className="flex w-full shrink-0 flex-col gap-1.5 rounded-[24px] border-2 border-ink bg-card px-3.5 py-4 lg:sticky lg:top-6 lg:w-[232px]">
      <div className="flex items-center gap-2.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-ink text-secondary">
          <ShieldCheck className="size-[22px]" strokeWidth={2.2} />
        </span>
        <div className="flex flex-col items-start gap-[3px]">
          <span className="text-sm font-extrabold text-foreground">Администратор</span>
          <Chip tone="bg-secondary" className="px-2 py-px text-[10px] normal-case">роль ADMIN</Chip>
        </div>
      </div>
      <div className="h-2" />
      <nav ref={nav} className="no-scrollbar flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("group", item, isActive && active)}>
            {l.label}
            {l.badge}
          </NavLink>
        ))}
      </nav>
      <p className="mt-1.5 hidden px-1 text-[11px] leading-[15px] font-medium text-muted-foreground lg:block">
        Создавать мероприятия админ не может. Всё остальное — через модерацию.
      </p>
    </aside>
  );
}

/** Каркас админки: общая шапка, меню слева и содержимое. */
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-0">
      <div className="hidden lg:block">
        <AppHeader current="admin" />
      </div>
      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-5 px-4 pt-5 pb-10 lg:flex-row lg:gap-7 lg:px-8 lg:pt-8">
        <Rail />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">{children}</div>
      </main>
      <div className="lg:hidden">
        <MobileTabBar current="admin" />
      </div>
    </div>
  );
}
