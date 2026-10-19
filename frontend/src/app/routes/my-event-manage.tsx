import ManageEventPage from "@/pages/cabinet/ui/manage-event-page";

export function meta() {
  return [
    { title: "Кабинет — управление мероприятием" },
    { name: "description", content: "Заявки, занятия, организаторы, фото и обсуждение мероприятия." },
  ];
}

export default function MyEventManageRoute() {
  return <ManageEventPage />;
}
