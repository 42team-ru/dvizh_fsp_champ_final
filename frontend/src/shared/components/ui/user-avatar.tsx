import { useMemo, useState, type ComponentProps } from "react";
import { Avatar, Style } from "@dicebear/core";
import cameo from "@dicebear/styles/cameo.json";

const cameoStyle = new Style(cameo);

type AvatarUser = { id?: string; avatarUrl?: string | null };

/** Один ID — один Cameo; загруженное фото имеет приоритет. */
export function UserAvatar({ user, alt = "", ...props }: Omit<ComponentProps<"img">, "src"> & { user?: AvatarUser }) {
  const fallback = useMemo(
    () => new Avatar(cameoStyle, { seed: user?.id ?? "anonymous", size: 192 }).toDataUri(),
    [user?.id],
  );
  const [failedUrl, setFailedUrl] = useState<string>();
  const src = user?.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : fallback;

  return <img {...props} src={src} alt={alt} onError={() => setFailedUrl(src)} />;
}
