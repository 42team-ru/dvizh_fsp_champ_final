import type { ReactNode } from "react";
import { toast as sonner } from "sonner";
import { MemphisGlyph } from "@/shared/components/ui/memphis-background";
import { RoughBorder } from "@/shared/components/ui/rough-border";

type Kind = "success" | "error" | "info" | "warning";

type Options = {
  description?: ReactNode;
  duration?: number;
};

const KIND: Record<
  Kind,
  { fill: string; accent: string; mark: string; label: string; duration: number }
> = {
  success: { fill: "var(--secondary)", accent: "var(--primary)", mark: "✓", label: "Готово", duration: 4000 },
  error: { fill: "var(--accent)", accent: "var(--sky)", mark: "!", label: "Ошибка", duration: 6000 },
  info: { fill: "var(--sky)", accent: "var(--secondary)", mark: "i", label: "Заметка", duration: 4000 },
  warning: { fill: "var(--secondary)", accent: "var(--accent)", mark: "!", label: "Внимание", duration: 5000 },
};

function AppToast({
  kind,
  title,
  description,
  onClose,
}: {
  kind: Kind
  title: ReactNode
  description?: ReactNode
  onClose: () => void
}) {
  const style = KIND[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="relative box-border w-[min(92vw,380px)] rounded-[20px] border-2 border-transparent bg-card text-foreground shadow-[4px_4px_0_var(--ink)]"
    >
      {/* узоры Memphis: за текстом, обрезаются по краю карточки */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]">
        <div className="absolute -top-2 right-10 h-10 w-12 rotate-[8deg] opacity-90">
          <MemphisGlyph shape="dots" color={style.accent} />
        </div>
        <div className="absolute -right-3 bottom-1 size-9 rotate-[14deg]">
          <MemphisGlyph shape="triangle" color={style.fill} />
        </div>
        <div className="absolute -bottom-0.5 left-20 h-3 w-14">
          <MemphisGlyph shape="squiggle" color={style.accent} />
        </div>
        <div className="absolute -left-3 -top-3 size-7">
          <MemphisGlyph shape="disc" color={style.accent} />
        </div>
      </div>

      <div className="relative flex items-start gap-3 py-4 pr-11 pl-4">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-lg leading-none font-extrabold text-ink"
          style={{ background: style.fill }}
        >
          {style.mark}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-[15px] leading-5 font-bold break-words">{title}</p>
          {description ? (
            <p className="text-sm leading-5 font-semibold break-words text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-label="Закрыть уведомление"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-card text-sm leading-none font-extrabold text-ink transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ✕
      </button>

      <RoughBorder radius={20} roughness={1.3} bowing={1.1} />
    </div>
  );
}

function show(kind: Kind, title: ReactNode, options: Options = {}) {
  return sonner.custom(
    (id) => (
      <AppToast
        kind={kind}
        title={title}
        description={options.description}
        onClose={() => sonner.dismiss(id)}
      />
    ),
    { duration: options.duration ?? KIND[kind].duration },
  );
}

/** Уведомления в стиле сайта: Memphis-узоры, рисованная рамка, палитра токенов. API как у `sonner`. */
export const toast = {
  success: (title: ReactNode, options?: Options) => show("success", title, options),
  error: (title: ReactNode, options?: Options) => show("error", title, options),
  info: (title: ReactNode, options?: Options) => show("info", title, options),
  warning: (title: ReactNode, options?: Options) => show("warning", title, options),
  dismiss: sonner.dismiss,
};
