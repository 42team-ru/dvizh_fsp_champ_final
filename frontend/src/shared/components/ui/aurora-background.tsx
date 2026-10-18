import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

// TODO: болванка (фон), заменить на финальный дизайн
export function AuroraBackground({
  className,
  children,
}: {
  className?: string;
  asLayer?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cn("bg-gradient-to-br from-primary/10 via-background to-primary/5", className)}>
      {children}
    </div>
  );
}
