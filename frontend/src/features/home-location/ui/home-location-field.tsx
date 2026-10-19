import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AddressInput } from "@/widgets/events-map/ui/address-input";
import { LocationPicker } from "@/widgets/events-map/ui/location-picker";
import { addressAt } from "@/widgets/events-map/lib/geocoder";
import { DEFAULT_CENTER } from "@/widgets/events-map/lib/map-provider";
import { Button } from "@/shared/components/ui/button";

const fallback = (point: [number, number]) => `Точка на карте: ${point[1].toFixed(5)}, ${point[0].toFixed(5)}`;

/**
 * Домашняя точка: адрес с подсказками 2ГИС и карта, как на создании мероприятия. value и onChange — [lon, lat].
 * Адрес на сервере не хранится, поэтому подпись к сохранённой точке берём обратным геокодером.
 */
export function HomeLocationField({ value, onChange, mapClassName = "h-[240px] w-full" }: {
  value: [number, number] | null;
  onChange(point: [number, number] | null): void;
  mapClassName?: string;
}) {
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  /** Последняя точка, для которой ждём адрес: ответ на прежнюю не должен перезаписать подпись. */
  const pending = useRef<[number, number] | null>(null);

  const describe = async (point: [number, number]) => {
    pending.current = point;
    setLocating(true);
    const found = await addressAt(point).catch(() => null);
    if (pending.current !== point) return;
    setLocating(false);
    setAddress(found ?? fallback(point));
  };

  useEffect(() => {
    if (value) void describe(value);
    // Подпись к сохранённой точке — один раз при открытии; дальше её ставят обработчики ниже.
  }, []);

  const clear = () => { pending.current = null; setLocating(false); setAddress(""); onChange(null); };

  return (
    <div className="flex flex-col gap-2">
      <AddressInput value={address} near={value ?? DEFAULT_CENTER} invalid={Boolean(address) && !value && !locating}
        placeholder="Улица и дом или район"
        onText={(text) => { pending.current = null; setLocating(false); setAddress(text); onChange(null); }}
        onPick={(place) => { pending.current = null; setLocating(false); setAddress(place.address); onChange(place.point); }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {locating ? "Определяем адрес точки…" : value ? "Дом отмечен — можно уточнить кликом по карте"
            : "Начните вводить и выберите подсказку или нажмите на карту"}
        </span>
        {value && (
          <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1" onClick={clear}>
            <X className="size-4" />
            Убрать
          </Button>
        )}
      </div>
      <LocationPicker value={value} onChange={(point) => { onChange(point); void describe(point); }} className={mapClassName} />
      <p className="text-xs font-medium text-muted-foreground">
        Точку видите только вы: по ней подбираем встречи рядом с домом.
      </p>
    </div>
  );
}
