import HomePage from "@/pages/home/ui/home-page";

export function meta() {
  return [
    { title: "Главная" },
    { name: "description", content: "События и тренировки рядом с тобой." },
  ];
}

export default function HomeRoute() {
  return <HomePage />;
}
