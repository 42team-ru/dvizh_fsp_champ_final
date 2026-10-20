import BlogPostPage from "@/pages/blog-post/ui/blog-post-page";

export function meta() {
  return [{ title: "Пост в блоге" }];
}

export default function BlogPostRoute() {
  return <BlogPostPage />;
}
