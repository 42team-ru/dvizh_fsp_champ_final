import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { absoluteUrl } from "@/shared/components/ui/qr-code";
import { toast } from "@/shared/lib/toast";
import { downloadPoster } from "../lib/download-poster";

export type ShareFormat = "post" | "story";

/** Один холст для превью и PNG: масштабируется только обёртка. */
function PosterPreview({
  format,
  posterRef,
  children,
}: {
  format: ShareFormat;
  posterRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const height = format === "post" ? 1350 : 1920;
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={frame}
      className="relative w-full overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-hard-sm"
      style={{
        maxWidth: format === "post" ? 360 : 258,
        aspectRatio: `1080 / ${height}`,
      }}
    >
      <div
        style={{
          width: 1080,
          height,
          transform: `scale(${width / 1080})`,
          transformOrigin: "top left",
        }}
      >
        <div
          ref={posterRef}
          data-share-poster={format}
          className="relative isolate overflow-hidden font-sans"
          style={{ width: 1080, height }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Общее окно для афиши встречи и обложки паспорта. Рисунок передаёт вызывающая страница. */
export function ShareDialog({
  open,
  onOpenChange,
  path,
  title,
  description,
  filename,
  ready = true,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  path: string;
  title: string;
  description: string;
  filename: string;
  ready?: boolean;
  children(format: ShareFormat): ReactNode;
}) {
  const poster = useRef<HTMLDivElement>(null);
  const linkId = useId();
  const [format, setFormat] = useState<ShareFormat>("post");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = absoluteUrl(path);
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      const input = document.getElementById(linkId) as HTMLInputElement | null;
      input?.focus();
      input?.select();
      toast.info("Выделили ссылку — скопируйте её вручную");
    }
  };
  const download = async () => {
    if (!poster.current || busy) return;
    setBusy(true);
    setError("");
    try {
      await downloadPoster(poster.current, filename);
    } catch {
      setError(
        "Не удалось подготовить картинку. Проверьте загрузку изображений и попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  };
  const socials = [
    {
      label: "Telegram",
      href: `https://t.me/share/url?${new URLSearchParams({ url, text: title })}`,
    },
    {
      label: "ВКонтакте",
      href: `https://vk.com/share.php?${new URLSearchParams({ url, title })}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?${new URLSearchParams({ text: `${title}\n${url}` })}`,
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[980px] gap-0 overflow-x-hidden overflow-y-auto bg-background p-5 sm:max-w-[980px] sm:p-8">
        <div className="grid min-w-0 items-center gap-7 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-9">
          <div className="flex min-w-0 flex-col items-center gap-4 pt-5 md:pt-0">
            <PosterPreview format={format} posterRef={poster}>
              {children(format)}
            </PosterPreview>
            <div
              role="group"
              aria-label="Формат картинки"
              className="flex gap-1 rounded-pill border-2 border-ink bg-card p-1"
            >
              {(
                [
                  ["post", "Пост 4:5"],
                  ["story", "Сторис 9:16"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={format === value ? "default" : "ghost"}
                  size="sm"
                  rough={false}
                  aria-pressed={format === value}
                  disabled={busy}
                  onClick={() => setFormat(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              PNG · 1080 × {format === "post" ? 1350 : 1920}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="pr-5">
              <DialogTitle className="font-display text-2xl leading-snug font-extrabold">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-base leading-relaxed font-medium text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
            <Button
              variant="secondary"
              className="h-13 w-full text-base"
              disabled={busy || !ready}
              aria-busy={busy}
              onClick={() => void download()}
            >
              <Download className="size-5" />
              {busy ? "Готовим картинку…" : "Скачать картинку"}
            </Button>
            {!ready && (
              <p role="status" className="text-sm text-muted-foreground">
                Для картинки нужны загруженные данные профиля.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="text-sm font-semibold text-destructive"
              >
                {error}
              </p>
            )}
            <div className="flex min-w-0 items-center gap-1 rounded-pill border-2 border-ink bg-card p-1.5">
              <label htmlFor={linkId} className="sr-only">
                Ссылка для отправки
              </label>
              <Input
                id={linkId}
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                variant="ink"
                rough={false}
                className="h-10 px-3 text-sm"
                onClick={() => void copy()}
              >
                Копировать
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {socials.map((social) => (
                <Button
                  key={social.label}
                  asChild
                  variant="soft"
                  rough={false}
                  className="h-11 flex-1 px-3 text-sm"
                >
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social.label}
                  </a>
                </Button>
              ))}
            </div>
            {canShare && (
              <Button
                variant="soft"
                className="h-12 md:hidden"
                onClick={() =>
                  void navigator.share({ title, url }).catch(() => undefined)
                }
              >
                <Share2 className="size-5" />
                Отправить с телефона
              </Button>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              По QR и ссылке откроется страница на Движе. Если понадобится вход,
              после него вернём сюда.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
