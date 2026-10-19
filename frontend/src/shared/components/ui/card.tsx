import * as React from "react"
import { cn } from "cn"
import { RoughBorder, type RoughOptions } from "@/shared/components/ui/rough-border"

/** `rough` — нарисовать рамку от руки (rough.js) вместо обычной. */
function Card({
  className,
  rough,
  children,
  ...props
}: React.ComponentProps<"div"> & { rough?: boolean | RoughOptions }) {
  const options = typeof rough === "object" ? rough : {}
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col rounded-card border-2 border-ink bg-card text-card-foreground",
        rough && "relative border-transparent",
        className
      )}
      {...props}
    >
      {children}
      {rough ? <RoughBorder radius={24} {...options} /> : null}
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1.5 px-5 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-display text-xl leading-tight font-bold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-base text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-5", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 px-5", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
