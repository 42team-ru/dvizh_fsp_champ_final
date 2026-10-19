import { useState } from "react";
import { Link } from "react-router";
import { Check, LockKeyhole, Plus } from "lucide-react";
import { cn } from "cn";
import type {
  PetCatalogResponse,
  ShopItemResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import {
  slotGroups,
  groupOf,
  matchesLook,
  type Look,
} from "@/features/pet-wardrobe/model/dressing";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ItemThumb, slotTone } from "@/widgets/beaver-pet/ui/item-thumb";
import {
  LookPreview,
  OwnedBadge,
  RoomButton,
  SectionTitle,
} from "./room-pieces";

export function ItemCatalog({
  shop,
  items,
  catalog,
  look,
  busy,
  onToggle,
  onBuy,
}: {
  shop: boolean;
  items: ShopItemResponse[];
  catalog: PetCatalogResponse;
  look: Look;
  busy: boolean;
  onToggle(item: ShopItemResponse): void;
  onBuy(item: ShopItemResponse): void;
}) {
  const [group, setGroup] = useState("all");
  const [sort, setSort] = useState("new");
  const [hideOwned, setHideOwned] = useState(false);
  const [limit, setLimit] = useState(12);
  const available = items.filter(
    (item) => item.id !== "activity:none" && (shop || item.owned),
  );
  const extraSlots = catalog.slots.filter(
    (slot) => !groupOf(slot.id) && slot.items.length,
  );
  const groups = [
    ...slotGroups,
    ...extraSlots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      slots: [slot.id],
    })),
  ];
  const currentGroup = groups.find((g) => g.id === group) ?? groups[0];
  const inGroup = (item: ShopItemResponse) =>
    group === "all" || currentGroup.slots.includes(item.slot);
  const filtered = available.filter(
    (item) => inGroup(item) && (!hideOwned || !item.owned),
  );
  const shown = shop
    ? [...filtered]
        .sort((a, b) =>
          sort === "cheap"
            ? a.price - b.price
            : sort === "expensive"
              ? b.price - a.price
              : Number(b.isNew) - Number(a.isNew),
        )
        .slice(0, limit)
    : filtered;
  const resetFilters = () => setLimit(12);
  return (
    <section className="min-w-0 space-y-[14px]">
      <SectionTitle
        detail={
          shop
            ? `${shown.length} из ${filtered.length}`
            : `${available.length} вещей`
        }
      >
        {shop ? "Все вещи" : "Мои вещи"}
      </SectionTitle>
      <div
        role="group"
        aria-label="Слоты вещей"
        className="no-scrollbar flex gap-[6px] overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
      >
        {groups.map((g) => (
          <RoomButton
            key={g.id}
            size="chip"
            variant={g.id === group ? "default" : "outline"}
            aria-pressed={group === g.id}
            className="shrink-0 gap-[6px] px-[14px] text-xs shadow-none"
            onClick={() => {
              setGroup(g.id);
              resetFilters();
            }}
          >
            {g.label}
            <span className="opacity-65">
              {
                available.filter(
                  (item) => g.id === "all" || g.slots.includes(item.slot),
                ).length
              }
            </span>
          </RoomButton>
        ))}
      </div>
      {shop && (
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value);
              resetFilters();
            }}
          >
            <SelectTrigger aria-label="Порядок вещей" className="md:min-h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Сначала новинки</SelectItem>
              <SelectItem value="cheap">Сначала дешевле</SelectItem>
              <SelectItem value="expensive">Сначала дороже</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold">
            <Checkbox
              checked={hideOwned}
              onCheckedChange={(value) => {
                setHideOwned(value === true);
                resetFilters();
              }}
            />
            Скрыть купленное
          </label>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-ink bg-paper px-5 py-9 text-center">
          <LookPreview
            look={{ activity: "none", outfit: { background: "meadow" } }}
            className="size-[120px] rounded-full border-2 border-ink"
          />
          <h3 className="text-lg font-extrabold">
            {hideOwned
              ? group === "all"
                ? "Все вещи уже в гардеробе"
                : `В слоте «${currentGroup.label}» всё куплено`
              : "В этом слоте пока нет вещей"}
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {hideOwned
              ? "Сними «Скрыть купленное», чтобы увидеть свои вещи, или загляни в другой слот."
              : "Загляни в магазин и собери новый образ."}
          </p>
          {hideOwned ? (
            <RoomButton
              variant="outline"
              className="shadow-none"
              onClick={() => setHideOwned(false)}
            >
              Показать купленное
            </RoomButton>
          ) : (
            <RoomButton asChild variant="outline">
              <Link to="/profile/shop">В магазин</Link>
            </RoomButton>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            shop
              ? "grid-cols-1 min-[450px]:grid-cols-2 min-[1180px]:grid-cols-3"
              : "grid-cols-2 gap-[14px] md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] min-[1180px]:grid-cols-[repeat(auto-fill,132px)]",
          )}
        >
          {shown.map((item) => {
            const selected = matchesLook(item, look);
            const tried = selected && !item.owned;
            const slotLabel =
              groupOf(item.slot)?.label ??
              catalog.slots.find((slot) => slot.id === item.slot)?.label ??
              item.slot;
            return shop ? (
              <article
                key={item.id}
                className={cn(
                  "flex min-w-0 flex-col gap-[10px] rounded-2xl border-2 border-ink bg-card px-3 pt-3 pb-[14px]",
                  tried && "border-dashed bg-peach",
                )}
              >
                <div
                  className={cn(
                    "relative flex h-[150px] items-center justify-center rounded-xl border-2 border-ink",
                    slotTone(item.slot),
                  )}
                >
                  <ItemThumb
                    slot={item.slot}
                    code={item.code}
                    plain
                    className={cn(
                      "size-[120px]",
                      item.legendary && !item.owned && "opacity-40",
                    )}
                  />
                  <div className="absolute top-[7px] left-[7px]">
                    {item.owned ? (
                      <OwnedBadge />
                    ) : item.legendary ? (
                      <Badge
                        variant="outline"
                        className="h-[22px] bg-sun px-2 text-[10px] font-extrabold"
                      >
                        ЛЕГЕНДА
                      </Badge>
                    ) : item.isNew ? (
                      <Badge
                        variant="secondary"
                        className="h-[22px] border-[1.5px] px-2 text-[10px] font-extrabold"
                      >
                        НОВИНКА
                      </Badge>
                    ) : null}
                  </div>
                  {item.legendary && !item.owned && (
                    <LockKeyhole
                      className="absolute top-[9px] right-[9px] size-5"
                      aria-label="Награда за достижение"
                    />
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 text-sm leading-[19px] font-extrabold">
                    {item.label}
                  </h3>
                  <Badge
                    variant="muted"
                    className="h-auto border-[1.5px] px-[7px] py-px text-[10px]"
                  >
                    {slotLabel}
                  </Badge>
                </div>
                <p className="min-h-4 text-xs leading-4 text-muted-foreground">
                  {tried
                    ? "Сейчас примерено"
                    : item.owned
                      ? selected
                        ? "Надето на питомце"
                        : "Уже в гардеробе"
                      : item.legendary
                        ? `Откроется: ${item.hint?.replace(/^Дают\s+/i, "") ?? "за достижение"}`
                        : "\u00a0"}
                </p>
                <div className="mt-auto flex gap-[10px] pt-1">
                  {item.owned ? (
                    <RoomButton
                      className="w-full shadow-none"
                      variant={selected ? "outline" : "default"}
                      disabled={busy}
                      onClick={() => onToggle(item)}
                    >
                      {selected ? "Снять" : "Надеть"}
                    </RoomButton>
                  ) : (
                    <>
                      <RoomButton
                        variant="outline"
                        className="min-w-0 flex-1 px-2 shadow-none"
                        disabled={busy}
                        onClick={() => onToggle(item)}
                      >
                        {selected ? "Снять" : "Примерить"}
                      </RoomButton>
                      {!item.legendary && (
                        <RoomButton
                          variant="secondary"
                          className="min-w-0 flex-1 px-2"
                          disabled={busy}
                          onClick={() => onBuy(item)}
                        >
                          Купить · {item.price}
                        </RoomButton>
                      )}
                    </>
                  )}
                </div>
              </article>
            ) : (
              <div
                key={item.id}
                className="flex min-w-0 flex-col items-center gap-[6px] text-center"
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={selected}
                  aria-label={`${item.label}: ${selected ? "снять" : "надеть"}`}
                  onClick={() => onToggle(item)}
                  className={cn(
                    "relative flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    slotTone(item.slot),
                    selected &&
                      "border-[3px] border-ultramarine shadow-[3px_3px_0_var(--ultramarine)]",
                  )}
                >
                  <ItemThumb
                    slot={item.slot}
                    code={item.code}
                    plain
                    className="size-full p-[10%]"
                  />
                  {selected && (
                    <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-lime">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  )}
                </button>
                <h3 className="text-[13px] leading-[18px] font-extrabold">
                  {item.label}
                </h3>
                <span
                  className={cn(
                    "text-xs font-semibold text-muted-foreground",
                    selected && "text-ultramarine",
                  )}
                >
                  {selected ? "надето" : slotLabel.toLowerCase()}
                </span>
              </div>
            );
          })}
          {!shop && (
            <Link
              to="/profile/shop"
              className="group flex min-w-0 flex-col items-center gap-[6px] text-center focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-ink bg-paper group-hover:bg-lavender-soft">
                <Plus className="size-8" />
              </span>
              <span className="text-[13px] font-extrabold">Ещё вещи</span>
              <span className="text-xs font-semibold text-muted-foreground">
                в магазине
              </span>
            </Link>
          )}
        </div>
      )}
      {shop && shown.length < filtered.length && (
        <RoomButton
          variant="outline"
          onClick={() => setLimit((value) => value + 12)}
        >
          Показать ещё · {filtered.length - shown.length}
        </RoomButton>
      )}
    </section>
  );
}
