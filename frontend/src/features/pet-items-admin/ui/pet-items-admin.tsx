import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAdminListPetItemsQueryKey, useAdminCreatePetItem, useAdminDeletePetItem, useAdminListPetItems,
  useAdminPreviewPetItem, useAdminUpdatePetItemFit,
} from "@/shared/api/generated/core/admin/admin";
import { getPetsCatalogQueryKey } from "@/shared/api/generated/core/pets/pets";
import type { PetArtResponse, PetArtResponseBodyPart } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

/** Часть тела: подпись и слот каталога (как PetBodyPart на бэкенде). */
const BODY_PARTS: { value: PetArtResponseBodyPart; label: string; slot: string }[] = [
  { value: "HEAD", label: "Голова: шапка, корона", slot: "hat" },
  { value: "EYES", label: "Глаза: очки, маска", slot: "eyewear" },
  { value: "NECK", label: "Шея: медаль, шарф", slot: "neck" },
  { value: "CHEST", label: "Грудь: принт, эмблема (вместо одежды)", slot: "shirt" },
  { value: "LEGS", label: "Низ: шорты, обувь", slot: "bottom" },
  { value: "PAW", label: "В лапе: ракетка, кубок", slot: "activity" },
  { value: "GROUND", label: "Рядом на земле: мяч, снаряд", slot: "activity" },
];
const partOf = (value: PetArtResponseBodyPart) => BODY_PARTS.find((part) => part.value === value)!;

/** Что сейчас примеряется на бобре страницы: слот каталога и рисунок с текущими цифрами посадки. */
export type PetItemPreview = { slot: string; art: PetArtResponse } | null;

type Fit = { x: string; y: string; scale: string };
const toFit = (art: PetArtResponse): Fit => ({ x: String(art.x), y: String(art.y), scale: String(art.scale) });

/** Новая картинка после разбора или уже сохранённая вещь. */
type Fitting = { art: PetArtResponse; code?: string; label: string; paths?: number };

const field = "flex min-w-0 flex-col gap-2 text-sm font-medium";
const select = "w-full min-w-0 rounded-xl border bg-background px-3 py-3 text-base focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Админ добавляет вещи бобру: PNG или SVG → вещь на выбранной части тела. Примерка идёт на бобре страницы
 * через onPreview, цифры посадки можно подогнать руками.
 */
export function PetItemsAdmin({ onPreview }: { onPreview(preview: PetItemPreview): void }) {
  const queryClient = useQueryClient();
  const items = useAdminListPetItems();
  const [label, setLabel] = useState("");
  const [bodyPart, setBodyPart] = useState<PetArtResponseBodyPart>("HEAD");
  const [file, setFile] = useState<File | null>(null);
  const [fitting, setFitting] = useState<Fitting | null>(null);
  const [fit, setFit] = useState<Fit>({ x: "0", y: "0", scale: "1" });

  const numbers = { x: Number(fit.x), y: Number(fit.y), scale: Number(fit.scale) };
  const fitValid = Object.values(numbers).every(Number.isFinite) && numbers.scale > 0;

  useEffect(() => {
    onPreview(fitting && fitValid
      ? { slot: partOf(fitting.art.bodyPart).slot, art: { ...fitting.art, x: Number(fit.x), y: Number(fit.y), scale: Number(fit.scale) } }
      : null);
  }, [fitting, fit.x, fit.y, fit.scale, fitValid, onPreview]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getAdminListPetItemsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getPetsCatalogQueryKey() });
  };
  const preview = useAdminPreviewPetItem({ mutation: { onSuccess: (response) => {
    if (response.status !== 200) return;
    setFitting({ art: response.data.art, label, paths: response.data.paths });
    setFit(toFit(response.data.art));
  } } });
  const create = useAdminCreatePetItem({ mutation: { onSuccess: () => {
    refresh();
    setFitting(null);
    setFile(null);
    setLabel("");
  } } });
  const updateFit = useAdminUpdatePetItemFit({ mutation: { onSuccess: (response) => {
    refresh();
    const data = response.status === 200 ? response.data : undefined;
    if (data?.art) setFitting({ art: data.art, code: data.id, label: data.label });
  } } });
  const remove = useAdminDeletePetItem({ mutation: { onSuccess: (_, { code }) => {
    refresh();
    if (fitting?.code === code) setFitting(null);
  } } });

  const error = preview.error?.detail ?? create.error?.detail ?? updateFit.error?.detail ?? remove.error?.detail;
  const busy = preview.isPending || create.isPending || updateFit.isPending;

  return (
    <section className="space-y-6 rounded-3xl border-2 border-dashed p-5">
      <div>
        <h2 className="text-lg font-semibold">Новые вещи (админ)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          PNG или SVG превращается в векторный рисунок и сам садится на выбранную часть тела. Примерка — на бобре слева.
        </p>
      </div>

      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (file) preview.mutate({ params: { bodyPart }, data: { file } });
      }}>
        <label className={field}>
          Название
          <Input value={label} maxLength={100} placeholder="Золотая корона" onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className={field}>
          Куда надевается
          <select value={bodyPart} className={select} onChange={(event) => {
            setBodyPart(event.target.value as PetArtResponseBodyPart);
            setFitting(null);
          }}>
            {BODY_PARTS.map((part) => <option key={part.value} value={part.value}>{part.label}</option>)}
          </select>
        </label>
        <div className={field}>
          Картинка PNG или SVG, до 5 МБ
          <label className="inline-flex h-11 w-fit cursor-pointer items-center rounded-pill border-2 border-ink bg-card px-[22px] text-[15px] font-extrabold shadow-hard-sm focus-within:ring-[3px] focus-within:ring-ring/50">
            Загрузить картинку
            <input type="file" accept=".png,.svg,image/png,image/svg+xml" className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setFitting(null);
              }} />
          </label>
          <span className="text-sm text-muted-foreground">{file ? `Выбран файл: ${file.name}` : "Файл не выбран"}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="outline" disabled={!file || busy}>
            {preview.isPending ? "Разбираем…" : "Разобрать и примерить"}
          </Button>
          <Button type="button" disabled={!file || !label.trim() || !fitting || fitting.code !== undefined || !fitValid || busy}
            onClick={() => file && create.mutate({ params: { bodyPart, label, ...numbers }, data: { file } })}>
            {create.isPending ? "Сохраняем…" : "Добавить в гардероб"}
          </Button>
        </div>
      </form>

      {fitting && (
        <fieldset disabled={busy}>
          <legend className="mb-3 text-base font-semibold">
            Посадка: {fitting.label || "новая вещь"}{fitting.paths !== undefined && ` · контуров: ${fitting.paths}`}
          </legend>
          <div className="grid grid-cols-3 gap-3">
            {(["x", "y", "scale"] as const).map((key) => (
              <label key={key} className={field}>
                {key === "scale" ? "Масштаб" : key === "x" ? "Сдвиг x" : "Сдвиг y"}
                <Input type="number" step={key === "scale" ? 0.01 : 1} value={fit[key]}
                  onChange={(event) => setFit({ ...fit, [key]: event.target.value })} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setFit(toFit(fitting.art))}>Вернуть расчёт</Button>
            {fitting.code && (
              <Button type="button" disabled={!fitValid}
                onClick={() => updateFit.mutate({ code: fitting.code!, data: numbers })}>Сохранить посадку</Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setFitting(null)}>Закрыть примерку</Button>
          </div>
        </fieldset>
      )}
      {error && <p role="alert" className="text-base font-semibold text-destructive">{error}</p>}

      <div>
        <h3 className="mb-3 text-base font-semibold">Добавленные вещи</h3>
        {items.isPending && <p>Загружаем…</p>}
        {items.isError && <p role="alert">Не удалось загрузить список.</p>}
        {items.data?.data.length === 0 && <p className="text-sm text-muted-foreground">Пока ничего не добавлено.</p>}
        <ul className="space-y-3">
          {items.data?.data.map((item) => item.art && (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-4">
              <div className="min-w-0">
                <p className="text-base font-semibold">{item.label}</p>
                <p className="text-sm text-muted-foreground">{partOf(item.art.bodyPart).label}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  setFitting({ art: item.art!, code: item.id, label: item.label });
                  setFit(toFit(item.art!));
                }}>Примерить</Button>
                <Button type="button" size="sm" variant="destructive" disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Удалить «${item.label}»? Вещь снимется со всех бобров.`)) remove.mutate({ code: item.id });
                  }}>Удалить</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
