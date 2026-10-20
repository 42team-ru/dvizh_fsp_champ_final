import { Link } from "react-router";
import { Camera, Check, MessageCircle } from "lucide-react";
import { cn } from "cn";
import type { BlogPostSummaryResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Card } from "@/shared/components/ui/card";
import { Disc } from "@/shared/components/ui/disc";
import { BLOG_POST_STATUS, BLOG_POST_TYPE } from "@/shared/lib/statuses";
import { authorName, postCover, shortDate } from "@/entity/blog/lib/post";
import { LikeButton } from "@/features/blog-like/ui/like-button";

/** Плашка вида поста («Гайд», «С тренировки»); черновик — отдельной плашкой рядом. */
export function PostTypeChips({ post, className }: { post: Pick<BlogPostSummaryResponse, "type" | "status">; className?: string }) {
  const type = BLOG_POST_TYPE[post.type];
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      <span className={cn("box-border inline-flex h-[26px] items-center rounded-pill border-[1.5px] border-ink px-2.5 text-[11px] font-extrabold tracking-[0.6px] uppercase", type.tone)}>
        {type.label}
      </span>
      {post.status === "DRAFT" && (
        <span className={cn("box-border inline-flex h-[26px] items-center rounded-pill border-[1.5px] border-ink px-2.5 text-[11px] font-extrabold tracking-[0.6px] uppercase", BLOG_POST_STATUS.DRAFT.tone)}>
          {BLOG_POST_STATUS.DRAFT.label}
        </span>
      )}
    </span>
  );
}

/** Строка над заголовком: «Бег · «Енисей» · 24 окт». */
function meta(post: BlogPostSummaryResponse) {
  return [post.sport?.name ?? post.event?.sport.name, post.event?.organization?.name, shortDate(post.publishedAt ?? post.updatedAt)]
    .filter(Boolean).join(" · ");
}

/**
 * Карточка поста в ленте блога: обложка с плашками, вид спорта и дата, заголовок, начало текста, автор,
 * лайк и число комментариев. Вся карточка — ссылка на пост; лайк нажимается отдельно.
 */
export function BlogPostCard({ post, className, href }: { post: BlogPostSummaryResponse; className?: string; href?: string }) {
  const cover = postCover(post);
  const to = href ?? `/blog/${post.id}`;
  return (
    <Card interactive className={cn("relative overflow-hidden shadow-hard", className)}>
      <Link to={to} aria-label={post.title} className="absolute inset-0 z-[1] rounded-card focus-visible:outline-2 focus-visible:outline-ink" />
      <div className="relative h-[190px] shrink-0 border-b-2 border-ink bg-muted">
        {cover && <img src={cover.src} alt="" loading="lazy" className="size-full object-cover" style={{ objectPosition: cover.position }} />}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <PostTypeChips post={post} />
          {post.photosCount > 1 && (
            <span className="box-border inline-flex h-[26px] items-center gap-1 rounded-pill border-[1.5px] border-ink bg-card px-2.5 text-[11px] font-extrabold">
              <Camera className="size-3.5" /> {post.photosCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-[18px]">
        <p className="truncate text-xs leading-4 font-bold text-primary">{meta(post)}</p>
        <h3 className="font-display text-lg leading-[23px] font-bold text-foreground line-clamp-3">{post.title}</h3>
        <p className="text-sm leading-5 font-medium text-muted-foreground line-clamp-3">{post.excerpt}</p>
        <div className="mt-auto flex items-center gap-2.5 pt-1">
          <Disc initials="" user={post.author} tone={post.organization ? "bg-secondary" : "bg-sky"} className="size-7" textClassName="text-[10px]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">{authorName(post.author, post.organization)}</span>
          {post.status === "PUBLISHED" && <LikeButton postId={post.id} liked={post.likedByMe} count={post.likesCount} size="sm" />}
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-foreground" aria-label={`${post.commentsCount} комментариев`}>
            <MessageCircle className="size-4" strokeWidth={2.4} /> {post.commentsCount}
          </span>
        </div>
      </div>
    </Card>
  );
}

/** Мини-строка поста: для боковых колонок, профиля, страницы встречи и клуба. */
export function BlogPostRow({ post, className, href }: { post: BlogPostSummaryResponse; className?: string; href?: string }) {
  const cover = postCover(post);
  return (
    <Link to={href ?? `/blog/${post.id}`}
      className={cn("box-border flex items-center gap-3 rounded-[16px] border-2 border-ink bg-card p-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ink", className)}>
      <span className="size-16 shrink-0 overflow-hidden rounded-[12px] border-2 border-ink bg-muted">
        {cover && <img src={cover.src} alt="" loading="lazy" className="size-full object-cover" style={{ objectPosition: cover.position }} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <PostTypeChips post={post} />
        <span className="text-sm leading-[18px] font-extrabold text-foreground line-clamp-2">{post.title}</span>
        <span className="truncate text-xs font-semibold text-muted-foreground">
          {authorName(post.author, post.organization)} · ♥ {post.likesCount} · {post.commentsCount} комм.
        </span>
      </span>
    </Link>
  );
}

/** «был на встрече» рядом с именем автора поста с тренировки. */
export function WasThereBadge() {
  return (
    <span className="box-border inline-flex h-6 items-center gap-1 rounded-pill border-[1.5px] border-ink bg-lime-soft px-2 text-[11px] font-extrabold">
      <Check className="size-3" strokeWidth={3} /> был на встрече
    </span>
  );
}
