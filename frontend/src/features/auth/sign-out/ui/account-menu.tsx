import { Link } from "react-router";
import { DropdownMenu } from "radix-ui";
import { BriefcaseBusiness, LogOut, RefreshCw, User } from "lucide-react";
import { useUser } from "@/entity/user/model/use-user";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { useSignOut } from "../model/use-sign-out";
import { handle } from "@/shared/lib/handle";

const ROLE: Record<string, string> = { USER: "участник", ORG: "организация", ADMIN: "администратор" };
const item =
  "flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-extrabold text-foreground outline-none data-[highlighted]:bg-muted";

/** Меню аккаунта по клику на аватар в шапке: кто вошёл, переходы, смена аккаунта и выход. */
export function AccountMenu() {
  const { user } = useUser();
  const cabinet = useCabinetAccess();
  const { signOut, pending } = useSignOut();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Меню аккаунта"
          className="shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <UserAvatar user={user} className="size-[42px] rounded-full border-2 border-ink object-cover" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={10}
          className="z-50 w-[260px] rounded-[20px] border-2 border-ink bg-card p-2 shadow-hard data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            <UserAvatar user={user} className="size-11 shrink-0 rounded-full border-2 border-ink object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold text-foreground">{name}</p>
              <p className="truncate text-[13px] font-medium text-muted-foreground">
                {handle(user?.username)}{user?.systemRole ? ` · ${ROLE[user.systemRole] ?? user.systemRole}` : ""}
              </p>
            </div>
          </div>
          <DropdownMenu.Separator className="mx-2 my-1 h-0.5 bg-track" />
          {user?.systemRole === "USER" && (
            <DropdownMenu.Item asChild className={item}>
              <Link to="/profile"><User className="size-[18px]" strokeWidth={2.4} />Профиль</Link>
            </DropdownMenu.Item>
          )}
          {cabinet.allowed && (
            <DropdownMenu.Item asChild className={item}>
              <Link to="/my/events"><BriefcaseBusiness className="size-[18px]" strokeWidth={2.4} />Кабинет</Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={item} disabled={pending} onSelect={() => void signOut()}>
            <RefreshCw className="size-[18px]" strokeWidth={2.4} />Сменить аккаунт
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-2 my-1 h-0.5 bg-track" />
          <DropdownMenu.Item className={`${item} text-orange-ink data-[highlighted]:bg-peach`} disabled={pending} onSelect={() => void signOut()}>
            <LogOut className="size-[18px]" strokeWidth={2.4} />Выйти
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
