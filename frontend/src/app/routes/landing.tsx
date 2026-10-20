import LandingPage from "@/pages/landing/ui/landing-page";

export function meta() {
  return [
    { title: "Движ — спортивные встречи рядом с домом" },
    { name: "description", content: "Найди компанию для футбола, бега, шахмат или любого своего вида спорта." },
  ];
}

export default function LandingRoute() {
  return <LandingPage />;
}
