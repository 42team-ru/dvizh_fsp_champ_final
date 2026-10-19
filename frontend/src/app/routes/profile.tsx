import ProfilePage from "@/pages/profile/ui/profile-page";

export function meta() {
  return [
    { title: "Профиль" },
    { name: "description", content: "Цифровой паспорт, питомец, гардероб и достижения." },
  ];
}

export default function ProfileRoute() {
  return <ProfilePage />;
}
