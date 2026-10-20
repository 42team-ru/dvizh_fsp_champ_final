import { profilePath } from "@/entity/user/lib/profile-path";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, UsersRound } from "lucide-react";
import { cn } from "cn";
import { useAdminListUsers } from "@/shared/api/generated/core/admin/admin";
import type { AdminListUsersRole, AdminUserResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { AdminLayout } from "./admin-layout";
import { Chip, PageHead, Pager, PillTabs, SearchBox, TH } from "./parts";
import { dateShort } from "./format";

const SIZE = 20;
type Filter = "ALL" | AdminListUsersRole;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "USER", label: "USER" },
  { key: "ORG", label: "ORG" },
  { key: "ADMIN", label: "ADMIN" },
];
const ROLE_TONE: Record<string, string> = { USER: "bg-card", ORG: "bg-lavender-soft", ADMIN: "bg-secondary" };

function useCount(role?: AdminListUsersRole) {
  const q = useAdminListUsers({ role, size: 1 });
  return q.data?.status === 200 ? q.data.data.totalElements ?? 0 : 0;
}

const COLS = "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_64px_minmax(0,0.8fr)_48px_48px_64px_40px] items-center gap-3.5";

function Row({ user: u, odd }: { user: AdminUserResponse; odd: boolean }) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;
  return (
    <div className={cn(COLS, "border-b-[1.5px] border-track px-4 py-3", odd && "bg-background/50", !u.active && "opacity-70")}>
      <div className="flex min-w-0 items-center gap-2.5">
        <UserAvatar user={u} className="size-10 shrink-0 rounded-full border-2 border-ink" />
        <div className="flex min-w-0 flex-col">
          <Link to={profilePath(u)} className="truncate text-sm font-extrabold text-foreground hover:underline">{name}</Link>
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="truncate">@{u.username}</span>
            {!u.active && <Chip tone="bg-lavender-soft" className="px-1.5 py-0 text-[9px] normal-case">неактивен</Chip>}
          </span>
        </div>
      </div>
      <span className="truncate text-[13px] font-medium text-foreground">{u.email}</span>
      <span><Chip tone={ROLE_TONE[u.systemRole]} className="px-2 py-px text-[10px]">{u.systemRole}</Chip></span>
      <span className="truncate text-[13px] font-bold text-foreground">{u.city ?? "—"}</span>
      <span className="text-sm font-extrabold text-foreground">{u.eventsCount}</span>
      <span className="text-sm font-extrabold text-foreground">{u.registrationsCount}</span>
      <span className="text-xs font-medium text-muted-foreground">{dateShort(u.createdAt)}</span>
      <Link to={`/admin/events?authorId=${u.id}`} aria-label={`Мероприятия: ${name}`}
        className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-card transition-colors hover:bg-secondary">
        <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
      </Link>
    </div>
  );
}

/** Пользователи: поиск по логину, email и имени; только просмотр. */
export default function AdminUsersPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const role = filter === "ALL" ? undefined : filter;
  const list = useAdminListUsers({ role, searchText: searchText || undefined, page, size: SIZE });
  const data = list.data?.status === 200 ? list.data.data : undefined;
  const items = data?.items ?? [];
  const counts: Record<Filter, number> = { ALL: useCount(), USER: useCount("USER"), ORG: useCount("ORG"), ADMIN: useCount("ADMIN") };

  return (
    <AdminLayout>
      <PageHead title="Пользователи" text="Поиск по логину, email, имени и фамилии. Новые сверху." />

      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <PillTabs tabs={FILTERS.map((f) => ({ ...f, count: counts[f.key] }))} value={filter} onChange={(k) => { setFilter(k); setPage(0); }} />
        <SearchBox placeholder="Логин, email, имя" className="sm:w-[280px]" onChange={(v) => { setSearchText(v); setPage(0); }} />
      </div>

      {list.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : list.isError ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить пользователей.</p>
      ) : items.length === 0 ? (
        <EmptyState icon={UsersRound} tone="bg-sky" title="Никого не нашлось" text="Попробуйте другую роль или запрос." />
      ) : (
        <div className="w-full overflow-x-auto rounded-[20px] border-2 border-ink bg-card">
          <div className="min-w-[900px]">
            <div className={cn(COLS, "px-4 py-3")}>
              <span className={TH}>Пользователь</span>
              <span className={TH}>Email</span>
              <span className={TH}>Роль</span>
              <span className={TH}>Город</span>
              <span className={TH}>Мер.</span>
              <span className={TH}>Зап.</span>
              <span className={TH}>Рег.</span>
              <span />
            </div>
            {items.map((u, i) => <Row key={u.id} user={u} odd={i % 2 === 1} />)}
            <Pager page={page} size={SIZE} total={data?.totalElements ?? 0} onPage={setPage} />
          </div>
        </div>
      )}

      <p className="text-xs leading-[17px] font-medium text-muted-foreground">
        Мер. — созданных мероприятий, Зап. — подтверждённых записей, Рег. — дата регистрации. Стрелка открывает мероприятия автора.
      </p>
    </AdminLayout>
  );
}
