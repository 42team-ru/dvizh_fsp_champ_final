import type { ComponentProps, ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import { ItemThumb, slotTone } from "@/widgets/beaver-pet/ui/item-thumb";
import type {
  BeaverActivity,
  BeaverOutfit,
} from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import type { Look } from "@/features/pet-wardrobe/model/dressing";
import type { ShopItemResponse } from "@/shared/api/generated/core/appAPI.schemas";

export function RoomButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      rough={false}
      className={cn(
        "min-h-11 h-auto px-[14px] py-[7px] text-[15px] leading-[18px] whitespace-normal md:min-h-9 md:text-[13px]",
        className,
      )}
      {...props}
    />
  );
}
export function Coin({ className }: { className?: string }) {
  return (
    <img
      src="/profile/icon-coin.svg"
      alt="монет"
      className={cn("inline-block size-[18px] shrink-0", className)}
    />
  );
}
export function SectionTitle({
  children,
  detail,
  action,
}: {
  children: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="font-display text-[22px] leading-[30px] font-extrabold">
        {children}
      </h2>
      {detail && (
        <span className="text-[13px] font-semibold text-muted-foreground">
          {detail}
        </span>
      )}
      {action}
    </div>
  );
}
export function LookPreview({
  look,
  className,
  children,
}: {
  look: Look;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "pet-look-preview relative isolate overflow-hidden bg-sky-soft",
        className,
      )}
    >
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none flex size-full items-center justify-center"
      >
        <BeaverPet
          outfit={look.outfit as BeaverOutfit}
          activity={look.activity as BeaverActivity}
          mood="idle"
          followCursor={false}
          className="h-full w-full"
        />
      </div>
      {children}
    </div>
  );
}
export function MiniItems({
  items,
  className,
}: {
  items: ShopItemResponse[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {items.map((item) => (
        <span
          key={item.id}
          title={`${item.label}${item.owned ? " · есть" : " · нет в гардеробе"}`}
          className={cn(
            "inline-flex size-8 rounded-[8px] border-[1.5px] border-ink",
            slotTone(item.slot),
            !item.owned && "border-dashed opacity-45",
          )}
        >
          <ItemThumb
            slot={item.slot}
            code={item.code}
            plain
            className="size-full rounded-[6px]"
          />
        </span>
      ))}
    </div>
  );
}
export function WornChip({
  item,
  tried,
  disabled,
  onRemove,
}: {
  item: ShopItemResponse;
  tried?: boolean;
  disabled?: boolean;
  onRemove(): void;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded-pill border-[1.5px] border-ink bg-paper pl-1 text-[11px] leading-4 font-extrabold",
        tried && "border-dashed bg-peach",
      )}
    >
      <ItemThumb
        slot={item.slot}
        code={item.code}
        className="size-6 rounded-full"
      />
      <span className="min-w-0 break-words">
        {tried && "Примерка: "}
        {item.label}
      </span>
      <Button
        rough={false}
        variant="ghost"
        size="icon-xs"
        className="size-11 shrink-0 rounded-full border-0 md:size-7"
        disabled={disabled}
        aria-label={`Снять: ${item.label}`}
        onClick={onRemove}
      >
        <X className="size-3" />
      </Button>
    </span>
  );
}
export function OwnedBadge() {
  return (
    <Badge
      variant="outline"
      className="h-[22px] border-[1.5px] px-2 text-[10px] font-extrabold"
    >
      <Check className="size-3" />
      ЕСТЬ
    </Badge>
  );
}
export function Prices({
  full,
  price,
  discount = true,
}: {
  full: number;
  price: number;
  discount?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-[7px] text-sm font-extrabold">
      {discount && price < full && (
        <Badge
          variant="accent"
          className="h-5 border-[1.5px] px-[7px] text-[10px]"
        >
          −20%
        </Badge>
      )}
      {price < full && <s className="text-xs text-muted-foreground">{full}</s>}
      <Coin className="size-4" />
      {price}
    </span>
  );
}
