import * as React from "react"
import { cn } from "cn"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"

/** Круг с инициалами. */
function Disc({
  initials,
  tone,
  className,
  textClassName,
  style,
}: {
  initials: string;
  tone?: string;
  className: string;
  textClassName: string;
  style?: React.CSSProperties;
}) {
  return (
    <Avatar className={cn("after:hidden", className)} style={style}>
      <AvatarFallback
        className={cn(
          "border-2 border-ink font-extrabold text-foreground",
          tone,
          textClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export { Disc }
