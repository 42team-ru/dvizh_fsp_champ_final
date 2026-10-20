import { useState } from "react";
import { cn } from "cn";
import { Shield } from "lucide-react";
import type { ShopBundleResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Badge } from "@/shared/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { CLUBS } from "@/widgets/beaver-pet/ui/beaver-clubs";
import { HOCKEY_CLUBS } from "@/widgets/beaver-pet/ui/beaver-hockey-clubs";
import { isTeamBundle } from "@/features/pet-wardrobe/model/dressing";
import {
  LookPreview,
  MiniItems,
  OwnedBadge,
  Prices,
  RoomButton,
  SectionTitle,
} from "./room-pieces";

const BUNDLE_PARTS: Record<string, string> = {
  shirt: "форма",
  hat: "головной убор",
  bottom: "шорты",
  activity: "инвентарь",
  neck: "шарф",
};

export function WardrobeBundles({
  bundles,
  busy,
  onTry,
  onWear,
}: {
  bundles: ShopBundleResponse[];
  busy: boolean;
  onTry(bundle: ShopBundleResponse): void;
  onWear(bundle: ShopBundleResponse): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded
    ? bundles
    : bundles.filter((bundle) => !isTeamBundle(bundle)).slice(0, 6);
  return (
    <section className="space-y-[14px]">
      <SectionTitle detail="надеваются целиком в одно касание">
        Готовые комплекты
      </SectionTitle>
      <div className="grid grid-cols-1 gap-4 min-[450px]:grid-cols-2 md:grid-cols-2 min-[1180px]:grid-cols-3">
        {shown.map((bundle) => (
          <article
            key={bundle.code}
            className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-hard-sm"
          >
            <LookPreview
              look={bundle}
              className="h-[168px] border-b-2 border-ink"
            >
              <Badge
                variant="outline"
                className="absolute top-[10px] left-[10px] h-[26px] border-[1.5px] text-[11px] font-extrabold"
              >
                {bundle.category.label}
              </Badge>
            </LookPreview>
            <div className="flex flex-1 flex-col gap-2 px-[14px] pt-3 pb-[14px]">
              <h3 className="text-base leading-[22px] font-extrabold">
                {bundle.label}
              </h3>
              <MiniItems items={bundle.items} />
              <p className="text-xs font-semibold">
                Есть {bundle.items.length - bundle.missingCount} из{" "}
                {bundle.items.length}
                {bundle.missingCount > 0 &&
                  ` · не хватает ${bundle.missingCount}`}
              </p>
              <div className="mt-auto flex flex-col gap-[10px]">
                <RoomButton
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onTry(bundle)}
                >
                  Примерить целиком
                </RoomButton>
                <RoomButton
                  variant="outline"
                  className="shadow-none"
                  disabled={busy || bundle.items.every((item) => !item.owned)}
                  onClick={() => onWear(bundle)}
                >
                  Надеть что есть
                </RoomButton>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!expanded && bundles.length > shown.length && (
        <RoomButton
          variant="link"
          className="px-0"
          onClick={() => setExpanded(true)}
        >
          Все комплекты · {bundles.length}
        </RoomButton>
      )}
    </section>
  );
}

type ShopBundleProps = {
  bundle: ShopBundleResponse;
  balance: number;
  busy: boolean;
  team?: boolean;
  onTry(): void;
  onBuy(): void;
  onWear(): void;
};
function ShopBundleCard({
  bundle,
  balance,
  busy,
  team,
  onTry,
  onBuy,
  onWear,
}: ShopBundleProps) {
  const club = [...Object.entries(CLUBS), ...Object.entries(HOCKEY_CLUBS)].find(
    ([code]) => code === bundle.outfit.shirt,
  )?.[1];
  const shortfall = Math.max(0, bundle.price - balance);
  return (
    <article className="flex min-w-0 gap-[14px] rounded-2xl border-2 border-ink bg-card p-[14px] shadow-hard-sm max-[450px]:flex-col">
      <LookPreview
        look={bundle}
        className={cn(
          "aspect-square size-[104px] shrink-0 rounded-xl border-2 border-ink max-[450px]:w-full max-[450px]:h-[160px]",
          team && "min-[450px]:size-[120px]",
        )}
      >
        {bundle.owned && (
          <div className="absolute top-1 left-1">
            <OwnedBadge />
          </div>
        )}
      </LookPreview>
      <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
        <div className="flex items-center gap-2">
          {team && (
            <span
              aria-hidden="true"
              className="relative flex size-8 shrink-0 items-center justify-center"
            >
              <Shield
                className="absolute size-8"
                fill={club?.color ?? "var(--ultramarine)"}
                stroke="var(--ink)"
                strokeWidth={2}
              />
              <span
                className="relative text-[9px] font-extrabold"
                style={{ color: club?.trim ?? "var(--primary-foreground)" }}
              >
                {(club?.label ?? bundle.label)
                  .split(/[\s(]+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")}
              </span>
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm leading-[19px] font-extrabold">
              {team ? (club?.label ?? bundle.label) : bundle.label}
            </h3>
            {team && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {bundle.category.label} ·{" "}
                {[
                  ...new Set(
                    bundle.items.map(
                      (item) => BUNDLE_PARTS[item.slot] ?? "аксессуар",
                    ),
                  ),
                ].join(", ")}
              </p>
            )}
          </div>
        </div>
        {team ? (
          <MiniItems items={bundle.items} />
        ) : (
          <p className="text-[11px] leading-4 text-muted-foreground">
            {bundle.items.length} вещей · у тебя{" "}
            {bundle.items.length - bundle.missingCount}, докупить{" "}
            {bundle.missingCount}
          </p>
        )}
        {bundle.owned ? (
          <p className="text-xs text-muted-foreground">
            Все {bundle.items.length} вещей в гардеробе
          </p>
        ) : (
          <Prices full={bundle.fullPrice} price={bundle.price} />
        )}
        {bundle.locked && (
          <p className="text-xs text-muted-foreground">{bundle.lockedReason}</p>
        )}
        <div className="mt-auto flex gap-[10px] pt-1">
          {bundle.owned ? (
            <RoomButton className="w-full" disabled={busy} onClick={onWear}>
              Надеть комплект
            </RoomButton>
          ) : (
            <>
              <RoomButton
                variant="outline"
                className="min-w-0 flex-1 px-2 shadow-none"
                disabled={busy}
                onClick={onTry}
              >
                Примерить
              </RoomButton>
              <RoomButton
                variant="secondary"
                className="min-w-0 flex-1 px-2"
                disabled={busy || bundle.locked || shortfall > 0}
                onClick={onBuy}
              >
                {bundle.locked
                  ? "Закрыто"
                  : shortfall
                    ? `Не хватает ${shortfall}`
                    : "Купить"}
              </RoomButton>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function ShopBundles({
  bundles,
  balance,
  busy,
  onTry,
  onBuy,
  onWear,
}: {
  bundles: ShopBundleResponse[];
  balance: number;
  busy: boolean;
  onTry(bundle: ShopBundleResponse): void;
  onBuy(bundle: ShopBundleResponse): void;
  onWear(bundle: ShopBundleResponse): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const regular = bundles.filter((bundle) => !isTeamBundle(bundle));
  const teams = bundles.filter(isTeamBundle);
  const categories = [
    ...new Map(
      teams.map((bundle) => [bundle.category.code, bundle.category]),
    ).values(),
  ];
  const sportOrder = ["football", "hockey", "basketball", "volleyball"];
  categories.sort((a, b) => {
    const rank = (code: string) =>
      sportOrder.includes(code) ? sportOrder.indexOf(code) : sportOrder.length;
    return rank(a.code) - rank(b.code);
  });
  const card = (bundle: ShopBundleResponse, team = false) => (
    <ShopBundleCard
      key={bundle.code}
      bundle={bundle}
      team={team}
      balance={balance}
      busy={busy}
      onTry={() => onTry(bundle)}
      onBuy={() => onBuy(bundle)}
      onWear={() => onWear(bundle)}
    />
  );
  return (
    <>
      <section className="space-y-[14px]">
        <SectionTitle detail="докупи недостающее разом">
          Комплекты со скидкой
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2">
          {(expanded ? regular : regular.slice(0, 4)).map((bundle) =>
            card(bundle),
          )}
        </div>
        {!expanded && regular.length > 4 && (
          <RoomButton
            variant="link"
            className="px-0"
            onClick={() => setExpanded(true)}
          >
            Все комплекты · {regular.length}
          </RoomButton>
        )}
      </section>
      {categories.length > 0 && (
        <section className="space-y-[14px]">
          <SectionTitle detail="форма твоего клуба — целиком на 20% дешевле">
            Командные комплекты
          </SectionTitle>
          <Tabs defaultValue={categories[0].code}>
            <TabsList className="no-scrollbar flex h-auto w-full flex-nowrap justify-start gap-[6px] overflow-x-auto rounded-none border-0 bg-transparent p-0 pb-1">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.code}
                  value={category.code}
                  className="min-h-11 shrink-0 rounded-pill border-2 border-ink bg-card px-[14px] py-2 text-[13px] font-extrabold data-[state=active]:bg-ultramarine data-[state=active]:text-primary-foreground md:min-h-9"
                >
                  {category.label}{" "}
                  <span className="ml-[6px] opacity-65">
                    {
                      teams.filter(
                        (bundle) => bundle.category.code === category.code,
                      ).length
                    }
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((category) => (
              <TabsContent
                key={category.code}
                value={category.code}
                className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2"
              >
                {teams
                  .filter((bundle) => bundle.category.code === category.code)
                  .map((bundle) => card(bundle, true))}
              </TabsContent>
            ))}
          </Tabs>
        </section>
      )}
    </>
  );
}
