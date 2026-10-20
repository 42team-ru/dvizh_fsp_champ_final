import type { UserShortResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { UserAvatar } from "@/shared/components/ui/user-avatar";

export function AvatarStack({ people }: { people: UserShortResponse[] }) {
  return (
    <span className="flex shrink-0 -space-x-2">
      {people.map((p) => (
        <UserAvatar
          key={p.id}
          user={p}
          className="size-7 rounded-full border-2 border-ink object-cover"
        />
      ))}
    </span>
  );
}
