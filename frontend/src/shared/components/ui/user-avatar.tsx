import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";

/** Публичный образ бобра, если он пришёл вместе с пользователем. */
export type AvatarPet = { activity?: string | null; outfit?: Record<string, string> | null };

export type AvatarUser = {
  id?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  pet?: AvatarPet | null;
};

/** Бобр из карточек ленты (`ParticipantBeaver`); подключается в `app/root.tsx`, потому что shared не импортирует виджеты. */
export const AvatarBeaverContext = createContext<((user?: AvatarUser) => ReactNode) | null>(null);

/** Две буквы: первая буква имени и фамилии. */
export function userInitials(user?: AvatarUser | null) {
  const two = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  return two || (user?.username?.slice(0, 2).toUpperCase() ?? "");
}

/** Бобр по плечи: голова с ушами целиком в кружке, по центру; доли от размера аватара, поэтому одинаково при любом шрифте. */
export function AvatarBeaver({ user }: { user?: AvatarUser }) {
  const render = useContext(AvatarBeaverContext);
  if (!render) return null;
  return (
    <span aria-hidden="true" className="absolute top-[-6cqmin] left-[calc(50%-62cqmin)] h-[148cqmin] w-[166cqmin] [&>div]:size-full">
      {render(user)}
    </span>
  );
}

/** Загруженное фото, а без него — бобр пользователя (без провайдера — инициалы). */
export function UserAvatar({
  user,
  alt = "",
  className,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { user?: AvatarUser }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const hasBeaver = useContext(AvatarBeaverContext) != null;
  const url = user?.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : undefined;

  if (url) {
    return <img {...props} src={url} alt={alt} className={className} onError={() => setFailedUrl(url)} />;
  }
  return (
    <span
      role={props.role}
      title={props.title}
      aria-label={props["aria-label"]}
      aria-hidden={props["aria-label"] ? undefined : true}
      style={props.style}
      className={cn("relative flex items-center justify-center overflow-hidden bg-sky [container-type:size]", className)}
    >
      {hasBeaver ? (
        <AvatarBeaver user={user} />
      ) : (
        <span className="font-display text-[38cqmin] leading-none font-extrabold text-foreground">
          {userInitials(user)}
        </span>
      )}
    </span>
  );
}
