import EventPage from "@/pages/event/ui/event-page";

export function meta() {
  return [
    { title: "Событие" },
    { name: "description", content: "Билет на тренировку: место, время, участники и чат." },
  ];
}

export default function EventRoute() {
  return <EventPage />;
}
