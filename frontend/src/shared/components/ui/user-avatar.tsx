import { useState, type ComponentProps } from "react";
import { cn } from "cn";

type AvatarUser = {
  id?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

/** Две буквы: первая буква имени и фамилии. */
export function userInitials(user?: AvatarUser | null) {
  const two = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  return two || (user?.username?.slice(0, 2).toUpperCase() ?? "");
}

/** Загруженное фото, а без него — инициалы в цветном блоке. */
export function UserAvatar({
  user,
  alt = "",
  className,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { user?: AvatarUser }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = user?.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : undefined;

  if (url) {
    return <img {...props} src={url} alt={alt} className={className} onError={() => setFailedUrl(url)} />;
  }
  return (
    <span
      aria-hidden="true"
      style={props.style}
      className={cn("flex items-center justify-center overflow-hidden bg-sky [container-type:size]", className)}
    >
      <span className="font-display text-[38cqmin] leading-none font-extrabold text-foreground">
        {userInitials(user)}
      </span>
    </span>
  );
}
