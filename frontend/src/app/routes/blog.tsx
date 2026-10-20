import BlogPage from "@/pages/blog/ui/blog-page";

export function meta() {
  return [
    { title: "Блог" },
    { name: "description", content: "Гайды и истории с тренировок от участников, организаторов и клубов." },
  ];
}

export default function BlogRoute() {
  return <BlogPage />;
}
