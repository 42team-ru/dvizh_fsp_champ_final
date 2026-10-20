import { Link } from "react-router";
import { PenLine } from "lucide-react";
import { cn } from "cn";
import { useBlogList, useBlogMine } from "@/shared/api/generated/core/blog/blog";
import { Button } from "@/shared/components/ui/button";
import { BlogPostCard, BlogPostRow } from "@/widgets/blog-post-card/ui/blog-post-card";

/**
 * Блог в профиле. Свой — с черновиками (открываются в редакторе) и кнопкой «Написать», чужой — только опубликованное.
 * `compact` — для мобильного профиля: строками вместо карточек.
 */
export function ProfileBlog({ userId, mine, compact, className }: { userId: string; mine: boolean; compact?: boolean; className?: string }) {
  const own = useBlogMine({ size: 6 }, { query: { enabled: mine } });
  const other = useBlogList({ authorId: userId, size: 6 }, { query: { enabled: !mine } });
  const query = mine ? own : other;
  const page = query.data?.status === 200 ? query.data.data : undefined;
  const posts = page?.items ?? [];
  if (!mine && posts.length === 0) return null;

  return (
    <section aria-labelledby="profile-blog" className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <h2 id="profile-blog" className={cn("font-display font-extrabold text-foreground", compact ? "text-xl" : "text-[28px]")}>Блог</h2>
        {page && page.totalElements > 0 && <span className="text-sm font-bold text-muted-foreground">{page.totalElements}</span>}
        {mine && (
          <Button asChild size="sm" className="ml-auto">
            <Link to="/blog/new"><PenLine className="size-4" /> Написать</Link>
          </Button>
        )}
      </div>
      {posts.length === 0 ? (
        <p className="rounded-[18px] border-2 border-dashed border-ink/40 bg-card px-5 py-4 text-[15px] font-semibold text-muted-foreground">
          Здесь появятся твои посты: гайды и рассказы с встреч. После тренировки бобёр подскажет, о чём написать.
        </p>
      ) : compact ? (
        <div className="flex flex-col gap-2.5">
          {posts.map((p) => <BlogPostRow key={p.id} post={p} href={p.status === "DRAFT" ? `/blog/${p.id}/edit` : undefined} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {posts.map((p) => <BlogPostCard key={p.id} post={p} href={p.status === "DRAFT" ? `/blog/${p.id}/edit` : undefined} />)}
        </div>
      )}
    </section>
  );
}
