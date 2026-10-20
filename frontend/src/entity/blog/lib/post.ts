import type {
  BlogEventResponse,
  BlogPostSummaryResponse,
  OrganizationShortResponse,
  UserShortResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import { objectPosition, type Cover } from "@/entity/event/lib/cover";
import { profilePath } from "@/entity/user/lib/profile-path";

/** Подпись автора: клуб — его названием, человек — именем и фамилией. */
export function authorName(author: Pick<UserShortResponse, "firstName" | "lastName" | "username">,
  organization?: Pick<OrganizationShortResponse, "name"> | null) {
  if (organization) return organization.name;
  return [author.firstName, author.lastName].filter(Boolean).join(" ") || author.username;
}

/** Профиль автора: страница клуба (если одобрен) или человека. */
export function authorHref(author: Pick<UserShortResponse, "id" | "username">,
  organization?: Pick<OrganizationShortResponse, "id" | "status"> | null) {
  return organization?.status === "APPROVED" ? `/orgs/${organization.id}` : profilePath(author);
}

/** Обложка поста: первое фото, иначе обложка встречи, иначе иллюстрация вида спорта. */
export function postCover(post: Pick<BlogPostSummaryResponse, "cover" | "event" | "sport">): Cover | null {
  if (post.cover) return { src: post.cover.url, position: objectPosition(post.cover.focus) };
  if (post.event?.coverUrl) return { src: post.event.coverUrl, position: "50% 50%" };
  const sport = post.event?.sport ?? post.sport;
  return sport ? { src: sport.imageUrl, position: objectPosition(sport.imageFocus) } : null;
}

/** «24 окт» / «24 окт 2025» для прошлых лет. */
export function shortDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
    .replace(".", "").replace(" г", "");
}

/** «сб 24 окт» — день встречи. */
export function eventDate(event: Pick<BlogEventResponse, "startAt">) {
  return new Date(event.startAt).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
}

/** «2 ч назад», «вчера», «3 дня назад». */
export function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${days < 5 ? "дня" : "дней"} назад`;
  return shortDate(iso);
}
