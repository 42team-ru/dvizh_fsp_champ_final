import { useId, useRef, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getPetsGetMineQueryKey, usePetsGetMine, usePetsRename } from "@/shared/api/generated/core/pets/pets";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "cn";

/** Имя питомца и общая для двух вариантов профиля форма переименования. */
export function PetNameEditor({ children, nameClassName }: { children?: ReactNode; nameClassName?: string }) {
  const { data } = usePetsGetMine();
  const queryClient = useQueryClient();
  const name = data?.data.name;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const rename = usePetsRename({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getPetsGetMineQueryKey() });
        setEditing(false);
        requestAnimationFrame(() => editButton.current?.focus());
      },
    },
  });
  const cancel = () => {
    if (rename.isPending) return;
    setEditing(false);
    rename.reset();
    requestAnimationFrame(() => editButton.current?.focus());
  };

  if (editing) {
    return (
      <form
        className="flex w-full min-w-0 flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!rename.isPending) rename.mutate({ data: { name: draft } });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        aria-busy={rename.isPending}
      >
        <Input
          autoFocus
          aria-label="Имя питомца"
          aria-invalid={rename.isError}
          aria-describedby={rename.isError ? errorId : undefined}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); rename.reset(); }}
          disabled={rename.isPending}
          className="h-11 min-w-0 bg-card text-base"
        />
        {rename.isError && <p id={errorId} role="alert" className="text-sm font-semibold text-destructive">{rename.error.detail ?? "Не удалось сохранить имя. Попробуйте ещё раз."}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={rename.isPending} className="min-h-11 px-3 text-base">Сохранить</Button>
          <Button type="button" variant="soft" disabled={rename.isPending} onClick={cancel} className="min-h-11 px-3 text-base">Отмена</Button>
        </div>
      </form>
    );
  }

  return (
    <>
    <div className="flex w-full min-w-0 items-center gap-1">
      <p className={cn("min-w-0 break-words font-display text-[22px] leading-tight font-extrabold text-foreground", nameClassName)}>{name ?? "…"}</p>
      <Button
        ref={editButton}
        type="button"
        variant="ghost"
        aria-label="Переименовать питомца"
        disabled={!name}
        onClick={() => { setDraft(name ?? ""); rename.reset(); setEditing(true); }}
        className="size-11 shrink-0 p-0"
      >
        <Pencil className="size-5" aria-hidden="true" />
      </Button>
    </div>
    {children}
    </>
  );
}
