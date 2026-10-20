import * as React from "react"
import { cn } from "cn"
import { UserAvatar } from "@/shared/components/ui/user-avatar"
import { Progress } from "@/shared/components/ui/progress"

import type { EventParticipantResponse } from "@/shared/api/generated/core/appAPI.schemas"

const AVATAR_TONES = ["bg-sky", "bg-lime-soft", "bg-lavender-soft"]

/** Стопка аватаров, «Идут N из M» и полоса заполнения. Без `total` лимита нет. */
function Participants({
  people,
  going,
  total,
  tone = "default",
  className,
}: {
  people: EventParticipantResponse[]
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
          <div className="relative h-7" style={{ width: 28 + (Math.min(people.length, 3) - 1) * 20 }}>
            {people.slice(0, 3).map((p, i) => {
              const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.username;
              return (
                <UserAvatar
                  key={p.id}
                  user={p}
                  role="img"
                  title={name}
                  aria-label={name}
                  className={cn("absolute top-0 size-7 rounded-full border-2 border-ink object-cover", AVATAR_TONES[i])}
                  style={{ left: i * 20 }}
                />
              );
            })}
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
