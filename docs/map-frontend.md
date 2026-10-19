# Карта событий: хэндофф для фронта

Бэкенд готов: `GET /api/events/map` (Orval-хук `useEventsMap`). Осталось сделать экран. Здесь контракт, рекомендуемая схема фронта на 2ГИС MapGL и грабли.

## Что делает бэк

- Отдаёт **опубликованные очные** события, у которых точка внутри видимой области карты и **начало** в окне `[from, to]`.
- Кластеры **не считает**: отдаёт точки, группирует их фронт (`@2gis/mapgl-clusterer`). Про зум бэк не знает.
- Фильтры те же, что у ленты: `searchText`, `sportId`, `level` (событие уровня «Любой» подходит под любой уровень), `joinMode`. `format` не нужен: онлайн-событий на карте нет.
- Максимум 1000 точек, ближайшие по времени. Если в области больше, приходит `truncated: true`.
- Ответ — стандартный GeoJSON `FeatureCollection`. Его без переделки понимают 2ГИС, Leaflet и MapLibre.

## Запрос

```
GET /api/events/map?minLon=92.7&minLat=55.9&maxLon=93.1&maxLat=56.1
                   &from=2026-10-20T00:00:00Z&to=2026-10-27T00:00:00Z
                   &sportId=…&level=BEGINNER&joinMode=FREE&searchText=бег
```

| Параметр | Обяз. | Что это |
|---|---|---|
| `minLon`, `minLat` | да | юго-западный угол экрана (долгота, широта) |
| `maxLon`, `maxLat` | да | северо-восточный угол |
| `from` | нет | ISO-время. По умолчанию «сейчас»; если передать прошлое, бэк всё равно начнёт с «сейчас» |
| `to` | нет | ISO-время. По умолчанию `from + 30 дней` |
| `searchText`, `sportId`, `level`, `joinMode` | нет | как в ленте (`EventsListParams`) |

Ошибки (400, `ProblemDetail`, поле `detail` показывать как есть):
- нет области или значения вне диапазона (lon −180…180, lat −90…90);
- `minLat > maxLat`;
- `to` раньше `from` или в прошлом.

`minLon > maxLon` — **не ошибка**: так выглядит область через 180-й меридиан (Чукотка), бэк сам ищет в двух прямоугольниках.

## Ответ

```json
{
  "type": "FeatureCollection",
  "truncated": false,
  "limit": 1000,
  "features": [{
    "type": "Feature",
    "id": "a81c3d24-…",
    "geometry": { "type": "Point", "coordinates": [92.889, 56.0097] },
    "properties": {
      "id": "a81c3d24-…",
      "title": "Утренняя пробежка по набережной",
      "sport": { "id": "…", "name": "Бег", "slug": "running", "custom": false },
      "startAt": "2026-10-20T00:00:00Z",
      "endAt": "2026-10-20T01:00:00Z",
      "address": "Красноярск, Центральная набережная, у Часовни",
      "level": "BEGINNER",
      "joinMode": "FREE",
      "participantsCount": 2,
      "capacity": null,
      "myRegistrationStatus": "CONFIRMED"
    }
  }]
}
```

Типы: `EventMapResponse`, `EventMapFeature`, `EventMapProperties`, `PointGeometry`, `EventsMapParams` в `@/shared/api/generated/core/appAPI.schemas`.

`properties` хватает на маркер (цвет или иконка по `sport.slug`, отметка «я записан» по `myRegistrationStatus`) и на короткую карточку по клику. Полная карточка — переход на `/events/:id`, второй запрос не нужен.

## Грабли (прочитай обязательно)

1. **Порядок координат `[lon, lat]`** — сначала долгота. Так в GeoJSON и в 2ГИС. В Leaflet наоборот (`[lat, lng]`).
2. **`null`, а не `undefined`.** В сгенерированных типах необязательные поля описаны как `endAt?: string`, но бэк присылает `"endAt": null`. Это касается всего API, не только карты. Проверяй через `!= null` или `??`, а не через `=== undefined`.
3. **Долгота за ±180.** Если карту прокрутить по кругу, 2ГИС может вернуть долготу вроде 200 → бэк ответит 400. Нормализуй перед запросом: `((lon + 180) % 360 + 360) % 360 - 180`. Если после этого `minLon > maxLon` — так и отправляй, это нормально.
4. **`truncated: true`** — показывай плашку «Показаны ближайшие 1000 событий — приблизьте карту».
5. **Не заваливай бэк запросами.** Запрашивай по `moveend` с debounce ~300 мс, а не на каждом кадре анимации. Bbox округляй до 3–4 знаков, иначе каждый пиксель сдвига — новый ключ кэша TanStack Query.
6. **Не мигай пустой картой.** Держи `placeholderData: keepPreviousData` в хуке, чтобы старые точки висели, пока грузятся новые.
7. **Даты.** `from`/`to` — ISO-строки в UTC (`date.toISOString()`). «Сегодня» и «на выходных» считай в часовом поясе пользователя и потом переводи в UTC.

## Схема фронта (FSD)

```
widgets/events-map/
  ui/EventsMap.tsx          # контейнер карты, кластеры, попап
  lib/map-provider.ts       # ВСЁ, что знает про 2ГИС: создать карту, читать bbox, рисовать точки
  lib/bbox.ts               # нормализация и округление bbox → EventsMapParams
pages/home/                 # переключатель «Список | Карта» над общими фильтрами ленты
```

Фильтры ленты и карты общие: один стейт фильтров (zustand или search params) и два представления. Маршрут `/` у нас — лента; карту логично сделать вкладкой там же или отдельным `/map` (`src/app/routes.ts` — общий файл, предупреди Максима).

### Изоляция библиотеки карт

Весь код 2ГИС держи в `map-provider.ts` за маленьким интерфейсом. Тогда смена библиотеки — это один новый файл:

```ts
export type Bbox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
export type MapPoint = { id: string; coordinates: [number, number]; data: EventMapProperties };

export interface MapProvider {
  onViewportChange(cb: (bbox: Bbox) => void): () => void; // moveend, уже с debounce
  setPoints(points: MapPoint[]): void;                       // перерисовать маркеры/кластеры
  onPointClick(cb: (point: MapPoint) => void): void;
  destroy(): void;
}
```

Компонент работает только с этим интерфейсом и `useEventsMap`. 2ГИС, Leaflet, MapLibre — разные реализации `MapProvider`.

### 2ГИС MapGL: реализация

```bash
yarn add @2gis/mapgl @2gis/mapgl-clusterer
```

Ключ API: `VITE_2GIS_KEY` в `frontend/.env` (и в `.env.example` без значения). Ключ публичный, ограничивается доменом в кабинете 2ГИС. Добавь туда `localhost` и домен стенда. Для прода ключ нужен **при сборке** (Vite вшивает `VITE_*`), поэтому прокинь его в CI как переменную окружения шага сборки фронта.

Скелет (по официальному примеру 2ГИС для React):

```tsx
import { load } from "@2gis/mapgl";
import { Clusterer } from "@2gis/mapgl-clusterer";

// Контейнер не должен перерисовываться React-ом, иначе карта пересоздастся
const MapContainer = memo(() => <div id="events-map" className="h-full w-full" />, () => true);

useEffect(() => {
  let map: mapgl.Map | undefined;
  let clusterer: Clusterer | undefined;
  load().then((mapgl) => {
    map = new mapgl.Map("events-map", {
      center: [92.8526, 56.0106], // Красноярск: [lon, lat]
      zoom: 12,
      key: import.meta.env.VITE_2GIS_KEY,
    });
    clusterer = new Clusterer(map, { radius: 60 });
    clusterer.on("click", (e) => {
      if (e.target.type === "marker") openPopup(e.target.data.userData); // EventMapProperties
      else map!.setZoom(map!.getZoom() + 2); // по кластеру — приблизить
    });
    map.on("moveend", () => onViewportChange(readBbox(map!))); // + debounce
    onViewportChange(readBbox(map));                            // первый запрос
  });
  return () => { clusterer?.destroy(); map?.destroy(); };
}, []);

// Когда пришли данные: не пересоздавать clusterer, а перезагрузить точки
clusterer.load(data.features.map((f) => ({
  coordinates: f.geometry.coordinates,
  userData: f.properties,
})));
```

`readBbox`: `const b = map.getBounds()` → `minLon = b.southWest[0]`, `minLat = b.southWest[1]`, `maxLon = b.northEast[0]`, `maxLat = b.northEast[1]`. Сверь имена полей с [справочником MapGL](https://docs.2gis.com/ru/mapgl/reference) (`Map.getBounds`) и не забудь нормализацию из пункта 3.

Запрос:

```ts
const { data, isFetching, error } = useEventsMap(
  { ...bbox!, ...filters },
  { query: { enabled: bbox != null, placeholderData: keepPreviousData, staleTime: 30_000 } },
);
```

Попап по клику: название, вид спорта, дата и время, адрес, «записались N из M» (`capacity == null` → без лимита), бейдж статуса моей записи и кнопка «Подробнее» → `/events/:id`. Подписи статусов бери из общего места (`src/shared/lib/statuses.ts` по CLAUDE.md; если файла ещё нет — создай его, а не пиши строки в компоненте).

Альтернатива для больших объёмов — `GeoJsonViewportSource` из MapGL: он сам ходит за GeoJSON по bbox-функции (`(bbox) => '/api/events/map?minLon=' + bbox[0] + …`). Контракт это поддерживает, но тогда точки рисуются слоями стиля, а React-попапы и Orval-хук отпадают. Для наших объёмов не нужно.

## Создание события: координаты стали обязательными

- Для **очного** события `lat` и `lon` обязательны. Без них бэк отвечает 400 «Отметьте место на карте», а если пришло только одно из двух — «Укажите и широту, и долготу».
- У **онлайн**-события координаты игнорируются: бэк их не сохраняет.
- Значит, в форму создания и редактирования нужен выбор точки: мини-карта с маркером (клик или перетаскивание) и/или геокодер 2ГИС по введённому адресу. В `EventRequest` отправлять `lat` и `lon` числами.
- Это зона Васи (форма события): договоритесь, кто делает выбор точки. Удобно переиспользовать тот же `map-provider.ts`.

## Как проверить руками

1. `make dev`, `DEMO_MODE=true make back`, `make front`. Войти, например, за Анну.
2. Swagger `/swagger-ui.html` → `events_map` с bbox Красноярска `92.7 / 55.9 / 93.1 / 56.1` → 5 демо-событий (шестое, волейбол, снято с публикации и не показывается).
3. На карте: отдалить до всей России — точки собираются в кластер; приблизить к Москве — пусто; фильтр «Новичок» — остаются пробежка, зарядка и петанк.
4. Окно «Завтра» — только ближайшие события; кнопка «Подробнее» открывает карточку.
5. Создать очное событие без точки → понятная ошибка; с точкой → появляется на карте.
