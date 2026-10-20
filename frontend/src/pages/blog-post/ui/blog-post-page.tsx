import { useState } from "react";
import { cn } from "cn";
import { Link, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, PenLine, Trash2 } from "lucide-react";
import { useBlogDelete, useBlogGet, useBlogList } from "@/shared/api/generated/core/blog/blog";
import type { BlogPostResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/shared/components/ui/dialog";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Markdown } from "@/shared/components/ui/markdown";
import { toast } from "@/shared/lib/toast";
import { Icon } from "@/shared/components/ui/icon";
import { ImageLightbox } from "@/shared/components/ui/image-lightbox";
import { BlogShare } from "./blog-share";

const TOP = "h-10 shrink-0 px-[18px] text-sm leading-[19px]";
import { authorHref, authorName, eventDate, shortDate } from "@/entity/blog/lib/post";
import { LikeButton } from "@/features/blog-like/ui/like-button";
import { BlogShell } from "@/widgets/blog-shell/ui/blog-shell";
import { BlogPostRow, PostTypeChips, WasThereBadge } from "@/widgets/blog-post-card/ui/blog-post-card";
import { BlogTrainings } from "@/widgets/blog-trainings/ui/blog-trainings";
import { BlogComments } from "@/widgets/blog-comments/ui/blog-comments";

/** Фото после текста сеткой; нажатие открывает просмотр во всплывающем окне (onOpen — номер среди фото поста). */
function Gallery({ photos, onOpen }: { photos: BlogPostResponse["photos"]; onOpen(index: number): void }) {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p, i) => (
        <button key={p.id} type="button" onClick={() => onOpen(i)} aria-label={`Открыть фото${p.caption ? `: ${p.caption}` : ""}`}
          className={cn("cursor-zoom-in text-left", i === 0 && photos.length % 2 === 1 && "col-span-2 sm:col-span-1")}>
          <figure className="box-border flex h-full flex-col overflow-hidden rounded-[16px] border-2 border-ink bg-card">
            <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover"
              style={{ objectPosition: p.focus ? `${p.focus.x}% ${p.focus.y}%` : undefined }} />
            {p.caption && <figcaption className="px-3 py-2 text-xs font-semibold text-muted-foreground">{p.caption}</figcaption>}
          </figure>
        </button>
      ))}
    </div>
  );
}

/** Под постом: ещё посты с этой встречи или гайды по виду спорта и «Тоже был там?». */
function MoreBelow({ data }: { data: BlogPostResponse }) {
  const post = data.post;
  const more = useBlogList(post.event ? { eventId: post.event.id, size: 4 } : { type: "GUIDE", sportId: post.sport?.id, size: 4 });
  const others = (more.data?.status === 200 ? more.data.data.items : []).filter((p) => p.id !== post.id).slice(0, 3);
  const wasThere = post.event && !data.viewer.isMine;
  if (!others.length && !wasThere) return null;
  return (
    <div className={cn("grid grid-cols-1 gap-6 lg:gap-8", others.length > 0 && wasThere && "lg:grid-cols-[minmax(0,1fr)_376px]")}>
      {others.length > 0 && (
        <Card className="gap-3 p-[22px]">
          <h2 className="font-display text-[17px] leading-6 font-bold text-foreground">{post.event ? "Ещё с этой встречи" : "Ещё гайды"}</h2>
          {others.map((p) => <BlogPostRow key={p.id} post={p} />)}
        </Card>
      )}
      {post.event && wasThere && (
        <Card className="gap-3 self-start bg-secondary p-[22px] shadow-hard">
          <h2 className="font-display text-lg leading-6 font-bold text-foreground">Тоже был там?</h2>
          <p className="text-sm leading-5 font-semibold text-foreground">Расскажи свою версию — пост появится на странице встречи рядом с этим.</p>
          <Button asChild variant="ink"><Link to={`/blog/new?eventId=${post.event.id}`}><PenLine className="size-4" /> Написать пост</Link></Button>
        </Card>
      )}
    </div>
  );
}

/** Пост блога: заголовок, автор, встреча, обложка, Markdown, фото, лайк, виджет «Наши тренировки» и комментарии. */
export default function BlogPostPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useBlogGet(id);
  const data = query.data?.status === 200 ? query.data.data : undefined;
  const [confirm, setConfirm] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const remove = useBlogDelete({ mutation: {
    onSuccess: () => {
      toast.success("Пост удалён");
      void queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/blog") });
      navigate("/blog");
    },
    onError: (e) => toast.error(e.detail ?? "Не удалось удалить пост"),
  } });

  if (query.isPending) return <BlogShell><p role="status" className="font-semibold text-muted-foreground">Загружаем пост…</p></BlogShell>;
  if (!data) {
    return (
      <BlogShell>
        <EmptyState icon={MessageCircle} title="Пост не найден" text="Возможно, автор его удалил или ещё не опубликовал."
          action={<Button asChild><Link to="/blog">В блог</Link></Button>} />
      </BlogShell>
    );
  }
  const post = data.post;
  const cover = data.photos[0];

  return (
    <BlogShell>
      {/* как верхняя панель встречи: «К блогу» слева, действия справа */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="soft" className={TOP}>
          <Link to="/blog"><Icon name="event/icon-back" className="size-[18px]" />К блогу</Link>
        </Button>
        <div className="ml-auto flex gap-2">
          {data.viewer.canEdit && (
            <Button asChild variant="soft" className={TOP}><Link to={`/blog/${post.id}/edit`}><PenLine className="size-[18px]" /><span className="hidden sm:inline">Изменить</span></Link></Button>
          )}
          {data.viewer.canDelete && (
            <Button variant="soft" className={TOP} onClick={() => setConfirm(true)} aria-label="Удалить пост"><Trash2 className="size-[18px]" /><span className="hidden sm:inline">Удалить</span></Button>
          )}
          {post.status === "PUBLISHED" && (
            <Button variant="soft" className={TOP} onClick={() => setShareOpen(true)}>
              <Icon name="event/icon-share" className="size-[18px]" />
              <span className="hidden sm:inline">Поделиться</span>
            </Button>
          )}
        </div>
      </div>
      <BlogShare data={data} open={shareOpen} onOpenChange={setShareOpen} />

      <Card className="gap-6 p-5 shadow-hard sm:p-10">
        <PostTypeChips post={post} />
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {post.sport && <span className="text-[13px] font-bold text-primary">{post.sport.name}</span>}
          <span className="text-[13px] font-bold text-muted-foreground">· {post.readMinutes} мин чтения</span>
        </div>
        <h1 className="-mt-3 font-display text-[28px] leading-[34px] font-bold text-foreground sm:text-[34px] sm:leading-[41px]">{post.title}</h1>
        <div className="flex items-center gap-3">
          <Link to={authorHref(post.author, post.organization)}>
            <Disc initials="" user={post.author} tone={post.organization ? "bg-secondary" : "bg-sky"} className="size-11" textClassName="text-sm" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={authorHref(post.author, post.organization)} className="text-[15px] font-extrabold text-foreground hover:underline">
                {authorName(post.author, post.organization)}
              </Link>
              {post.authorWasThere && <WasThereBadge />}
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground">
              {post.status === "DRAFT" ? "Черновик — видишь только ты" : shortDate(post.publishedAt)}
            </p>
          </div>
        </div>

        {post.event && (
          <Link to={`/events/${post.event.id}`}
            className="box-border flex items-center gap-3.5 rounded-[18px] border-2 border-ink bg-lavender-soft p-3.5 transition-colors hover:bg-muted">
            <img src={post.event.coverUrl ?? post.event.sport.imageUrl} alt="" className="size-14 shrink-0 rounded-[12px] border-2 border-ink object-cover" />
            <span className="min-w-0 flex-1">
              <Eyebrow className="text-primary">Написано после встречи</Eyebrow>
              <span className="mt-0.5 block truncate text-base font-extrabold text-foreground">{post.event.title}</span>
              <span className="block truncate text-[13px] font-semibold text-muted-foreground">
                {eventDate(post.event)} · {post.event.organization ? `организатор ${post.event.organization.name}` : `организатор ${authorName(post.event.organizer)}`}
              </span>
            </span>
            <ArrowRight className="hidden size-5 shrink-0 sm:block" />
          </Link>
        )}

        {cover && (
          <button type="button" onClick={() => setViewing(0)} className="cursor-zoom-in" aria-label="Открыть обложку">
            <img src={cover.url} alt={cover.caption ?? ""} className="box-border max-h-[480px] w-full rounded-[20px] border-2 border-ink object-cover"
              style={{ objectPosition: cover.focus ? `${cover.focus.x}% ${cover.focus.y}%` : undefined }} />
          </button>
        )}

        <Markdown text={data.body} />
        <Gallery photos={data.photos.slice(1)} onOpen={(i) => setViewing(i + 1)} />

        <div className="flex items-center gap-3">
          <LikeButton postId={post.id} liked={post.likedByMe} count={post.likesCount} disabled={!data.viewer.canLike} />
          <a href="#blog-comments" className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-foreground">
            <MessageCircle className="size-[18px]" strokeWidth={2.4} /> {post.commentsCount}
          </a>
        </div>

        {data.widget && <BlogTrainings widget={data.widget} />}

        <BlogComments postId={post.id} canComment={data.viewer.canComment} blockedReason={data.viewer.commentBlockedReason} />
      </Card>
      <MoreBelow data={data} />
      <ImageLightbox images={data.photos} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Удалить пост?</DialogTitle>
          <DialogDescription>Пост пропадёт из блога вместе с лайками и комментариями. Вернуть его не получится.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Оставить</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate({ id: post.id })}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BlogShell>
  );
}
