import { useState } from "react";
import { Link } from "react-router";
import { BookOpen, PenLine, Search } from "lucide-react";
import { cn } from "cn";
import { useBlogList, useBlogMine, useBlogTopAuthors } from "@/shared/api/generated/core/blog/blog";
import type { BlogListType, BlogPostSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Input } from "@/shared/components/ui/input";
import { plural } from "@/shared/lib/plural";
import { useNavAccess } from "@/entity/user/model/use-nav-access";
import { authorHref, authorName } from "@/entity/blog/lib/post";
import { BlogShell } from "@/widgets/blog-shell/ui/blog-shell";
import { BlogPostCard } from "@/widgets/blog-post-card/ui/blog-post-card";
import { BlogPrompt } from "@/widgets/blog-prompt/ui/blog-prompt";

type Tab = "all" | "GUIDE" | "EVENT_REPORT" | "mine";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "GUIDE", label: "Гайды" },
  { key: "EVENT_REPORT", label: "С тренировок" },
  { key: "mine", label: "Мои посты" },
];
const STEP = 12;

function useBlogFeed(tab: Tab, searchText: string, size: number) {
  const feed = useBlogList({
    type: tab === "all" || tab === "mine" ? undefined : (tab as BlogListType),
    searchText: searchText.trim() || undefined,
    size,
  }, { query: { enabled: tab !== "mine", placeholderData: (prev) => prev } });
  const mine = useBlogMine({ size }, { query: { enabled: tab === "mine" } });
  const query = tab === "mine" ? mine : feed;
  const page = query.data?.status === 200 ? query.data.data : undefined;
  return { query, items: (page?.items ?? []) as BlogPostSummaryResponse[], total: page?.totalElements ?? 0 };
}

function Authors() {
  const query = useBlogTopAuthors({ limit: 3 });
  const authors = query.data?.status === 200 ? query.data.data : [];
  if (!authors.length) return null;
  return (
    <Card className="gap-3.5 p-[22px]">
      <h2 className="font-display text-lg leading-6 font-bold text-foreground">Авторы недели</h2>
      {authors.map((a) => (
        <Link key={a.author.id} to={authorHref(a.author, a.organization)}
          className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-1.5 transition-colors hover:bg-muted">
          <Disc initials="" user={a.author} tone={a.organization ? "bg-secondary" : "bg-peach"} className="size-10" textClassName="text-sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold text-foreground">{authorName(a.author, a.organization)}</span>
            <span className="block text-xs font-semibold text-muted-foreground">
              {a.postsCount} {plural(a.postsCount, ["пост", "поста", "постов"])}{a.organization ? " · организация" : ""}
            </span>
          </span>
        </Link>
      ))}
    </Card>
  );
}

function Kinds() {
  return (
    <Card className="gap-2 bg-sky-soft p-5">
      <h2 className="font-display text-base leading-5 font-bold text-foreground">Два вида постов</h2>
      <p className="text-sm leading-5 font-medium text-foreground"><b>Гайд</b> — совет без даты: как начать, что взять, куда пойти.</p>
      <p className="text-sm leading-5 font-medium text-foreground">
        <b>С тренировки</b> — фото и впечатления о встрече, где ты был. Пишется после её окончания.
      </p>
    </Card>
  );
}

/** Лента блога: вкладки, поиск, сетка постов; сбоку — «Как прошла встреча?» с твоим бобром и авторы недели. */
export default function BlogPage() {
  const nav = useNavAccess();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [size, setSize] = useState(STEP);
  const { query, items, total } = useBlogFeed(tab, search, size);
  const tabs = nav.canCreate ? TABS : TABS.filter((t) => t.key !== "mine");

  return (
    <BlogShell>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <h1 className="hidden font-display text-[48px] leading-[56px] font-black tracking-[-1px] text-foreground lg:block">Блог</h1>
          <p className="text-[15px] leading-[22px] font-medium text-muted-foreground lg:mt-2 lg:text-[17px]">
            Гайды и истории с тренировок. Пишут участники, организаторы и клубы.
          </p>
        </div>
        {nav.canCreate && (
          <Button asChild size="lg" className="hidden lg:inline-flex">
            <Link to="/blog/new"><PenLine className="size-[18px]" /> Написать пост</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Какие посты" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          {tabs.map((t) => (
            <Button key={t.key} role="tab" aria-selected={tab === t.key} size="chip" variant={tab === t.key ? "ink" : "soft"}
              className="shrink-0" onClick={() => { setTab(t.key); setSize(STEP); }}>
              {t.label}
            </Button>
          ))}
        </div>
        {tab !== "mine" && (
          <label className="relative lg:ml-auto lg:w-[320px]">
            <span className="sr-only">Поиск по блогу</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск: бег, шахматы, новичкам…" className="h-11 pl-11" />
          </label>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_376px] lg:gap-8">
        <div className="flex flex-col gap-6">
          <div className="lg:hidden"><BlogPrompt compact /></div>
          {query.isPending && <p className="text-[15px] font-semibold text-muted-foreground" role="status">Загружаем посты…</p>}
          {query.isError && <p role="alert" className="text-[15px] font-semibold text-destructive">Не удалось загрузить блог. Обновите страницу.</p>}
          {query.isSuccess && items.length === 0 && (
            <EmptyState icon={BookOpen} tone="bg-sky"
              title={tab === "mine" ? "Ты ещё ничего не написал" : search ? "Ничего не нашлось" : "Здесь пока пусто"}
              text={tab === "mine" ? "Сходи на встречу и расскажи, как всё прошло, — или напиши гайд для новичков." : "Попробуй другую вкладку или поиск."}
              action={nav.canCreate && <Button asChild><Link to="/blog/new">Написать пост</Link></Button>} />
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((post) => (
              <BlogPostCard key={post.id} post={post} href={post.status === "DRAFT" ? `/blog/${post.id}/edit` : undefined} />
            ))}
          </div>
          {items.length < total && (
            <Button variant="outline" className="self-center" onClick={() => setSize((s) => Math.min(s + STEP, 50))}
              disabled={size >= 50}>
              Показать ещё
            </Button>
          )}
        </div>
        <aside className="hidden flex-col gap-6 lg:flex">
          <BlogPrompt />
          <Authors />
          <Kinds />
        </aside>
      </div>

      {nav.canCreate && (
        <Button asChild size="lg" className={cn("fixed right-4 bottom-[104px] z-30 shadow-hard lg:hidden")}>
          <Link to="/blog/new"><PenLine className="size-[18px]" /> Написать</Link>
        </Button>
      )}
    </BlogShell>
  );
}
