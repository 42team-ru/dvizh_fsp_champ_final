import PetShopPage from "@/pages/pet-shop/ui/pet-shop-page";
export function meta() {
  return [
    { title: "Магазин вещей" },
    {
      name: "description",
      content: "Примеряй вещи и собирай комплекты для питомца.",
    },
  ];
}
export default function ProfileShopRoute() {
  return <PetShopPage />;
}
