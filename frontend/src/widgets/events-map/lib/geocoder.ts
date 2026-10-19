/*
 * Геокодер 2ГИС (Catalog API 3.0): подсказки по вводу и адрес по точке. Тот же ключ, что у карты.
 * Координаты наружу — [lon, lat], как во всём модуле карты.
 */

const KEY = import.meta.env.VITE_2GIS_KEY as string | undefined;
const API = "https://catalog.api.2gis.com/3.0";
/** Что предлагать: города, районы, улицы, дома, организации, достопримечательности, остановки. */
const TYPES = "adm_div.city,adm_div.settlement,adm_div.district,adm_div.place,street,building,branch,attraction,station,crossroad";

/** Подсказка: что показать в списке и что записать в поле адреса. */
export type Place = { id: string; title: string; subtitle: string; address: string; point: [number, number] };

type CatalogItem = {
  id?: string;
  type?: string;
  name?: string;
  full_name?: string;
  address_name?: string;
  point?: { lat: number; lon: number };
};

async function catalog(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<CatalogItem[]> {
  const query = new URLSearchParams({ ...params, key: KEY ?? "", fields: "items.point,items.full_name,items.address_name" });
  const response = await fetch(`${API}/${path}?${query}`, { signal });
  if (!response.ok) throw new Error(`2GIS ${path}: HTTP ${response.status}`);
  const body = await response.json() as { meta?: { code?: number }; result?: { items?: CatalogItem[] } };
  // 404 у Catalog API — «ничего не нашлось», а не ошибка.
  if (body.meta?.code === 404) return [];
  return body.result?.items ?? [];
}

/** Организация показывается по названию («Центральный парк»), остальное — по полному адресу. */
function toPlace(item: CatalogItem): Place | null {
  if (!item.point) return null;
  const full = item.full_name ?? item.name ?? "";
  const isBranch = item.type === "branch" || item.type === "attraction";
  const title = isBranch && item.name ? item.name : full;
  return {
    id: item.id ?? full,
    title,
    subtitle: isBranch ? full : (item.type === "adm_div" ? "Населённый пункт" : ""),
    address: isBranch && item.name ? `${full} (${item.name})` : full,
    point: [item.point.lon, item.point.lat],
  };
}

/** Подсказки по вводу, ближайшие к near. Пустой или короткий запрос — пусто. */
export async function suggestPlaces(text: string, near: [number, number], signal?: AbortSignal): Promise<Place[]> {
  const q = text.trim();
  if (q.length < 2 || !KEY) return [];
  const items = await catalog("suggests", { q, location: `${near[0]},${near[1]}`, type: TYPES, page_size: "8" }, signal);
  return items.map(toPlace).filter((p): p is Place => p != null);
}

/** Адрес по точке: дом или улица, иначе район или город. Ничего — null. */
export async function addressAt(point: [number, number], signal?: AbortSignal): Promise<string | null> {
  if (!KEY) return null;
  const items = await catalog("items/geocode",
    { lon: String(point[0]), lat: String(point[1]), type: "building,street,adm_div.place,adm_div.district,adm_div.city" }, signal);
  const best = items.find((i) => i.type === "building") ?? items.find((i) => i.type === "street") ?? items[0];
  return best?.full_name ?? best?.name ?? null;
}
