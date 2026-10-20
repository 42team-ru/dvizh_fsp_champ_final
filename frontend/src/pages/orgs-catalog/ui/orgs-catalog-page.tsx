import { useState } from "react";
import { Link } from "react-router";
import { Building2, Search } from "lucide-react";
import {
  useOrganizationsList,
  useOrganizationsCities,
} from "@/shared/api/generated/core/organizations/organizations";
import { useSportsSearch } from "@/shared/api/generated/core/sports/sports";
import { SubscribeButton } from "@/features/organization-subscription/ui/subscribe-button";
import { AccountMenu } from "@/features/auth/sign-out/ui/account-menu";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { monthLabel } from "@/shared/lib/date-ru";

export default function OrgsCatalogPage() {
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [sport, setSport] = useState("all");
  const [page, setPage] = useState(0);
  const cities = useOrganizationsCities();
  const sports = useSportsSearch();
  const query = useOrganizationsList({
    searchText: search || undefined,
    city: city === "all" ? undefined : city,
    sportId: sport === "all" ? undefined : sport,
    mine,
    page,
    size: 12,
  });
  const data = query.data?.data;
  return (
    <div className="min-h-dvh bg-background pb-[110px] lg:pb-16">
      <div className="hidden lg:block">
        <AppHeader current="orgs" />
      </div>
      <header className="flex items-center justify-between border-b-2 border-ink px-4 py-3 lg:hidden">
        <Link to="/" className="font-display text-lg font-bold">
          Движ
        </Link>
        <AccountMenu />
      </header>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-6 lg:px-8 lg:pt-8">
        <div>
          <h1 className="font-display text-[28px] font-extrabold lg:text-[36px]">
            Организации
          </h1>
          <p className="mt-2 text-base font-semibold text-muted-foreground">
            Найдите свой клуб и подпишитесь на новые встречи
          </p>
        </div>
        <div
          className="flex gap-2"
          role="group"
          aria-label="Каталог организаций"
        >
          <Button
            variant={!mine ? "default" : "soft"}
            aria-pressed={!mine}
            onClick={() => {
              setMine(false);
              setPage(0);
            }}
          >
            Все
          </Button>
          <Button
            variant={mine ? "default" : "soft"}
            aria-pressed={mine}
            onClick={() => {
              setMine(true);
              setPage(0);
            }}
          >
            Мои
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Поиск по названию или описанию"
              placeholder="Название клуба или описание"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="bg-card pl-10"
            />
          </label>
          <Select
            value={city}
            onValueChange={(v) => {
              setCity(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full bg-card" aria-label="Город">
              <SelectValue placeholder="Все города" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все города</SelectItem>
              {cities.data?.data.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sport}
            onValueChange={(v) => {
              setSport(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full bg-card" aria-label="Вид спорта">
              <SelectValue placeholder="Все виды спорта" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все виды спорта</SelectItem>
              {sports.data?.data.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {query.isPending ? (
          <p role="status" className="py-8 font-bold text-muted-foreground">
            Загружаем клубы…
          </p>
        ) : query.isError ? (
          <Card className="gap-3 p-6">
            <p role="alert">Не удалось загрузить организации.</p>
            <Button
              variant="soft"
              className="self-start"
              onClick={() => void query.refetch()}
            >
              Повторить
            </Button>
          </Card>
        ) : data?.items.length === 0 ? (
          <>
            <EmptyState
              icon={Building2}
              tone="bg-lime-soft"
              title={mine ? "Здесь будут ваши клубы" : "Организации не найдены"}
              text={
                mine
                  ? "Подпишитесь на клуб или сходите на его встречу — он появится здесь."
                  : "Попробуйте другой запрос, город или вид спорта."
              }
            />
            <Button
              className="self-start"
              variant="secondary"
              onClick={() => {
                setMine(false);
                setSearch("");
                setCity("all");
                setSport("all");
                setPage(0);
              }}
            >
              Все организации
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data?.items.map((org) => (
                <Card key={org.id} className="gap-4 p-5 shadow-hard-sm">
                  <div className="flex items-center gap-4">
                    <Link
                      to={`/orgs/${org.id}`}
                      aria-label={org.name}
                      className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-ink bg-lime font-display text-[36px] font-extrabold"
                    >
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        org.name[0]
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to={`/orgs/${org.id}`}
                        className="font-display text-base font-bold break-words hover:underline"
                      >
                        {org.name}
                      </Link>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        {org.city}
                      </p>
                    </div>
                  </div>
                  {org.awardMonth && (
                    <Badge className="h-auto self-start bg-ink py-1 text-lime">
                      Организация месяца · {monthLabel(org.awardMonth)}
                    </Badge>
                  )}
                  <p className="line-clamp-2 text-sm font-medium text-muted-foreground">
                    {org.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {org.sports.map((s) => (
                      <Badge
                        key={s.id}
                        variant="outline"
                        className="bg-sky-soft"
                      >
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                  {mine && (
                    <div className="flex flex-wrap gap-2">
                      {org.subscribed && (
                        <Badge variant="secondary">Подписка</Badge>
                      )}
                      {org.attended && (
                        <Badge variant="outline">Вы были на встречах</Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap justify-between gap-2 text-xs font-bold text-muted-foreground">
                    <span>{org.hostedMeetings} встреч проведено</span>
                    <span>{org.subscribersCount} подписчиков</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button asChild variant="soft" size="sm">
                      <Link to={`/orgs/${org.id}`}>О клубе →</Link>
                    </Button>
                    <SubscribeButton
                      id={org.id}
                      subscribed={org.subscribed}
                      compact
                    />
                  </div>
                </Card>
              ))}
            </div>
            {data && data.totalPages > 1 && (
              <nav
                aria-label="Страницы каталога"
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <Button
                  variant="soft"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Назад
                </Button>
                <span className="text-sm font-bold">
                  {page + 1} из {data.totalPages}
                </span>
                <Button
                  variant="soft"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Дальше
                </Button>
              </nav>
            )}
          </>
        )}
      </main>
      <MobileTabBar current="orgs" />
    </div>
  );
}
