import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Building2 } from "lucide-react";
import { cn } from "cn";
import { useAdminListOrganizations } from "@/shared/api/generated/core/admin/admin";
import type { AdminListOrganizationsStatus, AdminOrganizationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { ORGANIZATION_STATUS } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { AdminLayout } from "./admin-layout";
import { Chip, LetterTile, PageHead, Pager, PillTabs, SearchBox, TH, toneOf } from "./parts";
import { dateTime } from "./format";

const SIZE = 20;
type Filter = "ALL" | AdminListOrganizationsStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "PENDING", label: "На проверке" },
  { key: "REVISION", label: "Доработка" },
  { key: "APPROVED", label: "Допущены" },
  { key: "REJECTED", label: "Отклонены" },
];

/** Сколько организаций в статусе — для счётчика на вкладке. */
function useCount(status?: AdminListOrganizationsStatus) {
  const q = useAdminListOrganizations({ status, size: 1 });
  return q.data?.status === 200 ? q.data.data.totalElements ?? 0 : 0;
}

/** На телефоне строка — логотип, название со статусом и кнопка; остальные колонки с md. */
const COLS = "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[44px_minmax(0,1fr)_150px_64px_104px_128px_100px] md:gap-3.5";

function Row({ org: o, odd }: { org: AdminOrganizationResponse; odd: boolean }) {
  const status = o.status ? ORGANIZATION_STATUS[o.status] : undefined;
  const pending = o.status === "PENDING";
  return (
    <div className={cn(COLS, "border-b-[1.5px] border-track px-4 py-3", odd && "bg-background/50")}>
      <LetterTile name={o.name} logoUrl={o.logoUrl} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link to={`/admin/organizations/${o.id}`} className="truncate text-sm font-extrabold text-foreground hover:underline">{o.name}</Link>
        <span className="truncate text-xs font-medium text-muted-foreground">{o.city ?? "Город не указан"}</span>
        {status && <Chip tone={status.tone} className="mt-1 self-start text-[10px] md:hidden">{status.label}</Chip>}
      </div>
      <div className="hidden min-w-0 flex-wrap gap-1 md:flex">
        {(o.sports ?? []).slice(0, 2).map((s) => (
          <Chip key={s.id} tone={toneOf(s.name)} className="px-2 py-px text-[10px] normal-case">{s.name}</Chip>
        ))}
        {(o.sports?.length ?? 0) > 2 && <span className="text-[11px] font-bold text-muted-foreground">+{(o.sports?.length ?? 0) - 2}</span>}
      </div>
      <span className="hidden text-sm font-extrabold text-foreground md:block">{o.eventsCount ?? 0}</span>
      <span className="hidden text-xs font-bold text-foreground md:block">{o.submittedAt ? dateTime(o.submittedAt) : "—"}</span>
      <span className="hidden md:block">{status && <Chip tone={status.tone} className="text-[10px]">{status.label}</Chip>}</span>
      <div className="flex justify-end">
        <Button asChild size="sm" variant={pending ? "secondary" : "outline"} className={cn("h-9 px-3.5 text-[13px]", !pending && "shadow-none")}>
          <Link to={`/admin/organizations/${o.id}`}>{pending ? "Проверить" : "Открыть"}</Link>
        </Button>
      </div>
    </div>
  );
}

/** Очередь заявок и все организации: решение принимается в карточке заявки. */
export default function AdminOrganizationsPage() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") as Filter | null) ?? "ALL";
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const status = filter === "ALL" ? undefined : filter;
  const list = useAdminListOrganizations({ status, searchText: searchText || undefined, page, size: SIZE });
  const data = list.data?.status === 200 ? list.data.data : undefined;
  const items = data?.items ?? [];

  const counts: Record<Filter, number> = {
    ALL: useCount(),
    PENDING: useCount("PENDING"),
    REVISION: useCount("REVISION"),
    APPROVED: useCount("APPROVED"),
    REJECTED: useCount("REJECTED"),
  };

  const onFilter = (key: Filter) => {
    setPage(0);
    setParams(key === "ALL" ? {} : { status: key }, { replace: true });
  };

  return (
    <AdminLayout>
      <PageHead title="Организации" text="Очередь заявок и все организации. Решение принимается в карточке заявки." />

      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <PillTabs tabs={FILTERS.map((f) => ({ ...f, count: counts[f.key] }))} value={filter} onChange={onFilter} />
        <SearchBox placeholder="Название организации" onChange={(v) => { setSearchText(v); setPage(0); }} />
      </div>

      {list.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : list.isError ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить организации.</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} tone="bg-sky" title={filter === "PENDING" ? "Очередь пуста" : "Организаций не нашлось"}
          text={filter === "PENDING" ? "Новые заявки клубов появятся здесь." : "Попробуйте другой статус или название."} />
      ) : (
        <div className="w-full overflow-x-auto rounded-[20px] border-2 border-ink bg-card">
          <div className="md:min-w-[900px]">
            <div className={cn(COLS, "hidden bg-background px-4 py-3 md:grid")}>
              <span />
              <span className={TH}>Организация</span>
              <span className={TH}>Виды спорта</span>
              <span className={TH}>Меропр.</span>
              <span className={TH}>Подана</span>
              <span className={TH}>Статус</span>
              <span />
            </div>
            {items.map((o, i) => <Row key={o.id} org={o} odd={i % 2 === 1} />)}
            <Pager page={page} size={SIZE} total={data?.totalElements ?? 0} onPage={setPage} />
          </div>
        </div>
      )}

      <p className="text-xs leading-[17px] font-medium text-muted-foreground">
        «На доработке» — не отказ: организация дополняет анкету, и она снова уходит на проверку.
      </p>
    </AdminLayout>
  );
}
