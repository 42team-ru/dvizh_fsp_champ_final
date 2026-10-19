import * as React from "react"
import { cn } from "cn"

/** Мелкая подпись капсом над значением («ИМЯ», «КОГДА»). */
function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="eyebrow"
      className={cn(
        "text-[11px] leading-[15px] font-extrabold tracking-[1.5px] whitespace-nowrap text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

export { Eyebrow }
