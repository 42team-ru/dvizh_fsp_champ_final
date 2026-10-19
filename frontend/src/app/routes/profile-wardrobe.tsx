import PetWardrobePage from "@/pages/pet-wardrobe/ui/pet-wardrobe-page";
export function meta() {
  return [
    { title: "Гардероб" },
    {
      name: "description",
      content: "Вещи питомца, комплекты и сохранённые образы.",
    },
  ];
}
export default function ProfileWardrobeRoute() {
  return <PetWardrobePage />;
}
