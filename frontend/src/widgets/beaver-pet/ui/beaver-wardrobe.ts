import { CLUBS, type ClubId } from "./beaver-clubs";
import { HOCKEY_CLUBS, type HockeyClubId } from "./beaver-hockey-clubs";

/*
 * Гардероб бобра. Каждая вещь — кусок SVG в координатах рисунка, который вставляется
 * в слот внутри нужной части тела (#slot-hat в голове, #slot-sleeve-left в левой лапе и т.д.),
 * поэтому вещь двигается вместе с этой частью без отдельной анимации.
 * Стиль общий с бобром: контур OUT толщиной 5–5.5, плоская заливка, мягкий блик.
 */

export type HatId = "cap" | "headband" | "beanie" | "swimcap" | "helmet" | "headphones";
export type EyewearId = "sunglasses" | "goggles";
export type ShirtId = "football" | "running" | "training" | "judo" | "hockey" | ClubId | HockeyClubId;
export type BottomId = "swimshorts" | "hockeypants";
export type NeckId = "medal" | "whistle";
/** Активность — предмет в лапах или рядом и движение с ним. */
export type BeaverActivity = "none" | "juggle" | "dribble" | "lift" | "chess" | "ski" | "hockey" | "esports" | "programming";

export type BeaverOutfit = {
  hat?: HatId;
  eyewear?: EyewearId;
  shirt?: ShirtId;
  neck?: NeckId;
  bottom?: BottomId;
};

/** Содержимое слотов: id слота → SVG-разметка. */
export type SlotContent = Partial<Record<Slot, string>>;
export type Slot =
  | "slot-shirt" | "slot-neck" | "slot-prop-back" | "slot-prop-front"
  | "slot-sleeve-left" | "slot-sleeve-right" | "slot-hold-left" | "slot-hold-right"
  | "slot-hold-front-right" | "slot-eyes" | "slot-hat" | "slot-bottom" | "slot-scene" | "slot-feet" | "slot-arm-cover-left" | "slot-arm-cover-right";

export const SLOTS: Slot[] = [
  "slot-shirt", "slot-neck", "slot-prop-back", "slot-prop-front",
  "slot-sleeve-left", "slot-sleeve-right", "slot-hold-left", "slot-hold-right",
  "slot-hold-front-right", "slot-eyes", "slot-hat", "slot-bottom", "slot-scene", "slot-feet", "slot-arm-cover-left", "slot-arm-cover-right",
];

const OUT = "#241510";
const line = (w = 5) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const glare = (d: string, w = 6, o = 0.35) => `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
/** Полоса с контуром с двух сторон: сначала толстая тёмная линия, сверху цветная потоньше. */
const band = (d: string, color: string, w = 10) =>
  `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + 7}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function star(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return pts.join(" ");
}

// ---------- Футболки ----------

type ShirtSpec = { color: string; collar: string; front?: string; after?: string; trim?: string; long?: boolean; neckline?: boolean };

/** Ткань повторяет силуэт тела через clip-path, контур тела рисуется поверх заново. */
function shirt({ color, collar, front = "", after = "", trim, long = false, neckline = true }: ShirtSpec): SlotContent {
  const torso = `
    <g clip-path="url(#body-clip)">
      <path d="M30 262 H140 V292 Q187 336 234 292 V262 H350 V448 Q187 468 30 448 Z" fill="${color}"/>
      <rect x="60" y="262" width="260" height="210" fill="url(#cloth-shade)"/>
      <ellipse cx="188" cy="292" rx="125" ry="26" fill="#000000" opacity="0.13"/>
      ${front}
      <path d="M30 448 Q187 468 350 448" fill="none" ${line(5)}/>
    </g>
    ${neckline ? band("M140 292 Q187 336 234 292", collar, 9) : ""}
    ${after}
    <use href="#body-line"/>`;

  // Рукав отрезается линией поперёк лапы; длинный рукав доходит почти до кисти.
  const [yA, yB, hemL, hemR] = long
    ? [364, 428, "M20 368 L150 420", "M354 368 L224 420"]
    : [315, 379, "M30 323 L140 367", "M344 323 L234 367"];
  const sleeve = (side: "left" | "right") => {
    const poly = side === "left" ? `M10 262 H170 V${yB} L10 ${yA} Z` : `M364 262 H204 V${yB} L364 ${yA} Z`;
    const hem = side === "left" ? hemL : hemR;
    return `
      <g clip-path="url(#arm-clip-${side})">
        <path d="${poly}" fill="${color}"/>
        <path d="${poly}" fill="#000000" opacity="0.06"/>
        ${trim ? band(hem, trim, 8) : `<path d="${hem}" fill="none" ${line(5)}/>`}
      </g>`;
  };
  return { "slot-shirt": torso, "slot-sleeve-left": sleeve("left"), "slot-sleeve-right": sleeve("right") };
}

const number = (text: string, y: number, size: number, fill = "#FFFFFF") =>
  `<text x="187" y="${y}" text-anchor="middle" font-family="'Arial Black', 'Arial', sans-serif" font-weight="900" font-size="${size}" fill="${fill}" stroke="${OUT}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${text}</text>`;

const emblem = (svg: string) => svg.replace("<svg ", '<svg x="138" y="330" width="100" height="100" ');

const clubShirts = Object.fromEntries(Object.entries(CLUBS).map(([id, club]) => [id, () => shirt({
  color: club.color, collar: club.trim, trim: club.trim,
  front: `${(id === "zenit" || id === "cska" || id === "akron") ? '<rect x="132" y="326" width="112" height="112" rx="14" fill="#FFFFFF"/>' : ""}${id === "spartak" ? '<path d="M45 351 H330 V398 H45 Z" fill="#FFFFFF"/>' : ""}${emblem(club.svg)}`,
})])) as Record<ClubId, () => SlotContent>;

/** Объёмный свитер и краги выходят за обычный силуэт, каждый рукав следует своей лапе. */
type HockeyJerseySpec = { color?: string; trim?: string; accent?: string; svg?: string; badgeBackground?: boolean };

function hockeyJersey({ color = "#D8402F", trim = "#F4EBDD", accent = "#1E2B3C", svg = CLUBS.beavers.svg, badgeBackground = false }: HockeyJerseySpec = {}): SlotContent {
  const sleeve = `
    <path d="M98 295 Q62 287 42 318 L16 378 Q15 398 48 410 L81 399 L123 334 Z" fill="${color}" ${line(5.5)}/>
    <path d="M31 350 L92 375 M24 370 L84 393" stroke="${trim}" stroke-width="13"/>
    <path d="M95 309 L79 333" fill="none" stroke="${OUT}" opacity="0.15" stroke-width="5" stroke-linecap="round"/>
    <path d="M21 393 L78 410 L83 436 Q71 454 45 448 L23 440 Q10 431 13 414 Z" fill="${accent}" ${line(5)}/>
    <path d="M23 404 L75 420 M34 416 L28 435 M49 421 L44 442 M64 426 L59 446" fill="none" stroke="#8A949E" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 408 Q94 401 97 418 L91 433 L80 431 Z" fill="${accent}" ${line(4)}/>`;
  return {
    "slot-shirt": `<g id="hockey-jersey">
      <path d="M99 278 Q65 281 47 306 L46 361 L62 381 L62 471 Q188 506 313 471 L313 381 L328 361 L328 306 Q308 281 275 278 Z" fill="${color}" ${line(5.5)}/>
      <path d="M66 425 Q188 446 309 425 L311 450 Q188 473 64 450 Z" fill="${trim}"/>
      <path d="M64 452 Q188 478 311 452 L311 473 Q188 501 64 473 Z" fill="${accent}"/>
      <path d="M82 314 L96 403 M292 314 L280 403" stroke="${OUT}" opacity="0.15" stroke-width="5" fill="none"/>
      ${band("M139 291 L188 327 L236 291", accent, 14)}
      <path d="M176 309 L199 315 M178 319 L198 308" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
      ${badgeBackground ? '<rect x="133" y="328" width="110" height="104" rx="12" fill="#FFFFFF"/>' : ""}
      ${emblem(svg)}
    </g>`,
    "slot-arm-cover-left": sleeve,
    "slot-arm-cover-right": `<g transform="translate(374 0) scale(-1 1)">${sleeve}</g>`,
  };
}

const hockeyPants = (): SlotContent => ({
  "slot-bottom": `<g id="hockey-pants" fill="#1E2B3C" ${line(4)}>
    <path d="M87 477 L166 484 L159 511 L86 511 Z M208 484 L287 477 L288 511 H215 Z"/>
    <path d="M96 488 H153 M221 488 H279" stroke="#F4EBDD" stroke-width="8"/>
  </g>`,
  "slot-feet": `<g id="hockey-skates">
    <g fill="#1E2B3C" ${line(4.5)}>
      <path d="M91 484 H155 L164 512 Q165 526 147 528 H73 Q57 524 61 511 Q67 498 91 498 Z"/>
      <path d="M219 484 H283 V498 Q307 498 313 511 Q317 524 301 528 H227 Q209 526 210 512 Z"/>
    </g>
    <path d="M94 500 L137 500 M91 508 H140 M88 516 H143 M237 500 H280 M234 508 H283 M231 516 H286" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M76 529 V537 M148 529 V537 M226 529 V537 M298 529 V537" stroke="#8A949E" stroke-width="5"/>
    <path d="M60 537 H161 L167 531 M207 531 L213 537 H314" fill="none" stroke="#3B4652" stroke-width="5" stroke-linecap="round"/>
  </g>`,
});

const hockeyShirts = Object.fromEntries(Object.entries(HOCKEY_CLUBS).map(([id, club]) => [id, () => hockeyJersey(club)])) as Record<HockeyClubId, () => SlotContent>;

const SHIRTS: Record<ShirtId, () => SlotContent> = {
  ...clubShirts,
  ...hockeyShirts,
  hockey: () => hockeyJersey(),
  football: () =>
    shirt({
      color: "#D8402F",
      collar: "#FFFFFF",
      trim: "#FFFFFF",
      front: `
        <path d="M76 262 V470 M298 262 V470" fill="none" stroke="#FFFFFF" stroke-width="12"/>
        ${number("10", 420, 66)}`,
    }),
  running: () => {
    const s = shirt({
      color: "#2F74D0",
      collar: "#1F57A8",
      front: `
        <rect x="140" y="384" width="94" height="56" rx="8" fill="#FFFFFF" ${line(4)}/>
        <path d="M140 398 H234" stroke="#E0463B" stroke-width="6"/>
        ${number("42", 432, 30, OUT).replace('stroke-width="4"', 'stroke-width="0"')}
        <circle cx="149" cy="408" r="3" fill="#9AA4AE"/><circle cx="225" cy="408" r="3" fill="#9AA4AE"/>
        <circle cx="149" cy="432" r="3" fill="#9AA4AE"/><circle cx="225" cy="432" r="3" fill="#9AA4AE"/>`,
    });
    // Майка без рукавов: лапы остаются меховыми.
    delete s["slot-sleeve-left"];
    delete s["slot-sleeve-right"];
    return s;
  },
  training: () =>
    shirt({
      color: "#3FA45B",
      collar: "#FFFFFF",
      trim: "#FFFFFF",
      front: `
        <path d="M30 352 H350 V372 H30 Z" fill="#FFFFFF"/>
        <path d="M30 352 H350 M30 372 H350" fill="none" ${line(4)}/>
        <polygon points="${star(187, 318, 14, 6)}" fill="#FFFFFF" ${line(3.5)}/>`,
    }),
  judo: () =>
    shirt({
      color: "#F8F4EC",
      collar: "#F8F4EC",
      long: true,
      neckline: false,
      front: `
        ${band("M226 290 L192 352", "#EFE8DC", 12)}
        ${band("M146 290 L232 416", "#EFE8DC", 12)}
        <path d="M30 414 H350 V438 H30 Z" fill="#26201D"/>
        <path d="M30 414 H350 M30 438 H350" fill="none" ${line(4)}/>`,
      // Узел пояса и хвосты свисают ниже края куртки, поэтому они вне clip-path.
      after: `
        <path d="M178 436 L164 478 L180 480 L192 438 Z M196 438 L206 480 L222 476 L208 436 Z" fill="#26201D" ${line(4)}/>
        <rect x="172" y="408" width="32" height="34" rx="8" fill="#26201D" ${line(4)}/>`,
    }),
};

// ---------- Шапки (в голове, поверх всего лица) ----------

function beanieRibs() {
  let d = "";
  for (let x = 92; x <= 284; x += 16) {
    const t = (x - 74) / 228;
    const bump = 40 * t * (1 - t);
    d += `M${x} ${(70 - bump).toFixed(1)} L${x} ${(94 - bump).toFixed(1)} `;
  }
  return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity="0.35"/>`;
}

const HATS: Record<HatId, () => string> = {
  headphones: () => `
    <g id="gaming-headphones">
      <path d="M35 147 V111 C35 -15 339 -15 339 111 V147" fill="none" stroke="${OUT}" stroke-width="25"/>
      <path d="M35 143 V109 C35 -7 339 -7 339 109 V143" fill="none" stroke="#3B4652" stroke-width="15"/>
      <path d="M76 48 Q188 -1 298 48" fill="none" stroke="#8A949E" stroke-width="8" stroke-linecap="round"/>
      <rect x="11" y="121" width="53" height="86" rx="20" fill="#1E2B3C" ${line(5)}/>
      <rect x="310" y="121" width="53" height="86" rx="20" fill="#1E2B3C" ${line(5)}/>
      <path d="M29 139 V186 M345 139 V186" stroke="#65D7E8" stroke-width="8" stroke-linecap="round"/>
      <path d="M341 201 L330 226 Q322 237 292 236" fill="none" stroke="${OUT}" stroke-width="9" stroke-linecap="round"/>
      <rect x="270" y="226" width="29" height="18" rx="8" fill="#3B4652" ${line(4)}/>
    </g>`,
  helmet: () => `
    <g id="hockey-helmet">
      <path d="M37 137 V89 C38 -14 337 -14 337 89 V137 L306 132 L296 87 Q188 65 78 87 L68 132 Z" fill="#1E2B3C" ${line(5.5)}/>
      <path d="M146 6 V70 M188 1 V68 M230 6 V70" stroke="#D8402F" stroke-width="10"/>
      <path d="M51 100 L77 98 M298 98 L325 100" stroke="#8A949E" stroke-width="6" stroke-linecap="round"/>
      <path d="M42 132 L46 196 L68 207 L79 153 M332 132 L328 196 L306 207 L295 153" fill="#1E2B3C" ${line(5)}/>
      <path d="M60 204 L77 248 Q188 319 297 248 L314 204" fill="none" stroke="${OUT}" stroke-width="8" stroke-linecap="round"/>
      ${glare("M76 51 Q101 26 127 22", 6, 0.35)}
    </g>`,
  cap: () => `
    <path d="M92 80 C96 30 140 4 188 4 C236 4 280 30 284 80 Z" fill="#D8402F" ${line(5.5)}/>
    <path d="M188 6 C166 28 156 54 154 80 M188 6 C210 28 220 54 222 80" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round" opacity="0.5"/>
    ${glare("M118 44 C136 26 160 18 180 17", 7, 0.3)}
    <circle cx="188" cy="48" r="14" fill="#FFFFFF" ${line(4)}/>
    <polygon points="${star(188, 48, 9, 4)}" fill="#D8402F"/>
    <circle cx="188" cy="6" r="8" fill="#D8402F" ${line(4.5)}/>
    <path d="M78 78 Q188 62 298 78 Q308 92 296 104 Q188 86 80 104 Q68 92 78 78 Z" fill="#B53226" ${line(5.5)}/>`,
  headband: () => `
    <g clip-path="url(#head-clip)">
      <path d="M0 62 Q188 34 380 62 L380 98 Q188 70 0 98 Z" fill="#FFFFFF"/>
      <path d="M0 74 Q188 46 380 74 L380 86 Q188 58 0 86 Z" fill="#E0463B"/>
      <path d="M0 62 Q188 34 380 62 M0 98 Q188 70 380 98" fill="none" ${line(5)}/>
    </g>
    <use href="#head-outline"/>`,
  beanie: () => `
    <path d="M86 86 C88 24 138 -2 188 -2 C238 -2 288 24 290 86 Z" fill="#E7A33E" ${line(5.5)}/>
    <path d="M150 4 C140 30 136 60 134 84 M188 -2 V84 M226 4 C236 30 240 60 242 84" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity="0.3"/>
    ${glare("M116 40 C132 20 156 10 176 8", 7, 0.3)}
    <path d="M74 66 Q188 46 302 66 L306 98 Q188 78 70 98 Z" fill="#F4EBDD" ${line(5.5)}/>
    ${beanieRibs()}
    <circle cx="188" cy="-14" r="20" fill="#F4EBDD" ${line(5)}/>
    <path d="M178 -22 L182 -16 M194 -24 L196 -17 M186 -8 L190 -4" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity="0.35"/>`,
  swimcap: () => `
    <g clip-path="url(#head-clip)">
      <path d="M0 0 H400 V104 Q188 70 0 104 Z" fill="#F4C431"/>
      ${glare("M118 52 C138 40 160 36 182 36", 8, 0.45)}
      <path d="M0 104 Q188 70 400 104" fill="none" ${line(5)}/>
    </g>
    <use href="#head-outline"/>`,
};

// ---------- Очки ----------

const EYEWEAR: Record<EyewearId, () => string> = {
  sunglasses: () => `
    <path d="M78 150 L46 141 M296 150 L330 141" fill="none" ${line(6)}/>
    <path d="M142 150 Q187 134 232 150" fill="none" ${line(7)}/>
    <rect x="76" y="132" width="68" height="52" rx="22" fill="#1E2B3C" ${line(5)}/>
    <rect x="229" y="132" width="68" height="52" rx="22" fill="#1E2B3C" ${line(5)}/>
    ${glare("M90 147 L106 140", 5, 0.6)}
    ${glare("M243 147 L259 140", 5, 0.6)}`,
  goggles: () => `
    ${band("M28 166 L80 160", "#1F7FD0", 8)}
    ${band("M296 160 L346 166", "#1F7FD0", 8)}
    <path d="M140 157 Q187 146 234 157" fill="none" ${line(6)}/>
    <ellipse cx="110" cy="159" rx="31" ry="27" fill="#8FD3F4" opacity="0.45"/>
    <ellipse cx="263" cy="159" rx="31" ry="27" fill="#8FD3F4" opacity="0.45"/>
    <ellipse cx="110" cy="159" rx="31" ry="27" fill="none" stroke="${OUT}" stroke-width="13"/>
    <ellipse cx="110" cy="159" rx="31" ry="27" fill="none" stroke="#1F7FD0" stroke-width="7"/>
    <ellipse cx="263" cy="159" rx="31" ry="27" fill="none" stroke="${OUT}" stroke-width="13"/>
    <ellipse cx="263" cy="159" rx="31" ry="27" fill="none" stroke="#1F7FD0" stroke-width="7"/>
    ${glare("M94 148 L104 142", 5, 0.7)}
    ${glare("M247 148 L257 142", 5, 0.7)}`,
};

// ---------- На шею ----------

const NECK: Record<NeckId, () => string> = {
  medal: () => `
    ${band("M152 296 L180 330", "#3D7BD8", 10)}
    ${band("M222 296 L194 330", "#E0463B", 10)}
    <circle cx="187" cy="348" r="24" fill="#F2B632" ${line(5)}/>
    <circle cx="187" cy="348" r="15" fill="none" stroke="#C98A22" stroke-width="3.5"/>
    <polygon points="${star(187, 348, 10, 4.5)}" fill="#FFF1BF"/>
    ${glare("M173 337 Q177 331 183 329", 4, 0.6)}`,
  whistle: () => `
    <path d="M148 296 Q166 352 186 356 M226 296 Q208 352 190 356" fill="none" stroke="#E0463B" stroke-width="5" stroke-linecap="round"/>
    <rect x="166" y="352" width="40" height="26" rx="13" fill="#C9D2DA" ${line(4.5)}/>
    <rect x="200" y="356" width="24" height="12" rx="4" fill="#C9D2DA" ${line(4.5)}/>
    <circle cx="180" cy="365" r="5" fill="${OUT}"/>
    ${glare("M174 358 L190 358", 3.5, 0.7)}`,
};

// ---------- Предметы для активностей ----------

function pentagon(cx: number, cy: number, r: number, rot = 0) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot - Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
}

/** Футбольный мяч с центром в (0,0); его двигает beaver-rig. */
function soccerBall() {
  const point = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  const panels = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    // Пятиугольник в центре соединён швами с пятью тёмными панелями на краю.
    return `<path d="M${point(14, a)} L${point(31, a)}" fill="none" stroke="${OUT}" stroke-width="2"/>
      <polygon points="${point(31, a)} ${point(35, a - 0.23)} ${point(50, a - 0.27)} ${point(50, a + 0.27)} ${point(35, a + 0.23)}" fill="${OUT}"/>`;
  }).join("");
  return `
    <defs><clipPath id="ball-clip"><circle r="43"/></clipPath></defs>
    <circle r="43" fill="#FFFDF9"/>
    <g clip-path="url(#ball-clip)">
      ${panels}
      <polygon points="${pentagon(0, 0, 14)}" fill="${OUT}"/>
      <path d="M30 -32 Q50 12 8 40 Q38 47 48 10 Z" fill="${OUT}" opacity="0.1"/>
    </g>
    <circle r="43" fill="none" ${line(4.5)}/>
    ${glare("M-31 -16 Q-27 -29 -15 -34", 4, 0.65)}`;
}

function basketball() {
  return `
    <circle r="31" fill="#E8772E"/>
    <path d="M0 -31 V31 M-31 0 H31 M-21 -22 Q-8 0 -21 22 M21 -22 Q8 0 21 22" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>
    <circle r="31" fill="none" stroke="${OUT}" stroke-width="5"/>
    ${glare("M-18 -16 Q-13 -22 -5 -25", 5, 0.55)}`;
}

/** Гантель по центру (x, y); рисуется за лапой, поэтому лапа её «держит». */
const dumbbell = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <rect x="-36" y="-4" width="72" height="8" rx="3" fill="#8A949E" ${line(4)}/>
    <rect x="-44" y="-16" width="15" height="32" rx="4" fill="#3B4652" ${line(4.5)}/>
    <rect x="29" y="-16" width="15" height="32" rx="4" fill="#3B4652" ${line(4.5)}/>
  </g>`;

/** Доска в перспективе; фигуры стоят на клетках и не двигаются с лапами. */
function chessBoard() {
  const pawn = (x: number, y: number, dark: boolean) => `
    <g transform="translate(${x} ${y})" fill="${dark ? "#3B4652" : "#F4EBDD"}" ${line(3)}>
      <path d="M-11 0 Q-14 -3 -9 -7 L-5 -9 L-3 -24 H3 L5 -9 L9 -7 Q14 -3 11 0 Z"/>
      <circle cy="-29" r="7"/>
      <path d="M-7 -18 H7" fill="none"/>
    </g>`;
  return `<g id="prop-chess-board">
    <defs><pattern id="chess-squares" width="44" height="44" patternUnits="userSpaceOnUse">
      <rect width="44" height="44" fill="#F4EBDD"/>
      <path d="M0 0 H22 V22 H0 Z M22 22 H44 V44 H22 Z" fill="#93552C"/>
    </pattern></defs>
    <path d="M365 440 L393 514 V528 L365 454 Z" fill="#6E3D1E" ${line(4)}/>
    <path d="M393 514 H569 V528 H393 Z" fill="#B97A41" ${line(4)}/>
    <g transform="translate(365 440) matrix(1 0 0.16 0.42 0 0)">
      <rect x="-5" y="-5" width="186" height="186" rx="3" fill="#E7A33E" ${line(5)}/>
      <rect width="176" height="176" fill="url(#chess-squares)"/>
    </g>
    ${pawn(416, 463, true)}
    <g transform="translate(512 475)" fill="#3B4652" ${line(3)}>
      <path d="M-15 0 H15 V-7 L10 -11 L8 -34 L14 -38 V-51 H6 V-43 H-6 V-51 H-14 V-38 L-8 -34 L-10 -11 L-15 -7 Z"/>
      <path d="M-9 -30 H9 M-11 -9 H11" fill="none" stroke="#8A949E" stroke-width="2"/>
    </g>
    <g transform="translate(448 505)" fill="#F4EBDD" ${line(3)}>
      <path d="M-17 0 H17 V-7 L10 -12 L6 -37 H-6 L-10 -12 L-17 -7 Z"/>
      <path d="M-9 -37 H9 L13 -49 H-13 Z"/>
      <path d="M0 -49 V-67 M-7 -60 H7" fill="none" stroke-width="5"/>
      <path d="M-10 -10 H10 M-6 -30 H6" fill="none"/>
    </g>
    ${pawn(529, 509, false)}
  </g>`;
}

/** Лыжи и палки стоят рядом, отдельно от прыгающего бобра. */
function skis() {
  return `<g id="prop-skis">
    <ellipse cx="488" cy="524" rx="78" ry="7" fill="#2A1A12" opacity="0.16"/>
    <g id="ski-rack">
      <path d="M424 519 L441 354 H455 L450 519 M541 519 L533 354 H547 L566 519" fill="#93552C" ${line(4)}/>
      <rect x="420" y="359" width="137" height="20" rx="5" fill="#C4874F" ${line(4)}/>
      <path d="M414 520 H573 L581 530 H409 Z" fill="#C4874F" ${line(4)}/>
      <circle cx="431" cy="369" r="2.5" fill="${OUT}"/><circle cx="545" cy="369" r="2.5" fill="${OUT}"/>
    </g>
    <g transform="rotate(-10 458 516)">
      <path d="M432 510 V292 Q432 261 448 259 Q460 263 455 286 V510 Q444 526 432 510 Z" fill="#2F74D0" ${line(5)}/>
      <path d="M466 510 V292 Q466 261 482 259 Q494 263 489 286 V510 Q478 526 466 510 Z" fill="#E0463B" ${line(5)}/>
      <path d="M438 300 V349 M472 300 V349" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>
      <rect x="434" y="402" width="20" height="36" rx="4" fill="#3B4652" ${line(3)}/>
      <rect x="468" y="402" width="20" height="36" rx="4" fill="#3B4652" ${line(3)}/>
    </g>
    <path d="M516 324 L546 524 M549 324 L512 524" fill="none" stroke="#241510" stroke-width="8" stroke-linecap="round"/>
    <path d="M516 324 L546 524 M549 324 L512 524" fill="none" stroke="#C9D2DA" stroke-width="4"/>
    <path d="M514 313 L517 338 M551 313 L547 338" stroke="#3B4652" stroke-width="11" stroke-linecap="round"/>
    <path d="M534 505 L553 502 M505 503 L523 506" stroke="#241510" stroke-width="5" stroke-linecap="round"/>
    <path d="M410 369 Q424 385 437 369 M517 369 Q531 385 542 369" fill="none" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>
    <path d="M410 369 Q424 385 437 369 M517 369 Q531 385 542 369" fill="none" stroke="#C9D2DA" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

const swimshorts = () => `
  <g clip-path="url(#body-clip)">
    <path d="M55 422 Q188 439 320 422 V498 H204 L188 462 L172 498 H55 Z" fill="#1F7FD0" ${line(5)}/>
    <path d="M55 427 Q188 444 320 427" fill="none" stroke="#F4C431" stroke-width="10"/>
    <path d="M188 436 L174 454 M188 436 L202 454 M188 440 V465" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
    <path d="M86 456 L112 485 M288 456 L262 485" stroke="#F4C431" stroke-width="10"/>
  </g><use href="#body-line"/>`;

/** Ноутбук стоит на столике за бобром, экран обращён к зрителю. */
function laptop(screen: "game" | "code") {
  const content = screen === "code" ? `
    <g id="laptop-code" font-family="monospace" font-size="11" font-weight="700">
      <circle cx="417" cy="369" r="2" fill="#E0463B"/><circle cx="425" cy="369" r="2" fill="#F4C431"/><circle cx="433" cy="369" r="2" fill="#3FA45B"/>
      <text x="415" y="387" fill="#65D7E8">for (auto x : a) {</text>
      <text x="423" y="401" fill="#F4EBDD">sum += x;</text>
      <text x="415" y="415" fill="#65D7E8">}</text>
      <path d="M462 423 L465 426 L470 420" fill="none" stroke="#71DF95" stroke-width="2"/>
      <text x="476" y="427" font-size="8" fill="#71DF95">Accepted</text>
    </g>` : `
    <path d="M415 418 L444 386 L467 407 L490 379 L535 418 Z" fill="#174B96"/>
    <path d="M418 383 H439 M418 390 H429 M508 373 H532" stroke="#65D7E8" stroke-width="3" stroke-linecap="round"/>
    <path d="M464 386 Q453 385 450 397 L445 414 Q444 422 452 422 L465 412 H487 L500 422 Q508 422 507 414 L502 397 Q499 385 488 386 Z" fill="#C9D2DA" ${line(3)}/>
    <path d="M458 395 V407 M452 401 H464" stroke="${OUT}" stroke-width="3"/>
    <circle cx="490" cy="397" r="3" fill="#D8402F"/><circle cx="497" cy="404" r="3" fill="#3FA45B"/>`;
  return `<g id="${screen === "code" ? "programming-laptop" : "gaming-laptop"}">
    <path d="M405 521 L411 468 H423 L420 521 M551 521 L539 468 H551 L566 521" fill="#93552C" ${line(4)}/>
    <path d="M382 465 H571 V481 H382 Z" fill="#C4874F" ${line(4)}/>
    <path d="M398 360 Q398 353 405 353 H546 Q553 353 553 360 V443 H398 Z" fill="#3B4652" ${line(4.5)}/>
    <rect x="407" y="363" width="137" height="68" rx="3" fill="#1E2B3C"/>
    ${content}
    <path d="M398 443 H553 L565 461 Q566 467 556 467 H394 Q384 467 386 461 Z" fill="#8A949E" ${line(4)}/>
    <path d="M408 449 H544 M404 455 H548" stroke="#3B4652" stroke-width="3" stroke-linecap="round"/>
    <path d="M458 459 H492" stroke="#C9D2DA" stroke-width="4" stroke-linecap="round"/>
    <path d="M395 466 H555" stroke="#65D7E8" stroke-width="3"/>
  </g>`;
}

const hockeyEquipment = () => `<g id="hockey-equipment">
  <ellipse id="puck-shadow" cx="478" cy="525" rx="27" ry="6" fill="#2A1A12" opacity="0.15"/>
  <g id="prop-puck" transform="translate(478 510)">
    <path d="M-25 -6 V5 C-25 18 25 18 25 5 V-6 Z" fill="#3B4652" ${line(4)}/>
    <ellipse cy="-6" rx="25" ry="8" fill="#1E2B3C" ${line(4)}/>
    <path d="M-17 6 Q0 13 17 6" fill="none" stroke="#8A949E" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</g>`;

const ACTIVITY: Record<BeaverActivity, () => SlotContent> = {
  none: () => ({}),
  hockey: () => ({ "slot-scene": hockeyEquipment() }),
  esports: () => ({ "slot-scene": laptop("game") }),
  programming: () => ({ "slot-scene": laptop("code") }),
  juggle: () => ({
    "slot-scene": `
      <ellipse id="ball-shadow" cx="478" cy="524" rx="43" ry="7" fill="#2A1A12" opacity="0.18"/>
      <g id="prop-ball" transform="translate(478 481)">${soccerBall()}</g>`,
  }),
  dribble: () => ({
    "slot-scene": `
      <ellipse id="ball-shadow" cx="478" cy="524" rx="43" ry="7" fill="#2A1A12" opacity="0.18"/>
      <g id="prop-ball" transform="translate(478 481)"><g transform="scale(1.4)">${basketball()}</g></g>`,
  }),
  lift: () => ({ "slot-hold-left": dumbbell(54, 418), "slot-hold-right": dumbbell(320, 418) }),
  chess: () => ({ "slot-scene": chessBoard() }),
  ski: () => ({ "slot-scene": skis() }),
};

/** Собирает содержимое всех слотов для наряда и активности. */
export function buildSlots(outfit: BeaverOutfit, activity: BeaverActivity): SlotContent {
  const out: SlotContent = {};
  const add = (c: SlotContent) => {
    for (const [k, v] of Object.entries(c) as [Slot, string][]) out[k] = (out[k] ?? "") + v;
  };
  if (outfit.shirt) add(SHIRTS[outfit.shirt]());
  if (outfit.bottom === "hockeypants") add(hockeyPants());
  if (outfit.bottom === "swimshorts") add({ "slot-bottom": swimshorts() });
  if (outfit.neck) add({ "slot-neck": NECK[outfit.neck]() });
  if (outfit.eyewear) add({ "slot-eyes": EYEWEAR[outfit.eyewear]() });
  if (outfit.hat) add({ "slot-hat": HATS[outfit.hat]() });
  add(ACTIVITY[activity]());
  return out;
}
