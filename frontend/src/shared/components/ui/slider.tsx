import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex h-[14px] w-full touch-none items-center select-none",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-[14px] grow overflow-hidden rounded-full border-2 border-ink bg-card"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full border-r-2 border-ink bg-primary"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label="Радиус поиска"
        className="block size-7 rounded-[14px] border-2 border-ink bg-secondary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
