import FeedPage from "@/pages/feed/ui/feed-page";

export function meta() {
  return [
    { title: "Лента" },
    { name: "description", content: "События и тренировки рядом с тобой." },
  ];
}

export default function FeedRoute() {
  return <FeedPage />;
}
