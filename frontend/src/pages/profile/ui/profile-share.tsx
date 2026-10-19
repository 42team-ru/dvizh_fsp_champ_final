import { useState } from "react";
import { ShareDialog, SharePassport } from "@/features/share-link/ui/share-dialog";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";
import { handle } from "@/shared/lib/handle";

type ProfileUser = { id?: string; firstName?: string | null; lastName?: string | null; username?: string | null };

/** «Скопировать ссылку на профиль»: окно с закрытым паспортом и QR на публичный профиль. */
export function ProfileShare({ user, className }: { user?: ProfileUser | null; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!user?.id) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Спортсмен";
  return (
    <>
      <Button variant="soft" className={cn("h-11 px-4 text-sm", className)} onClick={() => setOpen(true)}>
        <Icon name="event/icon-share" className="size-[18px]" />
        Скопировать ссылку на профиль
      </Button>
      <ShareDialog open={open} onOpenChange={setOpen} path={`/users/${user.id}`} title="Ссылка на профиль"
        description="Наведите камеру на паспорт — откроется профиль на сайте.">
        <SharePassport path={`/users/${user.id}`} name={name} handle={user.username ? handle(user.username) : undefined} />
      </ShareDialog>
    </>
  );
}
