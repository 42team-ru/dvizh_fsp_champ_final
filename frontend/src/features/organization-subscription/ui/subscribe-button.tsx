import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/entity/user/model/use-user";
import {
  useOrganizationsSubscribe,
  useOrganizationsUnsubscribe,
} from "@/shared/api/generated/core/organizations/organizations";
import { Button } from "@/shared/components/ui/button";

/** Подписка доступна личному аккаунту; счётчики обновляются на странице и в каталоге. */
export function SubscribeButton({
  id,
  subscribed,
  compact = false,
}: {
  id: string;
  subscribed: boolean;
  compact?: boolean;
}) {
  const { user } = useUser();
  const client = useQueryClient();
  const subscribe = useOrganizationsSubscribe();
  const unsubscribe = useOrganizationsUnsubscribe();
  if (user?.systemRole !== "USER") return null;
  const pending = subscribe.isPending || unsubscribe.isPending;
  async function toggle() {
    try {
      await (subscribed ? unsubscribe : subscribe).mutateAsync({ id });
      await client.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" &&
          q.queryKey[0].startsWith("/api/organizations"),
      });
    } catch (error) {
      toast.error(
        (error as { detail?: string }).detail || "Не удалось изменить подписку",
      );
    }
  }
  return (
    <Button
      variant={subscribed ? "soft" : "ink"}
      size={compact ? "sm" : "default"}
      disabled={pending}
      aria-pressed={subscribed}
      onClick={() => void toggle()}
    >
      {subscribed ? <Check className="size-4" /> : <Bell className="size-4" />}
      {pending
        ? "Сохраняем…"
        : subscribed
          ? "Вы подписаны"
          : compact
            ? "Подписаться"
            : "Подписаться на анонсы"}
    </Button>
  );
}
