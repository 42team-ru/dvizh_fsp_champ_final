import UserPage from "@/pages/user/ui/user-page";

export function meta() {
  return [
    { title: "Профиль участника" },
    { name: "description", content: "Виды спорта, фото, питомец и ближайшие встречи участника." },
  ];
}

export default function UserRoute() {
  return <UserPage />;
}
