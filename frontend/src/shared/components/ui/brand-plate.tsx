import * as React from "react"
import { cn } from "cn"

/** Плашка под значком и названием. */
function BrandPlate({ className, children }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="brand-plate"
      className={cn(
        "relative box-border flex items-center gap-2 rounded-pill bg-muted py-2 pr-5 pl-2 text-foreground",
        className,
      )}
    >
      {children}
    </div>
  )
}

export { BrandPlate }
