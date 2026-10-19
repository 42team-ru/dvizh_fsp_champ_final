import ActivityPage from "@/pages/activity/ui/activity-page";

export function meta() {
  return [
    { title: "Активность" },
    { name: "description", content: "Заявки, напоминания, билеты и подписки." },
  ];
}

export default function ActivityRoute() {
  return <ActivityPage />;
}
