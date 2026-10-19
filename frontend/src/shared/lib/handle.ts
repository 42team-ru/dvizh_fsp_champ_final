/** Логин для подписи: «@petr», а логин-email (у зарегистрированных сами) — как есть, без второй «@». */
export const handle = (username?: string) => (!username ? "" : username.includes("@") ? username : `@${username}`);
