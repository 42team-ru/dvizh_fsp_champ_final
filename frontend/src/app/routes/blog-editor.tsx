import BlogEditorPage from "@/pages/blog-editor/ui/blog-editor-page";

export function meta() {
  return [{ title: "Пост для блога" }];
}

export default function BlogEditorRoute() {
  return <BlogEditorPage />;
}
