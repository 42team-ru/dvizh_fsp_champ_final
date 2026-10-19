import { useEffect, useId, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useSportsSearch } from "@/shared/api/generated/core/sports/sports";
import { Input } from "@/shared/components/ui/input";

/** Выбранный вид спорта: из справочника (sportId) или свой (только название — сервер создаст его сам). */
export type PickedSport = { sportId?: string; name: string };

/**
 * Поиск вида спорта по справочнику с подсказками и кнопкой «Добавить свой».
 * Нормализацию и создание нового вида делает сервер (правило «Свой вид спорта»).
 */
export function SportPicker({ onPick, placeholder = "Футбол, шахматы, петанк…", exclude = [] }: {
  onPick(sport: PickedSport): void;
  placeholder?: string;
  /** id видов, которые уже выбраны и не нужны в подсказках. */
  exclude?: string[];
}) {
  const listId = useId();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const search = useSportsSearch({ query }, { query: { enabled: query.length > 0, placeholderData: keepPreviousData } });
  const found = (search.data?.status === 200 ? search.data.data : []).filter((s) => !exclude.includes(s.id)).slice(0, 8);
  const exact = found.some((s) => s.name.toLowerCase() === text.trim().toLowerCase());

  const pick = (sport: PickedSport) => {
    onPick(sport);
    setText("");
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Input value={text} placeholder={placeholder} aria-controls={listId} onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !text.trim()) return;
          event.preventDefault();
          const match = found.find((s) => s.name.toLowerCase() === text.trim().toLowerCase());
          pick(match ? { sportId: match.id, name: match.name } : { name: text.trim() });
        }} />
      {query.length > 0 && (
        <ul id={listId} className="flex flex-wrap gap-2" aria-label="Подходящие виды спорта">
          {found.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => pick({ sportId: s.id, name: s.name })}
                className="rounded-pill border-2 border-ink bg-card px-3 py-1.5 text-sm font-bold hover:bg-muted">
                {s.name}
              </button>
            </li>
          ))}
          {!exact && text.trim() && (
            <li>
              <button type="button" onClick={() => pick({ name: text.trim() })}
                className="rounded-pill border-2 border-dashed border-ink bg-secondary px-3 py-1.5 text-sm font-bold">
                Добавить «{text.trim()}» как новый вид
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
