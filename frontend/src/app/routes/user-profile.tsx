import UserProfilePage from "@/pages/user-profile/ui/user-profile-page";

export function meta() {
  return [{ title: "Профиль участника" }];
}

export default function UserProfileRoute() {
  return <UserProfilePage />;
}
