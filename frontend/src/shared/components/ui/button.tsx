import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-pill border-2 border-ink font-sans font-extrabold whitespace-nowrap shadow-hard-sm transition-all outline-none select-none hover:-translate-x-px hover:-translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        accent: "bg-accent text-accent-foreground",
        outline: "bg-card text-foreground aria-expanded:bg-muted",
        ghost:
          "border-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:border-ink hover:bg-muted active:translate-x-0 active:translate-y-0 aria-expanded:bg-muted",
        destructive: "bg-destructive text-destructive-foreground",
        ink: "bg-ink text-white shadow-hard-accent",
        soft: "bg-card text-foreground shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0",
        clear:
          "bg-transparent text-white shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-white/10 active:translate-x-0 active:translate-y-0",
        nav: "border-transparent bg-transparent text-foreground shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-muted active:translate-x-0 active:translate-y-0 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white aria-[current=page]:hover:bg-ink",
        link: "border-transparent text-primary shadow-none underline-offset-4 hover:translate-x-0 hover:translate-y-0 hover:underline active:translate-x-0 active:translate-y-0",
      },
      size: {
        default:
          "h-11 gap-2 px-[22px] text-[15px] leading-[21px]",
        xs: "h-7 gap-1 px-3 text-xs shadow-none [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-sm",
        lg: "h-12 gap-2 px-[26px] text-[15px] leading-[21px]",
        chip: "h-[38px] gap-[6px] px-4 text-sm leading-[19px] font-bold shadow-none",
        nav: "h-[42px] gap-2 px-[14px] text-[15px] font-bold leading-[21px]",
        icon: "size-11",
        "icon-xs": "size-7 shadow-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
