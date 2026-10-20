import { cn } from "cn";

/** Ссылка до пробела; точка, запятая или скобка в конце — уже текст, а не адрес. */
const URL = /(https?:\/\/[^\s<]*[^\s<.,:;!?)»"'])/g;

/** Текст пользователя, в котором ссылки (чат в Telegram, трансляция) выделены и открываются в новой вкладке. */
export function Linkified({ text, className }: { text: string; className?: string }) {
  return text.split(URL).map((part, i) => i % 2
    ? <a key={i} href={part} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      className={cn("font-bold break-all text-primary underline underline-offset-2 hover:text-primary/80", className)}>{part}</a>
    : part);
}
