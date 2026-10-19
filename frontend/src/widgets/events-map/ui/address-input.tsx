import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "cn";
import { suggestPlaces, type Place } from "../lib/geocoder";

/**
 * Поле адреса с подсказками 2ГИС. Выбор подсказки отдаёт адрес и точку (карта к ней приблизится).
 * Ручная правка текста сбрасывает выбор: адрес засчитывается только из подсказки или клика по карте.
 */
export function AddressInput({ value, near, onText, onPick, invalid, placeholder = "Город, улица, дом или место" }: {
  value: string;
  /** Где искать в первую очередь: точка формы или центр карты, [lon, lat]. */
  near: [number, number];
  /** Текст поменяли руками: выбор (точка) больше не действует. */
  onText(text: string): void;
  onPick(place: Place): void;
  invalid?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      suggestPlaces(query, near, controller.signal)
        .then((found) => { setPlaces(found); setActive(0); })
        .catch((error) => { if (error.name !== "AbortError") setPlaces([]); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // near не в зависимостях: искать заново при каждом сдвиге точки не нужно.
  }, [query]);

  const pick = (place: Place) => {
    onPick(place);
    setOpen(false);
    setPlaces([]);
    setQuery("");
  };

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && places.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-activedescendant={open && places[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        onChange={(e) => { onText(e.target.value); setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 150); }}
        onKeyDown={(e) => {
          if (!open || places.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, places.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          if (e.key === "Enter") { e.preventDefault(); pick(places[active]); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && places.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Подсказки адреса"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border-2 border-ink bg-card p-1 shadow-hard-sm">
          {places.map((place, i) => (
            <li key={place.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => { window.clearTimeout(blurTimer.current); pick(place); }}
                className={cn("block w-full rounded-xl px-3 py-2 text-left", i === active ? "bg-secondary" : "hover:bg-muted")}>
                <span className="block truncate text-sm font-extrabold">{place.title}</span>
                {place.subtitle && <span className="block truncate text-xs font-semibold text-muted-foreground">{place.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
