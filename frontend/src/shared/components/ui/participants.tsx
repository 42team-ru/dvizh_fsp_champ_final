import * as React from "react"
import { cn } from "cn"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Progress } from "@/shared/components/ui/progress"

const AVATAR_TONES = ["bg-sky", "bg-lime-soft", "bg-lavender-soft"]

/** Стопка аватаров, «Идут N из M» и полоса заполнения. Без `total` лимита нет. */
function Participants({
  people,
  going,
  total,
  tone = "default",
  className,
}: {
  people: string[]
  going: number
  total?: number
  tone?: "default" | "warning"
  className?: string
}) {
  const warning = tone === "warning"
  return (
    <div
      data-slot="participants"
      className={cn("flex h-[47px] flex-col gap-[9px]", className)}
    >
      <div className="flex h-7 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-7" style={{ width: 28 + (people.length - 1) * 20 }}>
            {people.map((p, i) => (
              <Avatar
                key={p + i}
                className="absolute top-0 size-7 after:hidden"
                style={{ left: i * 20 }}
              >
                <AvatarFallback
                  className={cn(
                    "border-2 border-ink text-[10px] leading-[14px] font-extrabold text-foreground",
                    AVATAR_TONES[i]
                  )}
                >
                  {p}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-[13px] leading-[18px] font-bold whitespace-nowrap text-foreground">
            {total ? `Идут ${going} из ${total}` : `Идут ${going}`}
          </span>
        </div>
        <span
          className={cn(
            "text-xs leading-[17px] font-bold whitespace-nowrap",
            warning ? "text-accent" : "text-muted-foreground"
          )}
        >
          {total ? `осталось ${total - going}` : "без лимита"}
        </span>
      </div>
      <Progress
        value={total ? (going / total) * 100 : 60}
        indicatorClassName={warning ? "bg-accent" : undefined}
      />
    </div>
  )
}

export { Participants }
