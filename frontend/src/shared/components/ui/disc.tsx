import * as React from "react"
import { cn } from "cn"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { UserAvatar } from "@/shared/components/ui/user-avatar"

/** Круг с инициалами. */
function Disc({
  initials,
  user,
  tone,
  className,
  textClassName,
  style,
}: {
  initials: string;
  user?: { id?: string; avatarUrl?: string | null };
  tone?: string;
  className: string;
  textClassName: string;
  style?: React.CSSProperties;
}) {
  if (user) {
    return <UserAvatar user={user} className={cn("shrink-0 rounded-full border-2 border-ink object-cover", tone, className)} style={style} />;
  }
  return (
    <Avatar className={cn("after:hidden", className)} style={style}>
      <AvatarFallback
        className={cn(
          "border-2 border-ink font-extrabold text-foreground",
          tone,
          textClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export { Disc }
