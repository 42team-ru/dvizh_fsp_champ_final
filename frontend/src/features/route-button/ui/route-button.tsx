import type { ComponentProps } from "react";
import { useUsersMyPreferences } from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";

type Point = { lat: number; lon: number };

/** Маршрут в 2ГИС: обе точки обязательны — «долгота,широта» откуда, «|», «долгота,широта» куда. */
export const dgisRoute = (from: Point, to: Point) =>
  `https://2gis.ru/directions/points/${from.lon},${from.lat}%7C${to.lon},${to.lat}`;
/** Место на карте 2ГИС: точка встречи, откуда идти — человек укажет сам. */
export const dgisPlace = (to: Point) => `https://2gis.ru/geo/${to.lon},${to.lat}`;

/**
 * «Построить маршрут»: если в профиле указан дом (онбординг «Где ты живёшь?» или «Редактировать профиль») —
 * маршрут от дома; иначе просто точка встречи на карте 2ГИС, а свой адрес человек введёт там сам.
 */
export function RouteButton({ to, className, children = "Построить маршрут", ...props }: {
  to: Point;
} & Omit<ComponentProps<typeof Button>, "asChild">) {
  const preferences = useUsersMyPreferences({ query: { staleTime: 5 * 60_000 } });
  const home = preferences.data?.status === 200 ? preferences.data.data.home : undefined;
  return (
    <Button asChild variant="soft" className={className} {...props}>
      <a href={home ? dgisRoute(home, to) : dgisPlace(to)} target="_blank" rel="noreferrer">{children}</a>
    </Button>
  );
}
