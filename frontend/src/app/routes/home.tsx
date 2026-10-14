import HomePage from "@/pages/home/ui/home-page";

export function meta() {
  return [
    { title: "NaturalQL — SQL на естественном языке" },
    { name: "description", content: "Задавайте вопросы к данным на русском языке без знания SQL." },
  ];
}

export default function HomeRoute() {
  return <HomePage />;
}
