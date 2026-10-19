import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "flex h-[26px] w-[46px] shrink-0 items-center rounded-[13px] border-2 border-ink bg-card p-[2px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-[18px] rounded-[9px] border-[1.5px] border-ink bg-track transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-secondary"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
