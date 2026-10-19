import { useState } from "react";
import type { ShopItemResponse } from "@/shared/api/generated/core/appAPI.schemas";
import {
  setPrice,
  groupOf,
  type Look,
} from "@/features/pet-wardrobe/model/dressing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ItemThumb } from "@/widgets/beaver-pet/ui/item-thumb";
import { Coin, Prices, RoomButton } from "./room-pieces";

export type Purchase = {
  title: string;
  items: ShopItemResponse[];
  wear: boolean;
  bundleCode?: string;
  look?: Look;
};
export function PurchaseDialog({
  purchase,
  balance,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  purchase: Purchase | null;
  balance: number;
  busy: boolean;
  error?: string;
  onClose(): void;
  onConfirm(): void;
}) {
  const { full, price, missing } = setPrice(purchase?.items ?? []);
  const shortfall = Math.max(0, price - balance);
  const locked = missing.find((item) => item.legendary);
  return (
    <Dialog
      open={Boolean(purchase)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        overlayClassName="bg-ink/55 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
        className="max-h-[90dvh] gap-5 overflow-y-auto rounded-[24px] border-2 border-ink p-6 shadow-hard sm:max-w-[540px] sm:p-7"
      >
        <DialogTitle className="font-display text-[23px] leading-8 font-extrabold">
          {purchase?.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Проверь вещи, скидку и баланс перед покупкой.
        </DialogDescription>
        <ul className="flex flex-col gap-[14px]">
          {missing.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <ItemThumb
                slot={item.slot}
                code={item.code}
                className="size-14 rounded-xl border-2 border-ink"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {groupOf(item.slot)?.label ?? item.slot}
                </p>
              </div>
              <span className="flex items-center gap-1 text-base font-extrabold">
                <Coin />
                {item.price}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t-2 border-ink pt-4">
          <span className="text-lg font-extrabold">Итого</span>
          <Prices full={full} price={price} />
        </div>
        {locked ? (
          <p className="text-sm font-semibold text-orange-ink">
            Эту вещь нельзя купить. {locked.hint}
          </p>
        ) : shortfall ? (
          <div aria-live="polite">
            <p className="font-bold text-orange-ink">
              Не хватает {shortfall} монет.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Это ещё {Math.ceil(shortfall / 10)} встреч с наградой +10 за
              участие. За проведённую встречу можно получить от 30 до 80 монет.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            После покупки останется {balance - price} монет.{" "}
            {purchase?.wear
              ? "Вещи сразу наденутся на питомца."
              : "Вещи появятся в гардеробе."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <RoomButton
            variant="outline"
            className="min-h-12 px-6 shadow-none"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </RoomButton>
          <RoomButton
            variant="secondary"
            className="min-h-12 px-6 text-base"
            disabled={
              busy || shortfall > 0 || Boolean(locked) || missing.length === 0
            }
            onClick={onConfirm}
          >
            {busy ? "Покупаем…" : `Купить за ${price}`}
          </RoomButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SaveLookDialog({
  open,
  count,
  busy,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  count: number;
  busy: boolean;
  error?: string;
  onClose(): void;
  onSave(name: string | null): void;
}) {
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const canRemember = count < 4;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <DialogContent className="gap-4 rounded-[24px] border-2 border-ink p-6 shadow-hard">
        <DialogTitle className="pr-8 font-display text-xl leading-7 font-extrabold">
          Сохранить образ
        </DialogTitle>
        <DialogDescription>
          Образ появится в паспорте. В «Мои образы» можно сохранить до четырёх
          вариантов.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(
              remember && canRemember
                ? name.trim() || `Мой образ ${count + 1}`
                : null,
            );
          }}
          className="space-y-4"
        >
          <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
            <Checkbox
              checked={remember && canRemember}
              disabled={!canRemember || busy}
              onCheckedChange={(value) => setRemember(value === true)}
            />
            Добавить в «Мои образы» · {count} из 4
          </label>
          {canRemember && remember && (
            <label className="flex flex-col gap-2 text-sm font-bold">
              Название образа
              <Input
                value={name}
                maxLength={30}
                placeholder={`Мой образ ${count + 1}`}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </label>
          )}
          {!canRemember && (
            <p className="text-sm text-muted-foreground">
              Все четыре места заняты. Удали один из сохранённых образов, чтобы
              добавить новый.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <RoomButton type="submit" className="w-full" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </RoomButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
