/** Центры 12 городов демо. У события нет city: фильтруем по координатам, не разбирая адрес. */
export const FEED_CITIES = [
  { name: "Москва", lat: 55.7558, lon: 37.6173 },
  { name: "Санкт-Петербург", lat: 59.9343, lon: 30.3351 },
  { name: "Новосибирск", lat: 55.0084, lon: 82.9357 },
  { name: "Екатеринбург", lat: 56.8389, lon: 60.6057 },
  { name: "Казань", lat: 55.7961, lon: 49.1064 },
  { name: "Нижний Новгород", lat: 56.2965, lon: 43.9361 },
  { name: "Красноярск", lat: 56.0153, lon: 92.8932 },
  { name: "Самара", lat: 53.1959, lon: 50.1002 },
  { name: "Краснодар", lat: 45.0355, lon: 38.9753 },
  { name: "Владивосток", lat: 43.1155, lon: 131.8855 },
  { name: "Сочи", lat: 43.5855, lon: 39.7231 },
  { name: "Пермь", lat: 58.0105, lon: 56.2502 },
] as const;

/** Приближение границ города: тот же прямоугольник вокруг центра в ленте и на карте. */
export const CITY_RADIUS_KM = 30;

export function findFeedCity(name?: string | null) {
  return FEED_CITIES.find((city) => city.name.toLocaleLowerCase("ru") === name?.trim().toLocaleLowerCase("ru"));
}
