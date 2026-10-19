import type { EventResponse, EventSummaryResponse, FocusPoint } from "@/shared/api/generated/core/appAPI.schemas";

/** CSS object-position по точке фокуса; без точки — центр. */
export const objectPosition = (focus?: FocusPoint | null) => (focus ? `${focus.x}% ${focus.y}%` : "50% 50%");

/** Картинка обложки и куда её сдвигать при обрезке. */
export type Cover = { src: string; position: string };

/**
 * Обложка мероприятия: первое фото со своей точкой фокуса, иначе иллюстрация вида спорта с точкой на голове персонажа.
 * Для карточки списка (`coverUrl`) и для полной карточки (`photos`).
 */
export function coverOf(event: Pick<EventSummaryResponse, "coverUrl" | "coverFocus" | "sport"> | Pick<EventResponse, "photos" | "sport">): Cover {
  const photo = "photos" in event ? event.photos[0] : undefined;
  if (photo) return { src: photo.url, position: objectPosition(photo.focus) };
  if ("coverUrl" in event && event.coverUrl) return { src: event.coverUrl, position: objectPosition(event.coverFocus) };
  return { src: event.sport.imageUrl, position: objectPosition(event.sport.imageFocus) };
}
