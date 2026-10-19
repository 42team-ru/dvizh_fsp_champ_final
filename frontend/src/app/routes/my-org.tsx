import OrgProfilePage from "@/pages/cabinet/ui/org-profile-page";

export function meta() {
  return [
    { title: "Кабинет — анкета клуба" },
    { name: "description", content: "Анкета организации и статус заявки на допуск." },
  ];
}

export default function MyOrgRoute() {
  return <OrgProfilePage />;
}
