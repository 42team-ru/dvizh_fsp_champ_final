import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { QrCode, absoluteUrl } from "@/shared/components/ui/qr-code";
import { toast } from "@/shared/lib/toast";

/**
 * Окно «Поделиться»: сверху карточка с QR (билет встречи или обложка паспорта — `children`), ниже ссылка,
 * копирование, системное «Отправить» на телефоне и QR картинкой — распечатать или переслать в мессенджер.
 */
export function ShareDialog({ open, onOpenChange, path, title, description, children }: {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Путь на сайте, например `/events/…`. */
  path: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  // QR для скачивания: невидимый canvas, отдаёт PNG
  const canvas = useRef<HTMLCanvasElement>(null);
  const url = absoluteUrl(path);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.info(url);
    }
  };
  const download = () => {
    const link = document.createElement("a");
    link.href = canvas.current?.toDataURL("image/png") ?? "";
    link.download = "qr-dvizh.png";
    link.click();
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* широкое окно под экран: на компьютере карточка слева, текст и кнопки справа — всё видно без прокрутки */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-x-hidden sm:max-w-[calc(100vw-2rem)] overflow-y-auto bg-background p-5 [scrollbar-width:none] sm:p-8 lg:max-w-[1040px] [&::-webkit-scrollbar]:hidden">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
          <div className="flex min-w-0 justify-center">{children}</div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="pr-8">
              <DialogTitle className="font-display text-2xl leading-8 font-bold text-foreground">{title}</DialogTitle>
              <DialogDescription className="mt-2 text-base font-semibold text-muted-foreground">{description}</DialogDescription>
            </div>
            <p className="truncate rounded-xl border-2 border-dashed border-track px-3 py-2.5 text-center text-sm font-bold text-muted-foreground" title={url}>
              {url}
            </p>
            <Button variant="ink" className="h-12 w-full" onClick={() => void copy()}>Скопировать ссылку</Button>
            <div className="flex gap-2">
              {canShare && (
                <Button variant="soft" className="h-12 min-w-0 flex-1 px-3" onClick={() => void navigator.share({ title, url }).catch(() => undefined)}>
                  Отправить
                </Button>
              )}
              <Button variant="soft" className="h-12 min-w-0 flex-1 px-3" onClick={download}>Скачать QR</Button>
            </div>
          </div>
        </div>
        <QRCodeCanvas ref={canvas} value={url} size={512} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" className="hidden" />
      </DialogContent>
    </Dialog>
  );
}

/** Приглушённый «посадочный талон» встречи: данные слева, по линии отрыва — корешок с QR. */
export function ShareTicket({ path, number, sport, title, rows }: {
  path: string;
  number: string;
  sport: string;
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="relative mr-[3px] mb-[3px] flex w-full overflow-hidden rounded-[22px] border-2 border-ink bg-lavender shadow-hard-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <span className="truncate text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground">ПОСАДОЧНЫЙ ТАЛОН · № {number}</span>
        <span className="w-fit max-w-full truncate rounded-pill border-[1.5px] border-ink bg-card px-[10px] py-[3px] text-[11px] font-extrabold text-foreground">
          {sport}
        </span>
        <p className="line-clamp-3 font-display text-lg leading-[22px] font-bold text-foreground">{title}</p>
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 flex-col gap-px">
            <span className="text-[10px] font-extrabold tracking-[1px] text-muted-foreground">{row.label}</span>
            <span className="line-clamp-2 text-[13px] leading-[17px] font-bold text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="flex w-[118px] shrink-0 flex-col items-center justify-center gap-2 border-l-2 border-dashed border-ink bg-lavender-soft px-3 py-4">
        <QrCode path={path} label="QR-код: страница встречи" className="size-[92px]" />
        <span className="text-center text-[9px] leading-3 font-extrabold tracking-[1px] text-muted-foreground">НАВЕДИТЕ<br />КАМЕРУ</span>
      </div>
      {/* вырезы на линии отрыва: цвет фона окна, будто талон надорван */}
      <span className="absolute top-[-12px] right-[107px] box-border size-[22px] rounded-full border-2 border-ink bg-background" />
      <span className="absolute bottom-[-12px] right-[107px] box-border size-[22px] rounded-full border-2 border-ink bg-background" />
    </div>
  );
}

/** Закрытый паспорт спортсмена: обложка с именем и «органом выдачи», в окошке — QR на профиль. */
export function SharePassport({ path, name, handle }: { path: string; name: string; handle?: string }) {
  return (
    <div className="relative mx-auto flex w-[264px] overflow-hidden rounded-[8px_22px_22px_8px] border-2 border-ink bg-lavender shadow-hard-sm">
      {/* корешок */}
      <div className="w-[14px] shrink-0 border-r-2 border-ink bg-track" />
      <div className="relative flex min-w-0 flex-1 flex-col items-center gap-3 px-5 pt-5 pb-4 text-center">
        <img src="/profile/guilloche.svg" alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover opacity-50" />
        <div className="relative flex flex-col items-center gap-1">
          <img src="/profile/ring-logo.svg" alt="" className="size-7" />
          <span className="text-[11px] font-extrabold tracking-[2px] text-foreground">ПАСПОРТ СПОРТСМЕНА</span>
          <span className="text-[9px] font-extrabold tracking-[2px] text-muted-foreground">SPORT PASSPORT</span>
        </div>
        <div className="relative rounded-xl border-2 border-ink bg-card p-2">
          <QrCode path={path} label="QR-код: профиль спортсмена" className="size-[112px] border-0" />
        </div>
        <div className="relative flex w-full min-w-0 flex-col gap-px">
          <p className="truncate font-display text-lg leading-6 font-bold text-foreground">{name}</p>
          {handle && <p className="truncate text-xs font-semibold text-muted-foreground">{handle}</p>}
        </div>
        <span className="relative text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground">ОРГАН ВЫДАЧИ · ДВИЖ</span>
      </div>
    </div>
  );
}
