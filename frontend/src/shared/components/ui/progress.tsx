import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"
import { motion } from "motion/react"

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-[10px] w-full overflow-hidden rounded-pill border border-ink bg-muted",
        className
      )}
      value={value}
      {...props}
    >
      {/* полоса заполняется с нуля при появлении и пружинит при изменении */}
      <ProgressPrimitive.Indicator data-slot="progress-indicator" asChild>
        <motion.div
          className={cn("h-full w-full flex-1 border-r border-ink bg-primary", indicatorClassName)}
          initial={{ x: "-100%" }}
          animate={{ x: `-${100 - (value || 0)}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
