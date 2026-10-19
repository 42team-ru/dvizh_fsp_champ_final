import { useId, useState, type ComponentType, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Castle, CircleOff, Disc, Dumbbell, Footprints, Gamepad2, Laptop, MountainSnow, Shield, Sparkles, Volleyball } from "lucide-react";
import { toast } from "sonner";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import type { PetCatalogResponse, PetResponse, ShopItemResponse } from "@/shared/api/generated/core/appAPI.schemas";
import {
  getPetsGetMineQueryKey,
  getPetsShopQueryKey,
  usePetsCatalog,
  usePetsGetMine,
  usePetsRename,
  usePetsSaveMine,
  usePetsShop,
} from "@/shared/api/generated/core/pets/pets";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { BeaverPet, type BeaverMood } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { cn } from "cn";

const IMG = "/profile/wardrobe";
const NAME_MAX = 20;
const ACTIVITY = "activity";
const NONE = "none";

/** Вкладки гардероба по макету; слоты, которых тут нет (добавленные админом), попадают в «Аксессуары». */
const GROUPS = [
  { id: "all", label: "Всё" },
  { id: "head", label: "Голова", slots: ["hat", "eyewear"] },
  { id: "clothes", label: "Одежда", slots: ["shirt", "bottom"] },
  { id: "accessories", label: "Аксессуары" },
] as const;
type GroupId = (typeof GROUPS)[number]["id"];

const groupOf = (slot: string): GroupId =>
  GROUPS.find((g) => "slots" in g && (g.slots as readonly string[]).includes(slot))?.id ?? "accessories";

const TONES = ["bg-peach", "bg-sky-soft", "bg-lime-soft", "bg-lavender-soft"];

/** Значок вещи: рисунок из макета для одежды, иконка для инвентаря и вещей админа. */
const SVG_BY_ITEM: Record<string, string> = { "hat:crown": "crown", "hat:headphones": "phones", "neck:medal": "medal" };
const SVG_BY_SLOT: Record<string, string> = { hat: "cap", shirt: "shirt", eyewear: "glasses", neck: "scarf" };
const ICON_BY_ITEM: Record<string, ComponentType<{ className?: string }>> = {
  "activity:none": CircleOff, "activity:juggle": Volleyball, "activity:dribble": Volleyball, "activity:lift": Dumbbell,
  "activity:chess": Castle, "activity:ski": MountainSnow, "activity:hockey": Disc, "activity:esports": Gamepad2,
  "activity:programming": Laptop, "bottom:swimshorts": Footprints, "bottom:hockeypants": Shield,
};

function ItemIcon({ item }: { item: ShopItemResponse }) {
  const svg = SVG_BY_ITEM[item.id] ?? SVG_BY_SLOT[item.slot];
  if (svg) return <img src={`${IMG}/${svg}.svg`} alt="" className="size-12" />;
  const Icon = ICON_BY_ITEM[item.id] ?? Sparkles;
  return <Icon className="size-10 text-ink" />;
}

/** Окно «Гардероб и имя»: имя питомца и образ с живым предпросмотром; сохраняется кнопкой. */
export function WardrobeDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] gap-[22px] overflow-y-auto rounded-[24px] border-[2.5px] border-ink p-5 shadow-[8px_8px_0_var(--ink)] ring-0 sm:max-w-[752px] sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold tracking-[2px] text-primary">СОПРОВОЖДАЮЩИЙ</span>
            <DialogTitle className="font-display text-[22px] leading-7 font-extrabold text-foreground">Гардероб и имя</DialogTitle>
            <DialogDescription className="sr-only">Имя питомца и что на нём надето</DialogDescription>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
            className="flex size-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <img src={`${IMG}/x.svg`} alt="" className="size-4" />
          </button>
        </div>
        {open && <WardrobeLoader onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function WardrobeLoader({ onClose }: { onClose(): void }) {
  const pet = usePetsGetMine();
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const shop = usePetsShop();
  if (pet.isError || catalog.isError || shop.isError) {
    return <p role="alert" className="text-sm font-semibold text-destructive">Не удалось загрузить гардероб. Попробуй ещё раз.</p>;
  }
  if (pet.data?.status !== 200 || catalog.data?.status !== 200 || shop.data?.status !== 200) {
    return <p role="status" className="py-10 text-center text-sm text-muted-foreground">Загружаем гардероб…</p>;
  }
  return <WardrobeForm pet={pet.data.data} catalog={catalog.data.data} items={shop.data.data} onClose={onClose} />;
}

function WardrobeForm({
  pet,
  catalog,
  items,
  onClose,
}: {
  pet: PetResponse;
  catalog: PetCatalogResponse;
  items: ShopItemResponse[];
  onClose(): void;
}) {
  const nameId = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState(pet.name);
  const [outfit, setOutfit] = useState<Record<string, string>>(() => ({ ...pet.outfit }));
  const [activity, setActivity] = useState(pet.activity || NONE);
  const [group, setGroup] = useState<GroupId>("all");
  const rename = usePetsRename();
  const save = usePetsSaveMine();
  const busy = rename.isPending || save.isPending;

  const worn = (item: ShopItemResponse) =>
    item.slot === ACTIVITY ? activity === item.code : outfit[item.slot] === item.code;
  const toggle = (item: ShopItemResponse) => {
    if (item.slot === ACTIVITY) {
      setActivity(activity === item.code ? NONE : item.code);
      return;
    }
    setOutfit((current) => {
      const next = { ...current };
      if (next[item.slot] === item.code) delete next[item.slot];
      else next[item.slot] = item.code;
      return next;
    });
  };

  // Вещи по порядку конструктора: сначала слоты каталога, внутри — как в каталоге.
  const order = new Map<string, number>(
    catalog.slots.flatMap((s, si) => s.items.map((it, ii) => [`${s.id}:${it.id}`, si * 1000 + ii] as const)),
  );
  // Сначала надетое (по сохранённому образу, чтобы плитки не прыгали при выборе), потом своё, потом закрытое.
  const rank = (i: ShopItemResponse) =>
    (i.slot === ACTIVITY ? pet.activity === i.code : pet.outfit[i.slot] === i.code) ? 0 : i.owned ? 1 : 2;
  const shown = items
    .filter((i) => !(i.slot === ACTIVITY && i.code === NONE))
    .filter((i) => group === "all" || groupOf(i.slot) === group)
    .sort((a, b) => rank(a) - rank(b) || (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
  const wornLabels = items
    .filter((i) => worn(i) && !(i.slot === ACTIVITY && i.code === NONE))
    .sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9))
    .map((i) => i.label);

  const trimmed = name.trim().replace(/\s+/g, " ");
  const nameChanged = trimmed !== pet.name;
  const outfitChanged =
    activity !== (pet.activity || NONE) || JSON.stringify(sortKeys(outfit)) !== JSON.stringify(sortKeys(pet.outfit));
  const error = rename.error?.detail ?? save.error?.detail;

  const submit = async () => {
    try {
      if (nameChanged) await rename.mutateAsync({ data: { name: trimmed } });
      if (outfitChanged) await save.mutateAsync({ data: { activity, outfit } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getPetsGetMineQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getPetsShopQueryKey() }),
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }),
      ]);
      toast.success("Имя и образ сохранены");
      onClose();
    } catch {
      // текст ошибки показываем под формой
    }
  };

  return (
    <form
      className="flex flex-col gap-[22px]"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && trimmed) void submit();
      }}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:w-[236px] sm:items-start">
          <div className="relative h-[290px] w-[236px] overflow-hidden rounded-[18px] border-2 border-ink bg-sky">
            <img src={`${IMG}/hill.svg`} alt="" className="absolute top-[188px] left-[-34px] size-[300px] max-w-none" />
            <img src={`${IMG}/triangle.svg`} alt="" className="absolute top-4 left-[182px] h-9 w-10" />
            <img src={`${IMG}/dots.svg`} alt="" className="absolute top-[14px] left-[14px] h-9 w-[52px]" />
            <BeaverPet
              mood={pet.mood as BeaverMood}
              outfit={outfit as BeaverOutfit}
              activity={activity as BeaverActivity}
              className="absolute top-3 left-0 h-[270px] w-[232px] [&_.beaver-pet]:h-full [&_svg]:h-full"
            />
          </div>
          <div className="flex max-w-[236px] items-center gap-2 rounded-pill border-[1.5px] border-ink bg-card py-[6px] pr-3 pl-[10px]">
            <span className="text-[9px] font-extrabold tracking-[1.5px] text-muted-foreground">СЕЙЧАС</span>
            <span className="truncate text-xs font-bold text-foreground" title={wornLabels.join(" + ")}>
              {wornLabels.length > 0 ? wornLabels.join(" + ") : "без образа"}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={nameId} className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground">
              ИМЯ ПИТОМЦА
            </label>
            <div className="flex items-center gap-3 rounded-[14px] border-[2.5px] border-primary bg-card px-4 py-3 focus-within:ring-[3px] focus-within:ring-ring/40">
              <input
                id={nameId}
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => {
                  setName(e.target.value);
                  rename.reset();
                }}
                className="min-w-0 flex-1 bg-transparent text-[17px] font-bold text-foreground outline-none"
              />
              <span className="text-[11px] font-bold text-muted-foreground">
                {name.length} / {NAME_MAX}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-[10px]">
            <span className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground">ГАРДЕРОБ</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Категории">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={group === g.id}
                  onClick={() => setGroup(g.id)}
                  className={cn(
                    "rounded-pill border-[1.5px] border-ink px-[14px] py-[6px] text-xs font-extrabold transition-colors",
                    group === g.id ? "bg-primary text-white" : "bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <ul className="-mx-1 grid max-h-[260px] grid-cols-3 gap-x-[10px] gap-y-3 overflow-y-auto px-1 pt-3 pb-1 sm:grid-cols-4">
              {shown.map((item, index) => {
                const on = worn(item);
                const locked = !item.owned;
                return (
                  <li key={item.id} className={cn("flex min-w-0 flex-col gap-[6px]", locked && "opacity-55")}>
                    <button
                      type="button"
                      disabled={locked || busy}
                      aria-pressed={on}
                      aria-label={`${item.label}: ${on ? "надето" : locked ? "закрыто" : "доступно"}`}
                      title={locked ? (item.hint ? `Дают ${item.hint}` : `В магазине за ${item.price} монет`) : item.label}
                      onClick={() => toggle(item)}
                      className={cn(
                        "relative flex h-[78px] w-full items-center justify-center rounded-[14px] transition-transform enabled:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        TONES[index % TONES.length],
                        on ? "border-[3.5px] border-primary" : "border-2 border-ink",
                      )}
                    >
                      <ItemIcon item={item} />
                      {on && (
                        <span className="absolute -top-[10px] -right-[8px] flex size-[22px] items-center justify-center rounded-pill border-2 border-ink bg-secondary">
                          <img src={`${IMG}/check.svg`} alt="" className="size-3" />
                        </span>
                      )}
                      {locked && <img src={`${IMG}/lock.svg`} alt="" className="absolute top-1 right-1 size-[18px]" />}
                    </button>
                    <span className="line-clamp-2 text-center text-[11px] leading-[14px] font-bold text-foreground">{item.label}</span>
                    <span
                      className={cn(
                        "text-center text-[9px] font-extrabold tracking-[1px]",
                        on ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {on ? "надето" : locked ? "закрыто" : "доступно"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Новое имя и образ сразу появятся в паспорте</p>
        <div className="flex gap-[10px]">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="h-12 px-[22px] text-sm">
            Отмена
          </Button>
          <Button type="submit" disabled={busy || !trimmed || (!nameChanged && !outfitChanged)} className="h-12 px-[26px] text-sm">
            {busy ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </div>
    </form>
  );
}

const sortKeys = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
