import { Plus } from "lucide-react";
import type {
  PetSavedLookResponse,
  ShopItemResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { lookItems } from "@/features/pet-wardrobe/model/dressing";
import { Badge } from "@/shared/components/ui/badge";
import {
  LookPreview,
  MiniItems,
  RoomButton,
  SectionTitle,
} from "./room-pieces";

export function SavedLooks({
  looks,
  items,
  busy,
  onWear,
  onDelete,
  onSave,
}: {
  looks: PetSavedLookResponse[];
  items: ShopItemResponse[];
  busy: boolean;
  onWear(look: PetSavedLookResponse): void;
  onDelete(id: string): void;
  onSave(): void;
}) {
  return (
    <section className="space-y-[14px]">
      <SectionTitle detail={`${looks.length} из 4`}>Мои образы</SectionTitle>
      <div className="grid grid-cols-1 gap-4 min-[450px]:grid-cols-2 min-[1180px]:grid-cols-3">
        {looks.map((look) => {
          const parts = lookItems(items, look);
          return (
            <article
              key={look.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-hard-sm"
            >
              <LookPreview
                look={look}
                className="h-[168px] border-b-2 border-ink"
              >
                <Badge
                  variant="outline"
                  className="absolute top-[10px] left-[10px] text-[11px]"
                >
                  Мой образ
                </Badge>
              </LookPreview>
              <div className="flex flex-1 flex-col gap-2 px-[14px] pt-3 pb-[14px]">
                <h3 className="text-base font-extrabold">{look.name}</h3>
                <MiniItems items={parts} />
                <p className="text-xs text-muted-foreground">
                  Все {parts.length} вещей в гардеробе
                </p>
                <div className="mt-auto flex items-center gap-[10px]">
                  <RoomButton disabled={busy} onClick={() => onWear(look)}>
                    Надеть
                  </RoomButton>
                  <RoomButton
                    variant="link"
                    className="px-0 text-xs text-muted-foreground underline"
                    disabled={busy}
                    onClick={() => onDelete(look.id)}
                  >
                    Удалить
                  </RoomButton>
                </div>
              </div>
            </article>
          );
        })}
        {looks.length < 4 && (
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="flex min-h-[326px] flex-col justify-center gap-[6px] rounded-2xl border-2 border-dashed border-ink bg-paper p-[18px] text-left outline-none hover:bg-lavender-soft focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="mb-2 size-7" />
            <span className="text-base font-extrabold">Собери свой образ</span>
            <span className="text-sm leading-[19px] text-muted-foreground">
              Одень питомца как нравится и нажми «Сохранить образ» под ним.
              Поместится ещё {4 - looks.length}.
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
