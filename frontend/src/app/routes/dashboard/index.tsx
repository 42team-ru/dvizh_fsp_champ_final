import DashboardMainPage from "@/pages/dashboard/dashboard-main-page";
import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Дешбоард" },
    { name: "description", content: "Страница дешбоарда" },
  ];
}

export default function DashboardMain() {
  return <DashboardMainPage />;
}
