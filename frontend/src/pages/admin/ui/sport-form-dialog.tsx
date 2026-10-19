import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { cn } from "cn";
import {
  useAdminCreateSport,
  useAdminListSports,
  useAdminRemoveSportImage,
  useAdminRenameSport,
  useAdminReplaceSportImage,
} from "@/shared/api/generated/core/admin/admin";
import type { AdminSportResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { CabinetDialog, FieldLabel, inputClass, Warning } from "@/pages/cabinet/ui/parts";
import { useInvalidateAdmin } from "./parts";

const MAX_BYTES = 2 * 1024 * 1024;
const MIN_SIDE = 256;
/** Точка фокуса по умолчанию — там, где обычно голова персонажа. */
const DEFAULT_FOCUS = { x: 50, y: 25 };

type Focus = { x: number; y: number };

/** Проверка PNG до отправки: формат, размер и квадрат от 256×256 (то же проверяет сервер). */
function checkPng(file: File): Promise<string | undefined> {
  if (file.type !== "image/png") return Promise.resolve("Нужен файл PNG");
  if (file.size > MAX_BYTES) return Promise.resolve("Файл больше 2 МБ");
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width !== img.height || img.width < MIN_SIDE ? "Картинка должна быть квадратной, не меньше 256×256" : undefined);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("Не удалось прочитать файл");
    };
    img.src = url;
  });
}

/** Подсказка о возможном дубле: вид с похожим названием уже есть в справочнике. */
function useLookalike(name: string, selfId?: string) {
  const query = name.trim();
  const list = useAdminListSports({ searchText: query.slice(0, 4), size: 10 }, { query: { enabled: query.length >= 3 } });
  const items = list.data?.status === 200 ? list.data.data.items ?? [] : [];
  const key = query.toLowerCase().replaceAll("ё", "е");
  return items.find((s) => s.id !== selfId && s.name.toLowerCase().replaceAll("ё", "е") !== key && (s.name.toLowerCase().includes(key.slice(0, 4)) || key.includes(s.name.toLowerCase().slice(0, 4))));
}

/**
 * Добавить вид спорта или изменить существующий: название и PNG. Точка фокуса — клик по превью (голова персонажа):
 * вокруг неё картинка обрезается в карточках ленты.
 */
export function SportFormDialog({ open, sport, onClose, onPick }: { open: boolean; sport?: AdminSportResponse; onClose: () => void; onPick?: (name: string) => void }) {
  const invalidate = useInvalidateAdmin();
  const create = useAdminCreateSport();
  const rename = useAdminRenameSport();
  const replace = useAdminReplaceSportImage();
  const remove = useAdminRemoveSportImage();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [focus, setFocus] = useState<Focus>(DEFAULT_FOCUS);
  const [published, setPublished] = useState(true);
  const [dropOver, setDropOver] = useState(false);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const edit = !!sport;
  const lookalike = useLookalike(name, sport?.id);

  useEffect(() => {
    if (!open) return;
    setName(sport?.name ?? "");
    setFile(undefined);
    setPreview(undefined);
    setFocus(sport?.imageUploaded ? { x: sport.imageFocus.x, y: sport.imageFocus.y } : DEFAULT_FOCUS);
    setPublished(true);
    setRemoveCurrent(false);
    setFileError(undefined);
    setError(undefined);
    setBusy(false);
  }, [open, sport]);

  useEffect(() => {
    if (!file) return setPreview(undefined);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = async (picked?: File) => {
    if (!picked) return;
    const problem = await checkPng(picked);
    setFileError(problem);
    if (problem) return;
    setFile(picked);
    setRemoveCurrent(false);
  };

  const shown = preview ?? (!removeCurrent && sport?.hasImage ? sport.imageUrl : undefined);
  const shownFocus = preview || sport?.imageUploaded ? focus : sport?.imageFocus ?? DEFAULT_FOCUS;
  const setFocusAt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!shown) return;
    const box = e.currentTarget.getBoundingClientRect();
    setFocus({ x: Math.round(((e.clientX - box.left) / box.width) * 100), y: Math.round(((e.clientY - box.top) / box.height) * 100) });
  };

  const submit = async () => {
    const title = name.trim();
    if (!title) return setError("Введите название вида");
    setError(undefined);
    setBusy(true);
    try {
      const focusParams = file ? { focusX: focus.x, focusY: focus.y } : {};
      if (sport) {
        if (title !== sport.name) await rename.mutateAsync({ id: sport.id, data: { name: title } });
        if (file) await replace.mutateAsync({ id: sport.id, data: { file }, params: focusParams });
        else if (removeCurrent && sport.imageUploaded) await remove.mutateAsync({ id: sport.id });
      } else {
        await create.mutateAsync({ params: { name: title, published, ...focusParams }, data: file ? { file } : undefined });
      }
      await invalidate();
      onClose();
    } catch (e) {
      setError((e as { detail?: string })?.detail ?? "Не удалось сохранить вид");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CabinetDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={edit ? "Изменить вид спорта" : "Новый вид спорта"}
      description="Название и PNG-картинка вида спорта"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button disabled={busy} onClick={submit}>{edit ? "Сохранить" : "Сохранить вид"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="sport-name">Название</FieldLabel>
        <input id="sport-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Сапсёрфинг" className={inputClass} />
        {lookalike && (
          <p className="flex flex-wrap items-center gap-2 rounded-[12px] border-[1.5px] border-ink bg-mint-soft px-3 py-2 text-xs font-bold text-foreground">
            Возможно, «{lookalike.name}»? Такой вид уже есть в справочнике.
            {onPick && (
              <button type="button" onClick={() => { onPick(lookalike.name); onClose(); }}
                className="rounded-pill border-[1.5px] border-ink bg-secondary px-2.5 py-0.5 text-[11px] font-extrabold">
                Выбрать «{lookalike.name}»
              </button>
            )}
          </p>
        )}
        <p className="text-[11px] font-medium text-muted-foreground">Пробелы, регистр и «ё» дублей не создают.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Картинка вида (PNG)</FieldLabel>
        <div
          onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
          onDragLeave={() => setDropOver(false)}
          onDrop={(e) => { e.preventDefault(); setDropOver(false); void pick(e.dataTransfer.files[0]); }}
          className={cn("flex flex-col gap-4 rounded-[18px] border-2 border-dashed border-ink p-3.5 sm:flex-row", dropOver ? "bg-lime-soft" : "bg-background")}
        >
          <div
            onClick={setFocusAt}
            role={shown ? "button" : undefined}
            aria-label={shown ? "Нажмите на голову персонажа: это точка фокуса" : undefined}
            className={cn("relative size-[132px] shrink-0 self-center overflow-hidden rounded-[16px] border-2 border-ink bg-sky sm:self-start", shown && "cursor-crosshair")}
          >
            {shown ? (
              <>
                <img src={shown} alt="" draggable={false} className="size-full object-cover" />
                <span
                  className="pointer-events-none absolute size-[28px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_var(--ink)]"
                  style={{ left: `${shownFocus.x}%`, top: `${shownFocus.y}%` }}
                />
              </>
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                <ImagePlus className="size-6" strokeWidth={2.2} />
                <span className="text-[10px] font-extrabold">PNG</span>
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-sm font-extrabold text-foreground">
              {file ? `${file.name} · ${Math.round(file.size / 1024)} КБ` : shown ? "Текущая картинка" : "Картинки пока нет"}
            </p>
            <p className="text-xs leading-[17px] font-medium text-muted-foreground">
              Перетащите PNG сюда или выберите файл. Квадрат от 256×256, до 2 МБ; лучше с прозрачным фоном.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="h-9 text-[13px]" onClick={() => input.current?.click()}>
                {shown ? "Заменить файл" : "Выбрать файл"}
              </Button>
              {(file || (sport?.imageUploaded && !removeCurrent)) && (
                <Button size="sm" variant="soft" rough={{ color: "var(--orange)" }} className="h-9 text-[13px] text-orange-ink"
                  onClick={() => { setFile(undefined); if (!file) setRemoveCurrent(true); }}>
                  <Trash2 className="size-3.5" strokeWidth={2.6} />
                  Убрать
                </Button>
              )}
            </div>
            {shown && <p className="text-[11px] font-bold text-foreground">Точка фокуса: нажмите на голову персонажа · X {shownFocus.x}% · Y {shownFocus.y}%</p>}
            <input ref={input} type="file" accept="image/png" className="sr-only" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>
        {fileError && <p role="alert" className="text-xs font-bold text-orange-ink">{fileError}</p>}
      </div>

      {!edit && (
        <button type="button" role="switch" aria-checked={published} onClick={() => setPublished((v) => !v)} className="flex items-center gap-3 text-left">
          <span className={cn("flex h-7 w-12 shrink-0 items-center rounded-pill border-2 border-ink px-[3px] transition-colors", published ? "justify-end bg-secondary" : "justify-start bg-card")}>
            <span className="size-5 rounded-full bg-ink" />
          </span>
          <span className="flex flex-col">
            <span className="text-[13px] font-extrabold text-foreground">Показывать в справочнике</span>
            <span className="text-[11px] font-medium text-muted-foreground">Выключите, чтобы сохранить черновик: вид будет скрыт, пока вы его не вернёте.</span>
          </span>
        </button>
      )}
      {error && <Warning className="py-2">{error}</Warning>}
    </CabinetDialog>
  );
}
