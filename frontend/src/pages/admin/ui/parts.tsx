import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import { CabinetDialog, FieldLabel, textareaClass, Warning } from "@/pages/cabinet/ui/parts";

export { Chip, PillTabs, Warning } from "@/pages/cabinet/ui/parts";

/** Причина решения админа: обязательна, до 1000 символов (как в API). */
export const REASON_MAX = 1000;

/** Сбросить все админские запросы после решения: счётчики, списки, карточки. */
export function useInvalidateAdmin() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === "string" && /^\/api\/(admin|events|comments|organizations|sports)/.test(q.queryKey[0]),
    });
}

/** Заголовок раздела: название и пояснение под ним, справа — дополнительное действие. */
export function PageHead({ title, text, aside }: { title: string; text?: string; aside?: ReactNode }) {
  return (
    <div className="flex w-full flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="font-display text-[28px] leading-[34px] font-extrabold text-foreground">{title}</h1>
        {text && <p className="max-w-[600px] text-[13px] leading-[19px] font-medium text-muted-foreground">{text}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Поиск с задержкой: в запрос уходит текст после паузы в 300 мс. */
export function SearchBox({ placeholder, onChange, className }: { placeholder: string; onChange: (value: string) => void; className?: string }) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const t = setTimeout(() => onChange(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value, onChange]);
  return (
    <label className={cn("flex h-11 w-full items-center gap-2 rounded-pill border-2 border-ink bg-card pr-4 pl-3.5 sm:w-[240px]", className)}>
      <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.4} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
      />
    </label>
  );
}

/** Низ таблицы: «1–20 из 52» и кнопки страниц. */
export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total === 0) return null;
  const from = page * size + 1;
  const to = Math.min(total, from + size - 1);
  // Окно из трёх страниц вокруг текущей.
  const start = Math.min(Math.max(0, page - 1), Math.max(0, pages - 3));
  const window = Array.from({ length: Math.min(3, pages) }, (_, i) => start + i);
  const btn = "flex size-8 items-center justify-center rounded-full border-[1.5px] border-ink text-[13px] font-extrabold transition-colors disabled:opacity-40";
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        {from}–{to} из {total.toLocaleString("ru-RU")} · страница {page + 1} из {pages}
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Предыдущая страница" disabled={page === 0} onClick={() => onPage(page - 1)} className={cn(btn, "bg-card hover:bg-muted")}>
          <ChevronLeft className="size-4" strokeWidth={2.6} />
        </button>
        {window.map((p) => (
          <button key={p} type="button" aria-current={p === page ? "page" : undefined} onClick={() => onPage(p)}
            className={cn(btn, p === page ? "bg-primary text-white" : "bg-card text-foreground hover:bg-muted")}>
            {p + 1}
          </button>
        ))}
        <button type="button" aria-label="Следующая страница" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className={cn(btn, "bg-card hover:bg-muted")}>
          <ChevronRight className="size-4" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

const LETTER_TONES = ["bg-sky","bg-lavender-soft", "bg-lime-soft", "bg-mint-soft", "bg-peach", "bg-secondary", "bg-salmon", "bg-sky-soft"];

/** Тон плитки по строке: у одной организации цвет всегда один. */
export const toneOf = (key: string) => LETTER_TONES[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % LETTER_TONES.length];

/** Квадрат с первой буквой названия (логотип организации, если его нет). */
export function LetterTile({ name, logoUrl, className }: { name?: string; logoUrl?: string; className?: string }) {
  if (logoUrl) return <img src={logoUrl} alt="" className={cn("size-11 shrink-0 rounded-[12px] border-2 border-ink object-cover", className)} />;
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink font-display text-lg font-extrabold text-foreground", toneOf(name ?? "?"), className)}>
      {(name ?? "?")[0]?.toUpperCase()}
    </span>
  );
}

/** Подпись колонки таблицы. */
export const TH = "text-[10px] leading-[14px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase";

/** Объект решения в диалоге: «Ракетка Сибирь · Красноярск». */
export function Subject({ media, title, text }: { media?: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-background px-3.5 py-3">
      {media}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-extrabold text-foreground">{title}</span>
        {text && <span className="truncate text-xs font-medium text-muted-foreground">{text}</span>}
      </div>
    </div>
  );
}

/**
 * Диалог решения админа. Если `reasonLabel` задан — причина обязательна (до 1000 символов).
 * `onConfirm` получает причину; ошибка сервера (`detail`) показывается плашкой.
 */
export function DecisionDialog({
  open,
  onOpenChange,
  title,
  subject,
  children,
  reasonLabel,
  reasonHint,
  placeholder,
  confirmLabel,
  confirmClassName,
  confirmIcon,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subject?: ReactNode;
  children?: ReactNode;
  reasonLabel?: string;
  reasonHint?: string;
  placeholder?: string;
  confirmLabel: string;
  confirmClassName?: string;
  confirmIcon?: ReactNode;
  pending?: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);
  const empty = reasonLabel !== undefined && !reason.trim();
  const tooLong = reason.length > REASON_MAX;
  const submit = () => {
    setTouched(true);
    if (empty || tooLong) return;
    onConfirm(reason.trim());
  };
  return (
    <CabinetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Назад</Button>
          <Button className={confirmClassName} disabled={pending} onClick={submit}>
            {confirmIcon}
            {confirmLabel}
          </Button>
        </>
      }
    >
      {subject}
      {children}
      {reasonLabel !== undefined && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="admin-reason">{reasonLabel} *</FieldLabel>
          <textarea
            id="admin-reason"
            rows={3}
            value={reason}
            placeholder={placeholder}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={touched && (empty || tooLong)}
            className={cn(textareaClass, touched && (empty || tooLong) && "border-orange")}
          />
          <div className="flex justify-between gap-3 text-[11px] font-medium">
            <span className={touched && empty ? "font-bold text-orange-ink" : "text-muted-foreground"}>
              {touched && empty ? "Укажите причину — без неё решение не сохранится" : reasonHint}
            </span>
            <span className={tooLong ? "font-bold text-orange-ink" : "text-muted-foreground"}>{reason.length} / {REASON_MAX}</span>
          </div>
        </div>
      )}
      {error && <Warning className="py-2">{error}</Warning>}
    </CabinetDialog>
  );
}

/** Строка списка последствий с галочкой. */
export function Consequence({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[13px] font-semibold text-foreground">
      <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-lime-soft text-[10px] font-extrabold">✓</span>
      {children}
    </li>
  );
}
