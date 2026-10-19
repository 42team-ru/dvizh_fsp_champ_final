import * as React from "react"
import { cn } from "cn"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { UserAvatar, userInitials } from "@/shared/components/ui/user-avatar"

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
  user?: { avatarUrl?: string | null; firstName?: string | null; lastName?: string | null; username?: string | null };
  tone?: string;
  className: string;
  textClassName: string;
  style?: React.CSSProperties;
}) {
  if (user?.avatarUrl) {
    return <UserAvatar user={user} className={cn("shrink-0 rounded-full border-2 border-ink object-cover", className)} style={style} />;
  }
  const text = userInitials(user) || initials;
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
