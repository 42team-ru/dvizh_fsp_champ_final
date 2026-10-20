import { useState, type ComponentProps, type ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { CalendarPlus, Download } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { googleCalendarUrl, icsUrl, outlookUrl, type CalendarEvent } from "../lib/calendar-links";
import { calendarPlatform } from "../lib/platform";

const item =
  "flex cursor-pointer flex-col items-start gap-0.5 rounded-[12px] px-3 py-2.5 text-[15px] font-extrabold text-foreground outline-none data-[highlighted]:bg-muted";
const hint = "text-[13px] font-medium text-muted-foreground";

type Props = Pick<ComponentProps<typeof Button>, "variant" | "size" | "rough" | "className"> & {
  event: CalendarEvent;
  children?: ReactNode;
};

/**
 * «В календарь» по устройству: iPhone/iPad — сразу системный Календарь (.ics открывается в Safari),
 * Android — Google Календарь или файл, компьютер — меню веб-календарей и файл .ics.
 * У серии веб-календари получают только ближайшее занятие, а файл — все мои занятия.
 */
export function AddToCalendarButton({ event, children = "В календарь", ...button }: Props) {
  const [platform] = useState(calendarPlatform);
  const [sheet, setSheet] = useState(false);
  const webNote = event.recurring ? "ближайшее занятие" : undefined;
  const fileNote = event.recurring ? "все ваши занятия серии" : undefined;

  if (platform === "ios") {
    return <Button {...button} onClick={() => { window.location.href = icsUrl(event.eventId); }}>{children}</Button>;
  }

  if (platform === "android") {
    return (
      <>
        <Button {...button} aria-haspopup="dialog" onClick={() => setSheet(true)}>{children}</Button>
        <Dialog open={sheet} onOpenChange={setSheet}>
          <DialogContent className="top-auto bottom-0 max-w-none translate-y-0 gap-4 rounded-b-none border-2 border-ink bg-card p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-base">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold">Добавить в календарь</DialogTitle>
              <DialogDescription className="text-base">{event.title}</DialogDescription>
            </DialogHeader>
            <Button asChild className="h-auto min-h-14 flex-col gap-0 py-2 text-base whitespace-normal">
              <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" onClick={() => setSheet(false)}>
                Google Календарь
                {webNote && <span className="text-xs font-bold opacity-80">{webNote}</span>}
              </a>
            </Button>
            <Button asChild variant="soft" className="h-auto min-h-14 flex-col gap-0 py-2 text-base whitespace-normal">
              <a href={icsUrl(event.eventId)} download onClick={() => setSheet(false)}>
                Другой календарь (файл .ics)
                {fileNote && <span className="text-xs font-bold text-muted-foreground">{fileNote}</span>}
              </a>
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        {/* пока меню открыто, кнопка не сдвигается от наведения/нажатия — иначе меню дёргается следом */}
        <Button {...button} className={cn(button.className, "data-[state=open]:translate-x-0! data-[state=open]:translate-y-0!")}>
          {children}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={16}
          className="z-50 w-[280px] rounded-[20px] border-2 border-ink bg-card p-2 shadow-hard data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <DropdownMenu.Label className="flex items-center gap-2 px-3 pt-2 pb-1 text-[13px] font-extrabold text-muted-foreground">
            <CalendarPlus className="size-4" strokeWidth={2.4} />Добавить в календарь
          </DropdownMenu.Label>
          <DropdownMenu.Item asChild className={item}>
            <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
              Google Календарь{webNote && <span className={hint}>{webNote}</span>}
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <a href={outlookUrl(event, "live")} target="_blank" rel="noreferrer">
              Outlook.com{webNote && <span className={hint}>{webNote}</span>}
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <a href={outlookUrl(event, "office")} target="_blank" rel="noreferrer">
              Outlook (Microsoft 365){webNote && <span className={hint}>{webNote}</span>}
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-2 my-1 h-0.5 bg-track" />
          <DropdownMenu.Item asChild className={item}>
            <a href={icsUrl(event.eventId)} download>
              <span className="flex items-center gap-2"><Download className="size-4" strokeWidth={2.4} />Файл .ics</span>
              <span className={hint}>Apple Календарь, Outlook, Яндекс{fileNote ? ` · ${fileNote}` : ""}</span>
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
