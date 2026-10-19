import { useEffect, useRef, useState } from "react";
import { Crosshair, Plus, X } from "lucide-react";
import type { FocusPoint } from "@/shared/api/generated/core/appAPI.schemas";
import { objectPosition } from "@/entity/event/lib/cover";
import { FocusPickerDialog } from "./focus-picker-dialog";

/** Фото, выбранное до создания мероприятия: файл, локальный предпросмотр и точка фокуса. */
export type PhotoDraft = { id: string; file: File; src: string; focus: FocusPoint };

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Фото для нового мероприятия: до `max`, первое — обложка. При добавлении сразу выбирается точка фокуса,
 * её можно поправить кнопкой «Фокус». Формат и размер проверяются здесь же, чтобы не узнать о них после публикации.
 */
export function PhotoDrafts({ value, onChange, max = 6 }: { value: PhotoDraft[]; onChange(next: PhotoDraft[]): void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState<PhotoDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(value);
  latest.current = value;
  // локальные ссылки на файлы освобождаются, когда форма уходит
  useEffect(() => () => latest.current.forEach((d) => URL.revokeObjectURL(d.src)), []);

  const choose = (file?: File) => {
    setError(null);
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Подойдёт JPG, PNG или WebP");
    if (file.size > MAX_BYTES) return setError("Фото больше 5 МБ — выберите поменьше");
    setPicking({ id: crypto.randomUUID(), file, src: URL.createObjectURL(file), focus: { x: 50, y: 50 } });
  };
  const exists = (d: PhotoDraft) => value.some((v) => v.id === d.id);
  const save = (focus: FocusPoint) => {
    if (!picking) return;
    const next = { ...picking, focus };
    onChange(exists(picking) ? value.map((v) => (v.id === next.id ? next : v)) : [...value, next]);
    setPicking(null);
  };
  const cancel = () => {
    // новый файл без выбранной точки не добавляем
    if (picking && !exists(picking)) URL.revokeObjectURL(picking.src);
    setPicking(null);
  };
  const remove = (d: PhotoDraft) => {
    URL.revokeObjectURL(d.src);
    onChange(value.filter((v) => v.id !== d.id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {value.map((d, i) => (
          <div key={d.id} className="relative aspect-[6/5] overflow-hidden rounded-[14px] border-2 border-ink bg-sky">
            <img src={d.src} alt={d.file.name} style={{ objectPosition: objectPosition(d.focus) }} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-pill border-[1.5px] border-ink bg-secondary px-2 py-0.5 text-[10px] font-extrabold tracking-[1px] text-foreground">
                ОБЛОЖКА
              </span>
            )}
            <button type="button" aria-label="Убрать фото" onClick={() => remove(d)}
              className="absolute top-1.5 right-1.5 flex size-[30px] items-center justify-center rounded-full border-[1.5px] border-ink bg-card hover:bg-peach">
              <X className="size-3.5" strokeWidth={3} />
            </button>
            <button type="button" onClick={() => setPicking(d)}
              className="absolute bottom-1.5 left-1.5 inline-flex h-[30px] items-center gap-1 rounded-pill border-[1.5px] border-ink bg-card px-2.5 text-[11px] font-extrabold hover:bg-secondary">
              <Crosshair className="size-3.5" strokeWidth={2.6} /> Фокус
            </button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => input.current?.click()}
            className="flex aspect-[6/5] flex-col items-center justify-center gap-1.5 rounded-[14px] border-[2.5px] border-dashed border-primary bg-lime-soft text-sm font-extrabold text-foreground hover:bg-secondary">
            <Plus className="size-5 text-primary" strokeWidth={2.6} />
            Добавить фото
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
      <input ref={input} type="file" accept={TYPES.join(",")} className="hidden"
        onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <FocusPickerDialog
        open={picking != null}
        src={picking?.src}
        initial={picking?.focus}
        title={picking && !exists(picking) ? "Новое фото: что главное?" : "Что главное на фото?"}
        onSave={save}
        onOpenChange={(open) => !open && cancel()}
      />
    </div>
  );
}
