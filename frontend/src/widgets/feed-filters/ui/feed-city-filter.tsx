import type { useFeedCity } from "@/entity/event/model/use-feed-city";
import { FEED_CITIES } from "@/shared/lib/cities";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/shared/components/ui/select";

export function FeedCityFilter({ city }: { city: ReturnType<typeof useFeedCity> }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={city.value} onValueChange={city.select}>
        <SelectTrigger aria-label="Город событий" className="max-w-full text-base shadow-hard-sm">
          {city.label}
        </SelectTrigger>
        <SelectContent>
          {city.ownName && <SelectItem value={city.ownName} disabled={!city.ownAvailable}>
            Мой город · {city.ownName}
          </SelectItem>}
          {city.value !== "all" && city.value !== city.ownName && !FEED_CITIES.some((item) => item.name === city.value) &&
            <SelectItem value={city.value}>{city.value}</SelectItem>}
          {FEED_CITIES.filter((item) => item.name !== city.ownName).map((item) => (
            <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
          ))}
          <SelectItem value="all">Все города</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm font-medium text-muted-foreground">
        {city.unavailable ? "Укажите домашнюю точку в профиле, чтобы искать в своём городе." :
          city.value !== "all" ? "Рядом с центром города или домашней точкой · 30 км · онлайн из любого города" : "Включая онлайн-события"}
      </p>
    </div>
  );
}
