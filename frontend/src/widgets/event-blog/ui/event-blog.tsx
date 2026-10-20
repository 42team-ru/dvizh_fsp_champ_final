import { Link } from "react-router";
import { PenLine } from "lucide-react";
import { cn } from "cn";
import { useBlogList } from "@/shared/api/generated/core/blog/blog";
import type { EventResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { BlogPostRow } from "@/widgets/blog-post-card/ui/blog-post-card";

/**
 * Блог на странице встречи. После начала: тем, кто был (участник или организатор), — «Как прошла встреча?»
 * с кнопкой «Написать пост» и твоим бобром; всем — «Посты участников». До начала — «Гайды к встрече» по виду спорта.
 */
export function EventBlog({ event, className }: { event: EventResponse; className?: string }) {
  const started = new Date(event.startAt).getTime() <= Date.now();
  const wasThere = event.viewer.isOrganizer || event.viewer.registrationStatus === "CONFIRMED";
  const reports = useBlogList({ eventId: event.id, size: 3 }, { query: { enabled: started } });
  const guides = useBlogList({ type: "GUIDE", sportId: event.sport.id, size: 2 }, { query: { enabled: !started } });
  const posts = ((started ? reports : guides).data?.status === 200 ? (started ? reports : guides).data!.data.items : []);
  const canWrite = started && wasThere && event.status !== "DELETED";
  if (!canWrite && posts.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {canWrite && (
        <Card className="relative flex-row items-center gap-4 overflow-hidden bg-secondary p-5 shadow-hard">
          <MyBeaverBadge pose="think" className="size-[92px] shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl leading-6 font-bold text-foreground">Как прошла встреча?</h2>
            <p className="mt-1 text-sm leading-5 font-semibold text-foreground">
              Расскажи в блоге — пост появится здесь, а фото возьмём из альбома встречи.
            </p>
            <Button asChild variant="ink" size="sm" className="mt-3">
              <Link to={`/blog/new?eventId=${event.id}`}><PenLine className="size-4" /> Написать пост</Link>
            </Button>
          </div>
        </Card>
      )}
      {posts.length > 0 && (
        <Card className="gap-3 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg leading-6 font-bold text-foreground">{started ? "Посты участников" : "Гайды к встрече"}</h2>
            <Link to="/blog" className="ml-auto text-sm font-bold text-primary hover:underline">Весь блог →</Link>
          </div>
          {posts.map((p) => <BlogPostRow key={p.id} post={p} />)}
        </Card>
      )}
    </div>
  );
}
