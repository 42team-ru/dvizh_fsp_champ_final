import { ShareDialog } from "@/features/share-link/ui/share-dialog";
import { SharePost } from "@/features/share-link/ui/share-posters";
import type { BlogPostResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { BLOG_POST_TYPE } from "@/shared/lib/statuses";
import { authorName, eventDate, postCover, shortDate } from "@/entity/blog/lib/post";

/** «Поделиться» постом: то же окно, что у встречи, — афиша с QR, скачивание PNG, ссылка и мессенджеры. */
export function BlogShare({ data, open, onOpenChange }: {
  data: BlogPostResponse;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const post = data.post;
  // черновик не раздаём: по ссылке его всё равно никто, кроме автора, не увидит
  if (post.status !== "PUBLISHED") return null;
  const path = `/blog/${post.id}`;
  const type = BLOG_POST_TYPE[post.type].label;
  const rows = [
    { label: "АВТОР", value: authorName(post.author, post.organization) },
    post.event
      ? { label: "ВСТРЕЧА", value: `${post.event.title} · ${eventDate(post.event)}` }
      : { label: "ДАТА", value: shortDate(post.publishedAt) },
    { label: "ЧТЕНИЕ", value: `${post.readMinutes} мин · ♥ ${post.likesCount} · ${post.commentsCount} комм.` },
  ];
  return (
    <ShareDialog
      open={open}
      onOpenChange={onOpenChange}
      path={path}
      title="Поделиться постом"
      filename={post.title}
      description="Отправь пост друзьям в чат или выложи в сторис. По QR и ссылке сразу откроется пост."
    >
      {(format) => (
        <SharePost
          format={format}
          path={path}
          kind={type}
          chips={[type, post.sport?.name ?? post.event?.sport.name ?? ""]}
          title={post.title}
          rows={rows}
          cover={postCover(post)}
        />
      )}
    </ShareDialog>
  );
}
