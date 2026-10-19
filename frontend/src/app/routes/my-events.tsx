import MyEventsPage from "@/pages/cabinet/ui/my-events-page";

export function meta() {
  return [
    { title: "Кабинет — мои мероприятия" },
    { name: "description", content: "Мероприятия, которые вы ведёте: заявки, занятия, команда." },
  ];
}

export default function MyEventsRoute() {
  return <MyEventsPage />;
}
