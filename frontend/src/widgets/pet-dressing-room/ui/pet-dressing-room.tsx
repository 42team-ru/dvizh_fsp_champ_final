import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import { useUser } from "@/entity/user/model/use-user";
import {
  usePetsBundles,
  usePetsCatalog,
  usePetsGetMine,
  usePetsLooks,
  usePetsShop,
} from "@/shared/api/generated/core/pets/pets";
import { useUsersWallet } from "@/shared/api/generated/core/users/users";
import type {
  PetCatalogResponse,
  PetResponse,
  PetSavedLookResponse,
  ShopBundleResponse,
  ShopItemResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import {
  emptyLook,
  lookItems,
  onlyOwned,
  setPrice,
  toggleItem,
  useShopHandoff,
  type Look,
} from "@/features/pet-wardrobe/model/dressing";
import { useDressingActions } from "@/features/pet-wardrobe/model/use-dressing-actions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileAppBar } from "@/widgets/mobile-shell/ui/mobile-app-bar";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import {
  Coin,
  LookPreview,
  Prices,
  RoomButton,
  SectionTitle,
  WornChip,
} from "./room-pieces";
import { ShopBundles, WardrobeBundles } from "./bundle-cards";
import { ItemCatalog } from "./item-catalog";
import { SavedLooks } from "./saved-looks";
import { PurchaseDialog, SaveLookDialog, type Purchase } from "./room-dialogs";

export function PetDressingRoom({ mode }: { mode: "wardrobe" | "shop" }) {
  const { user } = useUser();
  const enabled = user?.systemRole === "USER";
  const pet = usePetsGetMine({ query: { enabled } });
  const catalog = usePetsCatalog({ query: { enabled, staleTime: 5 * 60_000 } });
  const items = usePetsShop({ query: { enabled } });
  const bundles = usePetsBundles({ query: { enabled } });
  const looks = usePetsLooks({ query: { enabled } });
  const wallet = useUsersWallet({ query: { enabled } });
  const queries = [pet, catalog, items, bundles, looks, wallet];
  return (
    <div className="min-h-dvh bg-background text-ink">
      <div className="hidden lg:block">
        <AppHeader current="profile" />
      </div>
      <div className="border-b-2 border-ink lg:hidden">
        <MobileAppBar dir="m-profile" title="Движ" />
      </div>
      {user && !enabled ? (
        <main className="mx-auto max-w-[1280px] p-6">
          <p>Гардероб и монеты доступны личным аккаунтам.</p>
          <RoomButton asChild variant="outline" className="mt-4">
            <Link to="/">На главную</Link>
          </RoomButton>
        </main>
      ) : queries.some((query) => query.isError) ? (
        <main className="mx-auto max-w-[1280px] space-y-4 p-6">
          <p role="alert">Не удалось загрузить гардероб. Попробуй ещё раз.</p>
          <RoomButton
            onClick={() =>
              queries.forEach((query) => {
                void query.refetch();
              })
            }
          >
            Повторить
          </RoomButton>
        </main>
      ) : pet.data?.status === 200 &&
        catalog.data?.status === 200 &&
        items.data?.status === 200 &&
        bundles.data?.status === 200 &&
        looks.data?.status === 200 &&
        wallet.data?.status === 200 ? (
        <DressingContent
          key={`${user?.id}:${mode}`}
          shop={mode === "shop"}
          pet={pet.data.data}
          catalog={catalog.data.data}
          items={items.data.data}
          bundles={bundles.data.data}
          looks={looks.data.data}
          balance={wallet.data.data.coins}
        />
      ) : (
        <p role="status" className="p-10 text-center">
          Загружаем гардероб…
        </p>
      )}
      <div className="lg:hidden">
        <MobileTabBar current="profile" />
      </div>
    </div>
  );
}

function DressingContent({
  shop,
  pet,
  catalog,
  items,
  bundles,
  looks,
  balance,
}: {
  shop: boolean;
  pet: PetResponse;
  catalog: PetCatalogResponse;
  items: ShopItemResponse[];
  bundles: ShopBundleResponse[];
  looks: PetSavedLookResponse[];
  balance: number;
}) {
  const navigate = useNavigate();
  const handoff = useShopHandoff();
  const [look, setLook] = useState<Look>(() =>
    shop && handoff.look
      ? handoff.look
      : { activity: pet.activity, outfit: { ...pet.outfit } },
  );
  const [saved, setSaved] = useState<Look>(pet);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const actions = useDressingActions(setSaved);
  const reducedMotion = useReducedMotion();
  const lastBalance = useRef(balance);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (shop) useShopHandoff.getState().set(null);
  }, [shop]);
  useEffect(() => {
    if (balance !== lastBalance.current) {
      lastBalance.current = balance;
      setBump((value) => value + 1);
    }
  }, [balance]);
  // Keep the baseline in sync when another surface changes the pet.
  useEffect(() => {
    setSaved({ activity: pet.activity, outfit: { ...pet.outfit } });
  }, [pet]);
  const selected = lookItems(items, look);
  const tried = selected.filter((item) => !item.owned);
  const { full, price } = setPrice(tried);
  const background =
    items.find(
      (item) =>
        item.slot === "background" && item.code === look.outfit.background,
    )?.label ?? "Без фона";
  const owned = items.filter(
    (item) => item.owned && item.id !== "activity:none",
  );
  const openPurchase = (next: Purchase) => {
    actions.clearError();
    setPurchase(next);
  };
  const tryBundle = (bundle: ShopBundleResponse) => {
    actions.clearError();
    if (shop)
      setLook({ activity: bundle.activity, outfit: { ...bundle.outfit } });
    else {
      handoff.set({ activity: bundle.activity, outfit: { ...bundle.outfit } });
      navigate("/profile/shop");
    }
  };
  const wearLook = async (next: Look) => {
    actions.clearError();
    if (await actions.wear(next)) setLook(next);
  };
  const toggle = (item: ShopItemResponse) => {
    actions.clearError();
    const next = toggleItem(look, item);
    setLook(next);
    if (shop && item.owned) {
      // Persist just this owned slot; other trial slots remain a local preview.
      const base = toggleItem(saved, item);
      const isOn =
        item.slot === "activity"
          ? next.activity === item.code
          : next.outfit[item.slot] === item.code;
      if (item.slot === "activity") base.activity = isOn ? item.code : "none";
      else if (isOn) base.outfit[item.slot] = item.code;
      else delete base.outfit[item.slot];
      void actions.wear(base).then((ok) => {
        if (!ok) setLook(look);
      });
    }
  };
  const randomize = () => {
    const next = emptyLook();
    const slots = [...new Set(owned.map((item) => item.slot))];
    for (const slot of slots) {
      const options = owned.filter((item) => item.slot === slot);
      const item = options[Math.floor(Math.random() * options.length)];
      if (slot === "activity") next.activity = item.code;
      else next.outfit[slot] = item.code;
    }
    actions.clearError();
    setLook(next);
  };
  const removeTrials = () => {
    setLook((current) => {
      const next = {
        activity: current.activity,
        outfit: { ...current.outfit },
      };
      for (const item of tried) {
        if (item.slot === "activity") next.activity = saved.activity;
        else if (saved.outfit[item.slot])
          next.outfit[item.slot] = saved.outfit[item.slot];
        else delete next.outfit[item.slot];
      }
      return next;
    });
  };
  return (
    <main className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-7 px-4 pt-6 pb-28 md:px-8 md:pt-7 lg:pb-14">
      <Link
        to="/profile"
        className="flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-ultramarine lg:hidden"
      >
        <ArrowLeft className="size-4" />В профиль
      </Link>
      <div className="flex min-w-0 flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 basis-full space-y-1 min-[1180px]:basis-0">
          <p className="text-[11px] font-extrabold tracking-[1.54px] text-ultramarine uppercase">
            СОПРОВОЖДАЮЩИЙ · {pet.name}
          </p>
          <h1 className="font-display text-[30px] leading-[1.25] font-extrabold md:text-[40px]">
            {shop ? "Магазин вещей" : "Гардероб"}
          </h1>
          <p className="pt-1 text-sm leading-5 font-medium text-muted-foreground">
            {shop
              ? `Вещи покупаются за монеты за встречи. Перед покупкой примерь — ${pet.name} слева покажет, как сидит.`
              : "Нажми на вещь, чтобы надеть или снять. Готовые комплекты надеваются целиком."}
          </p>
        </div>
        <motion.div
          key={bump}
          initial={false}
          animate={
            reducedMotion || !bump ? {} : { y: [0, -6, 0], scale: [1, 1.08, 1] }
          }
          transition={{ duration: 0.35 }}
          aria-live="polite"
          className="flex items-center gap-2 rounded-pill border-2 border-ink bg-lime-soft py-2 pr-4 pl-[10px] text-[15px] font-extrabold shadow-[2px_2px_0_var(--ink)]"
        >
          <Coin className="size-[22px]" />
          {balance} монет
        </motion.div>
        <nav
          aria-label="Гардероб и магазин"
          className="inline-flex max-w-full items-center gap-1 rounded-pill border-2 border-ink bg-card p-1"
        >
          <Link
            to="/profile/wardrobe"
            aria-current={!shop ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-pill px-3 py-[10px] text-sm font-extrabold sm:px-5 md:min-h-10",
              !shop && "bg-ultramarine text-primary-foreground",
            )}
          >
            Гардероб
            <Badge
              variant="secondary"
              className="h-[19px] border-0 px-[7px] text-[11px]"
            >
              {owned.length}
            </Badge>
          </Link>
          <Link
            to="/profile/shop"
            aria-current={shop ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-pill px-3 py-[10px] text-sm font-extrabold sm:px-5 md:min-h-10",
              shop && "bg-ultramarine text-primary-foreground",
            )}
          >
            Магазин
          </Link>
        </nav>
      </div>
      <div className="grid min-w-0 items-start gap-7 md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] min-[1180px]:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-4 rounded-[24px] border-2 border-ink bg-card p-4 shadow-hard md:sticky md:top-5 md:max-h-[calc(100dvh-40px)] md:overflow-y-auto lg:top-[96px] lg:max-h-[calc(100dvh-116px)]">
          <LookPreview
            look={look}
            className="aspect-square w-full rounded-2xl border-2 border-ink"
          >
            {shop && tried.length > 0 && (
              <Badge
                variant="accent"
                className="absolute top-[10px] left-[10px] border-[1.5px] text-[10px] font-extrabold tracking-[1px]"
              >
                ПРИМЕРКА
              </Badge>
            )}
          </LookPreview>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold">{pet.name}</h2>
            <span className="text-xs font-medium text-muted-foreground">
              фон: {background}
            </span>
          </div>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-[6px]">
              {selected.map((item) => (
                <WornChip
                  key={item.id}
                  item={item}
                  tried={shop && !item.owned}
                  disabled={actions.busy}
                  onRemove={() => toggle(item)}
                />
              ))}
            </div>
          )}
          {shop ? (
            <>
              {tried.length > 0 && (
                <div className="space-y-[10px] rounded-2xl border-2 border-dashed border-ink bg-peach p-[14px]">
                  <div className="flex flex-wrap items-center gap-1 text-sm font-extrabold">
                    <span>
                      Примерено {tried.length}{" "}
                      {tried.length === 1
                        ? "вещь"
                        : tried.length < 5
                          ? "вещи"
                          : "вещей"}{" "}
                      ·
                    </span>
                    <Prices full={full} price={price} discount={false} />
                  </div>
                  <p className="text-xs leading-4 text-muted-foreground">
                    {tried.length >= 2
                      ? "Вместе на 20% дешевле, чем по одной. "
                      : ""}
                    Вещи сразу наденутся.
                  </p>
                  <div className="flex gap-[10px]">
                    <RoomButton
                      variant="secondary"
                      className="min-w-0 flex-1"
                      disabled={actions.busy}
                      onClick={() =>
                        openPurchase({
                          title: "Купить примеренное",
                          items: tried,
                          wear: true,
                        })
                      }
                    >
                      Купить за {price}
                    </RoomButton>
                    <RoomButton
                      variant="outline"
                      className="shadow-none"
                      disabled={actions.busy}
                      onClick={removeTrials}
                    >
                      Снять
                    </RoomButton>
                  </div>
                </div>
              )}
              <div className="flex gap-[10px]">
                <RoomButton
                  variant="outline"
                  className="min-w-0 flex-1 px-2 shadow-none"
                  disabled={actions.busy}
                  onClick={() => {
                    actions.clearError();
                    setLook(saved);
                  }}
                >
                  Вернуть как было
                </RoomButton>
                <RoomButton
                  variant="outline"
                  className="min-w-0 flex-1 px-2 shadow-none"
                  disabled={actions.busy}
                  onClick={() => setLook(emptyLook())}
                >
                  Снять всё
                </RoomButton>
              </div>
              <p className="text-xs leading-[17px] text-muted-foreground">
                Примерка ничего не списывает. Уйдёшь со страницы — {pet.name}{" "}
                вернётся в свой образ.
              </p>
            </>
          ) : (
            <>
              <RoomButton
                className="w-full"
                disabled={actions.busy || tried.length > 0}
                onClick={() => {
                  actions.clearError();
                  setSaveOpen(true);
                }}
              >
                Сохранить образ
              </RoomButton>
              <div className="flex gap-[10px]">
                <RoomButton
                  variant="outline"
                  className="min-w-0 flex-1 px-2 shadow-none"
                  disabled={actions.busy}
                  onClick={randomize}
                >
                  Случайно
                </RoomButton>
                <RoomButton
                  variant="outline"
                  className="min-w-0 flex-1 px-2 shadow-none"
                  disabled={actions.busy}
                  onClick={() => {
                    actions.clearError();
                    setLook(saved);
                  }}
                >
                  Отменить
                </RoomButton>
                <RoomButton
                  variant="outline"
                  className="min-w-0 flex-1 px-2 shadow-none"
                  disabled={actions.busy}
                  onClick={() => setLook(emptyLook())}
                >
                  Снять всё
                </RoomButton>
              </div>
              <p className="text-xs leading-[17px] text-muted-foreground">
                Монеты — за встречи: +10 за участие, от 30 до 80 за проведённую
                встречу.
              </p>
            </>
          )}
          {actions.error && !purchase && !saveOpen && (
            <p role="alert" className="text-sm font-bold text-destructive">
              {actions.error}
            </p>
          )}
        </aside>
        <div className="flex min-w-0 flex-col gap-8">
          {shop ? (
            <>
              <div className="flex flex-wrap items-center gap-5 rounded-[24px] border-2 border-ink bg-ultramarine p-[22px] md:pr-[26px] text-primary-foreground shadow-hard">
                <LookPreview
                  look={{
                    activity: "none",
                    outfit: { hat: "beanie", background: "meadow" },
                  }}
                  className="size-24 shrink-0 rounded-full border-2 border-ink"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold tracking-[1.54px] text-lime uppercase">
                    {pet.name} подсказывает
                  </p>
                  <h2 className="mt-1 font-display text-[20px] leading-[25px] font-extrabold">
                    Комплект целиком — на 20% дешевле, чем по одной вещи
                  </h2>
                  <p className="mt-2 text-[13px] leading-[18px] text-lilac">
                    Скидка на две и больше недостающих вещи. Монеты дают за
                    участие и проведение встреч.
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-[36px] leading-10 font-extrabold">
                    {balance}
                  </p>
                  <p className="mt-1 text-xs text-lilac">монет на счету</p>
                </div>
              </div>
              <ShopBundles
                bundles={bundles}
                balance={balance}
                busy={actions.busy}
                onTry={tryBundle}
                onBuy={(bundle) =>
                  openPurchase({
                    title: `Комплект «${bundle.label}»`,
                    items: bundle.items,
                    wear: true,
                    bundleCode: bundle.code,
                    look: { activity: bundle.activity, outfit: bundle.outfit },
                  })
                }
                onWear={(bundle) => {
                  void wearLook(bundle);
                }}
              />
            </>
          ) : (
            <>
              <WardrobeBundles
                bundles={bundles}
                busy={actions.busy}
                onTry={tryBundle}
                onWear={(bundle) => {
                  setLook(onlyOwned(bundle));
                }}
              />
              <SavedLooks
                looks={looks}
                items={items}
                busy={actions.busy}
                onWear={(next) => {
                  void wearLook(next);
                }}
                onDelete={(id) => {
                  void actions.forget(id);
                }}
                onSave={() => {
                  actions.clearError();
                  setSaveOpen(true);
                }}
              />
            </>
          )}
          <ItemCatalog
            shop={shop}
            items={items}
            catalog={catalog}
            look={look}
            busy={actions.busy}
            onToggle={toggle}
            onBuy={(item) =>
              openPurchase({ title: "Купить вещь", items: [item], wear: true })
            }
          />
          {shop && (
            <section className="space-y-[14px]">
              <SectionTitle>Как заработать монеты</SectionTitle>
              <div className="grid grid-cols-1 gap-4 min-[450px]:grid-cols-2 md:grid-cols-3">
                {[
                  {
                    value: "+10",
                    text: "за участие во встрече",
                    tone: "bg-lime-soft",
                  },
                  {
                    value: "+30–80",
                    text: "за проведённую встречу с 3+ участниками",
                    tone: "bg-sky-soft",
                  },
                  {
                    value: "+30 / +50",
                    text: "за «Первый шаг» / «Разносторонний»",
                    tone: "bg-peach",
                  },
                ].map((reward) => (
                  <div
                    key={reward.value}
                    className={cn(
                      "rounded-2xl border-2 border-ink p-4",
                      reward.tone,
                    )}
                  >
                    <p className="font-display text-[23px] font-extrabold">
                      {reward.value}
                    </p>
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">
                      {reward.text}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                rough={false}
                asChild
                variant="link"
                className="h-11 px-0"
              >
                <Link to="/feed">Найти встречу</Link>
              </Button>
            </section>
          )}
        </div>
      </div>
      <PurchaseDialog
        purchase={purchase}
        balance={balance}
        busy={actions.busy}
        error={actions.error}
        onClose={() => setPurchase(null)}
        onConfirm={() => {
          if (!purchase) return;
          const current = purchase;
          void actions
            .purchase(
              current.items
                .filter((item) => !item.owned)
                .map((item) => item.id),
              current.wear,
              current.bundleCode,
            )
            .then((result) => {
              if (!result) return;
              setPurchase(null);
              setLook((previous) => {
                if (current.bundleCode) return result;
                const next = {
                  activity: result.activity,
                  outfit: { ...result.outfit },
                };
                // Other unpaid trials stay visible; all owned slots reflect the returned pet.
                const purchased = new Set(current.items.map((item) => item.id));
                for (const item of lookItems(items, previous)) {
                  if (item.owned || purchased.has(item.id)) continue;
                  if (item.slot === "activity") next.activity = item.code;
                  else next.outfit[item.slot] = item.code;
                }
                return next;
              });
            });
        }}
      />
      <SaveLookDialog
        open={saveOpen}
        count={looks.length}
        busy={actions.busy}
        error={actions.error}
        onClose={() => setSaveOpen(false)}
        onSave={(name) => {
          void (async () => {
            if (name && !(await actions.remember(name, look))) return;
            if (await actions.wear(look)) setSaveOpen(false);
          })();
        }}
      />
    </main>
  );
}
