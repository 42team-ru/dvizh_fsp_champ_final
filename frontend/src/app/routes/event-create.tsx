import EventCreatePage from "@/pages/event-create/ui/event-create-page";

export function meta() {
  return [{ title: "Новое событие" }];
}

export default function EventCreateRoute() {
  return <EventCreatePage />;
}
