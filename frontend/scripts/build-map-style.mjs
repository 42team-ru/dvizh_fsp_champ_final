// Собирает свой стиль карты 2ГИС из экспорта Редактора стилей: минималистичный 2D в палитре «Движа».
// Запуск: node scripts/build-map-style.mjs <папка экспорта со style.json, fonts/, icons/>
// Результат — public/map-style/ (style.json + нужные шрифты и иконки); фронт грузит стиль оттуда.
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const source = process.argv[2];
if (!source) {
  console.error("Укажите папку экспорта: node scripts/build-map-style.mjs ~/Загрузки/styles-.../styles/<id>");
  process.exit(1);
}
const output = fileURLToPath(new URL("../public/map-style/", import.meta.url));

/** Палитра из токенов проекта (app.css): один фон, яркие дома и дороги, тёмная обводка как у карточек. */
const C = {
  land: "#FFE14A",
  building: "#E5383B",
  road: "#C6F135",
  ink: "#13142B",
  water: "#9ED3FF",
  waterLabel: "#1F5FA0",
  park: "#7ED9B4",
  sport: "#FFFFFF",
  halo: "#FFFFFF",
};
/** С какого зума видны парки: дальше леса сливаются с фоном, чтобы фон оставался один. */
const PARK_ZOOM = 12;

const style = JSON.parse(await readFile(path.join(source, "style.json"), "utf8"));

const isColor = (v) => typeof v === "string" && /^(#|rgba?\(|hsla?\()/i.test(v.trim());
const alphaOf = (v) => {
  const rgba = v.replace(/\s/g, "").match(/^rgba\([^,]+,[^,]+,[^,]+,([\d.]+)\)$/i);
  if (rgba) return Number(rgba[1]);
  const hex = v.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/i);
  return hex ? parseInt(hex[1], 16) / 255 : 1;
};
const withAlpha = (hex, a) => {
  if (a >= 0.999) return hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${+a.toFixed(3)})`;
};
/** Перекрашивает все цвета в выражении, сохраняя прозрачность (плавное появление по зуму). */
const paint = (expr, hex) => (isColor(expr) ? withAlpha(hex, alphaOf(expr)) : Array.isArray(expr) ? expr.map((e) => paint(e, hex)) : expr);
const byZoom = (from, to, zoom) => ["step", ["zoom"], from, zoom, to];

const ROAD_GROUP = /^(roads|road background|tunnel|overpasses|pedestrian bridges|\(wd\) layout roads)$/;
const ROAD_NAME = /road|street|highway|magistral|intercity|federal|motorway|bridge|roadbed|internal|main|other|pedestrian/;
const CASING = /outline|background|border|casing|edge/;
const NOISE_GROUP = /metro|zoo|immersive|3d|floor|parking|poi|sights|transport|house numbers|highway|icons|entrances|traffic|dammam|neom|attractions|anchors|areal objects|stadium sectors|hillshade|linear borders|boundaries/;
const KEEP_LABEL_GROUP = /^(global map|geo object labels|street labels|locality caption label|labels for cities.*|-)$/;
const NOISY_LABEL = /skiing|platform|mountain|special|sector|other labels|entrance|gate|traffic|lane|sign|number|metro|station|stop/;

let shown = 0;
function restyle(layer, group) {
  const n = layer.name.toLowerCase().trim();
  const g = group.toLowerCase().trim();
  const s = (layer.style ??= {});
  const hide = () => { s.visibility = "none"; };
  if (s.visibility === "none") return;
  delete s.textureImage;
  delete s.textureSize;
  delete s.textureOpacity;

  switch (layer.type) {
    case "model": case "buildingModel": case "polygonExtrusion": case "lineExtrusion":
    case "embankment": case "dashedLine": case "oneWayLine": case "metricPoint":
      return hide();
    case "point": case "labelLine": {
      // Минимализм: только текст стран, городов, районов, улиц, воды и островов; иконки — лишь точки городов.
      if (!KEEP_LABEL_GROUP.test(g) || NOISY_LABEL.test(n) || (s.iconImage && !/city|capital|cities|centers/.test(n))) return hide();
      const water = /ocean|sea|lake|river|water|bay|island/.test(n);
      for (const key of Object.keys(s)) {
        if (key === "textColor") s[key] = paint(s[key], water && !/island/.test(n) ? C.waterLabel : C.ink);
        if (key === "textHaloColor") s[key] = paint(s[key], C.halo);
        if (key === "textFont") s[key] = JSON.parse(JSON.stringify(s[key]).replaceAll("Noto_Sans_Italic", "Noto_Sans"));
      }
      break;
    }
    case "polygon": {
      if (NOISE_GROUP.test(g) && !/flat buildings/.test(g)) return hide();
      const colorKeys = Object.keys(s).filter((k) => /color/i.test(k));
      const set = (fill, stroke) => colorKeys.forEach((k) => { s[k] = paint(s[k], /stroke/i.test(k) ? stroke : fill); });
      if (/flat buildings/.test(g) && !/area/.test(n)) { set(C.building, C.ink); layer.maxzoom = 22; }
      else if (/water|river|sea|lake|reservoir|pond|canal|ocean|stream/.test(n)) set(C.water, C.water);
      else if (/sport|stadium|basketball|football|tennis|volleyball|pitch/.test(n)) set(C.sport, C.ink);
      else if (/vegetation|forest|wood|park|garden|green|flower|cemetery|square|island/.test(n) && !/parking/.test(n)) {
        s.color = byZoom(C.land, C.park, PARK_ZOOM);
        s.strokeColor = byZoom("rgba(19,20,43,0)", C.ink, PARK_ZOOM);
        if (s.strokeWidth === undefined) s.strokeWidth = 1;
      } else if (ROAD_GROUP.test(g) || /road|bridge area|roadbed/.test(n)) set(C.road, C.ink);
      else set(C.land, C.land);
      break;
    }
    case "line": case "shiftedLine": case "overpass": {
      const road = ROAD_GROUP.test(g) || (ROAD_NAME.test(n) && !/rail|tram|border|ski/.test(n));
      if (!road || /traffic/.test(n + g)) return hide();
      const tunnel = /tunnel/.test(n + g);
      const casing = CASING.test(n) || layer.type === "overpass";
      const target = casing ? C.ink : tunnel ? C.land : C.road;
      for (const key of Object.keys(s)) if (/color/i.test(key)) s[key] = paint(s[key], target);
      break;
    }
    default:
      return hide();
  }
  shown++;
}

/** Обходит группы; скрытые слои выбрасываем совсем — стиль меньше и грузится быстрее. */
function walk(layers, group) {
  return layers.flatMap((layer) => {
    if (layer.type === "group") {
      const children = walk(layer.layers ?? [], layer.name);
      return children.length ? [{ ...layer, layers: children }] : [];
    }
    restyle(layer, group);
    return layer.style?.visibility === "none" ? [] : [layer];
  });
}

style.layers = walk(style.layers, "-");
style.background = { ...style.background, color: C.land };
style.terrain = { visibility: "none" };
style.graphicsPresets = Object.fromEntries(Object.entries(style.graphicsPresets ?? {}).map(([k, v]) => [k, { ...v, globeOff: true, reliefOff: true }]));
style.models = {};
style.metadata = { ...style.metadata, name: "Движ — Memphis 2D" };

// Иконки и шрифты: только те, на которые ссылаются оставшиеся слои.
const used = new Set();
const collect = (e) => { if (typeof e === "string") used.add(e); else if (Array.isArray(e)) e.forEach(collect); else if (e && typeof e === "object") Object.values(e).forEach(collect); };
collect(style.layers);
style.icons = Object.fromEntries(Object.entries(style.icons ?? {}).filter(([name]) => used.has(name)));
const fonts = [...used].filter((f) => /^Noto_Sans/.test(f));

// Чистим подпапки, а не всю map-style: dev-сервер Vite теряет удалённую и пересозданную папку.
for (const dir of ["icons", "fonts", "models"]) await rm(path.join(output, dir), { recursive: true, force: true });
await mkdir(path.join(output, "icons"), { recursive: true });
await mkdir(path.join(output, "fonts"), { recursive: true });
await mkdir(path.join(output, "models"), { recursive: true });
for (const { url } of Object.values(style.icons)) await copyFile(path.join(source, "icons", url), path.join(output, "icons", url));
let fontFiles = 0;
for (const file of await readdir(path.join(source, "fonts"))) {
  if (fonts.some((f) => new RegExp(`^${f}_\\d+\\.pbf$`).test(file))) { await copyFile(path.join(source, "fonts", file), path.join(output, "fonts", file)); fontFiles++; }
}
await writeFile(path.join(output, "models", ".gitkeep"), "");
await writeFile(path.join(output, "style.json"), JSON.stringify(style));
console.log(`map-style: слоёв ${shown}, иконок ${Object.keys(style.icons).length}, шрифтов ${fonts.join(", ")} (${fontFiles} файлов)`);
