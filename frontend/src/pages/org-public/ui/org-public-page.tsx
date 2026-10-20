import { OrganizationBlog } from "@/widgets/organization-blog/ui/organization-blog";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  useOrganizationsGet,
  useOrganizationsOverview,
} from "@/shared/api/generated/core/organizations/organizations";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { OrganizationHeader } from "@/widgets/organization-header/ui/organization-header";
import {
  UpcomingMeetings,
  PastMeetings,
} from "@/widgets/organization-meetings/ui/organization-meetings";
import { OrganizationPhotos } from "@/widgets/organization-photos/ui/organization-photos";
import { OrganizationSidebar } from "@/widgets/organization-sidebar/ui/organization-sidebar";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AccountMenu } from "@/features/auth/sign-out/ui/account-menu";
import { OrganizationShare } from "./organization-share";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

/** Публичная организация: два запроса при открытии, архив и галерея догружаются по действию. */
export default function OrgPublicPage() {
  const { id = "" } = useParams();
  const [shareOpen, setShareOpen] = useState(false);
  const profile = useOrganizationsGet(id, { query: { retry: false } });
  const overview = useOrganizationsOverview(id, { query: { retry: false } });
  const org = profile.data?.data;
  const o = overview.data?.data;
  const unavailable = profile.isError || overview.isError;
  const sections = [
    ["overview", "Обзор"],
    ["about", "О клубе"],
    ["upcoming", `Ближайшие ${o?.upcoming.totalElements ?? ""}`],
    ["blog", "Блог"],
    ["past", `Проведённые ${o?.hostedMeetings ?? ""}`],
    ["photos", `Фото ${o?.photosCount ?? ""}`],
  ];
  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-background pb-[110px] lg:pb-16">
      <MemphisBackground seed="org" />
      <div className="hidden lg:block">
        <AppHeader current="orgs" />
      </div>
      <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3 lg:hidden">
        <Link to="/orgs" className="font-display text-sm font-bold">
          ‹ Организации
        </Link>
        <AccountMenu />
      </div>
      <main className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-6 px-4 pt-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="flex min-w-0 items-center gap-3 text-[13px] font-bold"
        >
          <Link
            to="/orgs"
            className="shrink-0 text-muted-foreground hover:underline"
          >
            ‹ Организации
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-extrabold">
            {org?.name || "Организация"}
          </span>
        </nav>
        {unavailable ? (
          <Card className="gap-2 p-6">
            <h1 className="font-display text-xl font-bold">
              Страница недоступна
            </h1>
            <p className="text-muted-foreground">
              Организации нет или она ещё не прошла проверку администратора.
            </p>
            <Button asChild variant="soft" className="self-start">
              <Link to="/orgs">В каталог организаций</Link>
            </Button>
          </Card>
        ) : !org || !o ? (
          <p role="status" className="py-8 font-bold text-muted-foreground">
            Загружаем организацию…
          </p>
        ) : (
          <>
            <OrganizationHeader
              org={org}
              overview={o}
              onShare={() => setShareOpen(true)}
            />
            {shareOpen && (
              <OrganizationShare
                key={id}
                path={`/orgs/${id}`}
                org={org}
                overview={o}
                onOpenChange={setShareOpen}
              />
            )}
            <nav
              aria-label="Разделы организации"
              className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
            >
              {sections.map(([key, label], i) => (
                <Button
                  key={key}
                  asChild
                  size="chip"
                  variant={i === 0 ? "default" : "soft"}
                >
                  <a href={`#${key}`}>{label}</a>
                </Button>
              ))}
            </nav>
            {/* «О клубе» видно сразу: на телефоне — над встречами, на компьютере — первым в правой колонке. */}
            <div className="grid grid-cols-1 min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
              <Card id="about" className="scroll-mt-6 gap-3 p-5 lg:col-start-2 lg:row-start-1">
                <h2 className="font-display text-[23px] font-extrabold">
                  О клубе
                </h2>
                <p className="text-base leading-7 whitespace-pre-wrap break-words">
                  {org.description || "Клуб пока не добавил описание."}
                </p>
              </Card>
              <div className="flex min-w-0 flex-col gap-9 lg:col-start-1 lg:row-span-2 lg:row-start-1">
                <UpcomingMeetings id={id} overview={o} />
                <OrganizationBlog organizationId={id} />
                <PastMeetings key={id} id={id} overview={o} />
              </div>
              {/* Фото — отдельной строкой на всю ширину под обеими колонками; на телефоне — перед боковой панелью. */}
              <div className="min-w-0 lg:col-span-2 lg:row-start-3">
                <OrganizationPhotos id={id} overview={o} />
              </div>
              <div className="min-w-0 lg:col-start-2 lg:row-start-2">
                <OrganizationSidebar org={org} overview={o} />
              </div>
            </div>
          </>
        )}
      </main>
      <MobileTabBar current="orgs" />
    </div>
  );
}
