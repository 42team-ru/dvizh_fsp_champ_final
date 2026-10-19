import OrgPublicPage from "@/pages/org-public/ui/org-public-page";

export function meta() {
  return [
    { title: "Движ — страница клуба" },
    { name: "description", content: "Клуб, его виды спорта, контакты и ближайшие мероприятия." },
  ];
}

export default function OrgPublicRoute() {
  return <OrgPublicPage />;
}
