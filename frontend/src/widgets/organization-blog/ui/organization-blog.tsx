import { useBlogList } from "@/shared/api/generated/core/blog/blog";
import { BlogPostCard } from "@/widgets/blog-post-card/ui/blog-post-card";

/** «Блог клуба» на публичной странице: гайды от имени клуба и посты участников о его встречах. Пусто — блока нет. */
export function OrganizationBlog({ organizationId }: { organizationId: string }) {
  const query = useBlogList({ organizationId, size: 4 });
  const posts = query.data?.status === 200 ? query.data.data.items : [];
  if (posts.length === 0) return null;
  return (
    <section id="blog" className="flex scroll-mt-6 flex-col gap-4">
      <h2 className="font-display text-[23px] font-extrabold">Блог клуба</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {posts.map((p) => <BlogPostCard key={p.id} post={p} />)}
      </div>
    </section>
  );
}
