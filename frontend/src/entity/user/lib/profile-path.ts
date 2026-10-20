/** Публичная ссылка на профиль: логин, а для старых DTO — UUID. */
export function profilePath(user: { id?: string; username?: string | null }): string {
  return `/users/${encodeURIComponent(user.username || user.id || "")}`;
}
