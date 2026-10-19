import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import {
  getPetsGetMineQueryKey,
  usePetsCatalog,
  usePetsEquip,
  usePetsGetMine,
  usePetsShop,
} from "@/shared/api/generated/core/pets/pets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { MyBeaverPet } from "@/widgets/beaver-pet/ui/my-beaver-pet";
import { cn } from "cn";

/** Гардероб бобра в окне: предпросмотр питомца и по слотам вещи пользователя. Сохраняет pets_equip. */
export function WardrobeDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Гардероб</DialogTitle>
          <DialogDescription>
            Выбери, что надеть на бобра. Образ виден сразу и сохраняется сам.
          </DialogDescription>
        </DialogHeader>
        <WardrobeBody />
      </DialogContent>
    </Dialog>
  );
}

function WardrobeBody() {
  const queryClient = useQueryClient();
  const pet = usePetsGetMine();
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const shop = usePetsShop();
  const equip = usePetsEquip({
    mutation: {
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: getPetsGetMineQueryKey() }),
          queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }),
        ]),
    },
  });

  const mine = pet.data?.status === 200 ? pet.data.data : undefined;
  const slots = catalog.data?.status === 200 ? catalog.data.data.slots : [];
  const items = shop.data?.status === 200 ? shop.data.data : [];
  const wornCode = (slot: { id: string; kind: string }) =>
    slot.kind === "ACTIVITY" ? mine?.activity : mine?.outfit[slot.id];

  return (
    <div className="grid items-start gap-5 md:grid-cols-[280px_1fr]">
      <div className="relative h-[300px] overflow-hidden rounded-[18px] border-2 border-ink bg-sky md:sticky md:top-0 md:h-[340px]">
        <img
          src="/profile/memphis1.svg"
          alt=""
          className="pointer-events-none absolute bottom-0 left-1/2 size-[300px] max-w-none -translate-x-1/2"
        />
        <MyBeaverPet
          speechContainer={null}
          className="absolute top-3 left-1/2 h-[300px] w-[280px] -translate-x-1/2 [&_.beaver-pet]:h-full [&_svg]:h-full"
        />
      </div>

      <div
        className={cn("flex flex-col gap-4", equip.isPending && "opacity-70")}
        aria-busy={equip.isPending}
      >
        {slots.map((slot) => {
          const owned = items.filter((i) => i.slot === slot.id && i.owned);
          const current = wornCode(slot);
          const none = !current || current === "none";
          return (
            <section key={slot.id} className="flex flex-col gap-2">
              <h3 className="text-[10px] font-extrabold tracking-[1.2px] text-muted-foreground uppercase">
                {slot.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={none}
                  disabled={equip.isPending}
                  onClick={() => equip.mutate({ slot: slot.id, data: {} })}
                >
                  Без вещи
                </Chip>
                {owned.map((i) => (
                  <Chip
                    key={i.id}
                    active={current === i.code}
                    disabled={equip.isPending}
                    onClick={() =>
                      equip.mutate({ slot: slot.id, data: { item: i.code } })
                    }
                  >
                    {i.label}
                  </Chip>
                ))}
              </div>
            </section>
          );
        })}
        {equip.isError ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {equip.error.detail ?? "Не удалось сохранить образ."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-pill border-2 border-ink px-3 py-[6px] text-[13px] font-extrabold transition-colors",
        active ? "bg-primary text-white" : "bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
