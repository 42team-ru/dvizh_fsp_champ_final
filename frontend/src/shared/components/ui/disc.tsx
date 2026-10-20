import * as React from "react"
import { cn } from "cn"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { UserAvatar } from "@/shared/components/ui/user-avatar"

/** Круг: фото или бобр человека, у организации — буквы названия. */
function Disc({
  initials,
  user,
  tone,
  className,
  textClassName,
  style,
}: {
  initials: string;
  user?: React.ComponentProps<typeof UserAvatar>["user"];
  tone?: string;
  className: string;
  textClassName: string;
  style?: React.CSSProperties;
}) {
  // Человек (с фото или без) и безымянный участник — фото или бобр; буквы остаются только у организаций без логотипа.
  if (user || !initials) {
    return <UserAvatar user={user} className={cn("shrink-0 rounded-full border-2 border-ink object-cover", tone, className)} style={style} />;
  }
  const text = initials;
  return (
    <Avatar className={cn("after:hidden", className)} style={style}>
      <AvatarFallback
        className={cn(
          "border-2 border-ink font-extrabold text-foreground",
          tone,
          textClassName
        )}
      >
        {text}
      </AvatarFallback>
    </Avatar>
  );
}

export { Disc }
