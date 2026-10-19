import { useMemo, useState } from "react";
import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverArts, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { PetItemsAdmin, type PetItemPreview } from "@/features/pet-items-admin/ui/pet-items-admin";
import { AdminLayout } from "./admin-layout";
import { PageHead } from "./parts";

/** Вещи бобра: каталог, загрузка новой вещи и подгонка посадки с примеркой на живом бобре. */
export default function AdminPetsPage() {
  // Примерка: вещь под кодом "preview" временно занимает свой слот, ничего не сохраняется.
  const [preview, setPreview] = useState<PetItemPreview>(null);
  const arts = useMemo<BeaverArts | undefined>(() => (preview ? { [`${preview.slot}:preview`]: preview.art } : undefined), [preview]);
  const outfit = (preview && preview.slot !== "activity" ? { [preview.slot]: "preview" } : {}) as BeaverOutfit;
  const activity = (preview?.slot === "activity" ? "preview" : "none") as BeaverActivity;

  return (
    <AdminLayout>
      <PageHead title="Бобр: вещи" text="Каталог вещей магазина. Новая вещь и посадка сразу видны на бобре справа." />
      <div className="flex w-full flex-col-reverse items-start gap-5 lg:flex-row">
        <div className="w-full min-w-0 flex-1 rounded-[24px] border-2 border-ink bg-card p-5 sm:p-6">
          <PetItemsAdmin onPreview={setPreview} />
        </div>
        <div className="w-full rounded-[24px] border-2 border-ink bg-peach-soft p-4 lg:sticky lg:top-6 lg:w-[300px] lg:shrink-0">
          <BeaverPet outfit={outfit} activity={activity} extraArts={arts} followCursor={false} />
          <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
            {preview ? "Примерка: так вещь сядет на бобра" : "Выберите вещь, чтобы примерить"}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
