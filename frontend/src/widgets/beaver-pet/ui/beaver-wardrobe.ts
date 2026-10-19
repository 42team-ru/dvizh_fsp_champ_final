/*
 * Гардероб бобра. Каждая вещь — кусок SVG в координатах рисунка, который вставляется
 * в слот внутри нужной части тела (#slot-hat в голове, #slot-sleeve-left в левой лапе и т.д.),
 * поэтому вещь двигается вместе с этой частью без отдельной анимации.
 * Стиль общий с бобром: контур OUT толщиной 5–5.5, плоская заливка, мягкий блик.
 */

export type HatId = "cap" | "headband" | "beanie" | "swimcap";
export type EyewearId = "sunglasses" | "goggles";
export type ShirtId = "football" | "running" | "training" | "judo";
export type NeckId = "medal" | "whistle";
/** Активность — предмет в лапах или рядом и движение с ним. */
export type BeaverActivity = "none" | "juggle" | "dribble" | "lift" | "chess";

export type BeaverOutfit = {
  hat?: HatId;
  eyewear?: EyewearId;
  shirt?: ShirtId;
  neck?: NeckId;
};

/** Содержимое слотов: id слота → SVG-разметка. */
export type SlotContent = Partial<Record<Slot, string>>;
export type Slot =
  | "slot-shirt" | "slot-neck" | "slot-prop-back" | "slot-prop-front"
  | "slot-sleeve-left" | "slot-sleeve-right" | "slot-hold-left" | "slot-hold-right"
  | "slot-hold-front-right" | "slot-eyes" | "slot-hat";

export const SLOTS: Slot[] = [
  "slot-shirt", "slot-neck", "slot-prop-back", "slot-prop-front",
  "slot-sleeve-left", "slot-sleeve-right", "slot-hold-left", "slot-hold-right",
  "slot-hold-front-right", "slot-eyes", "slot-hat",
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

const SHIRTS: Record<ShirtId, () => SlotContent> = {
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
  const outer = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
    return `<polygon points="${pentagon(Math.cos(a) * 26, Math.sin(a) * 26, 9, a + Math.PI / 2)}" fill="${OUT}"/>`;
  }).join("");
  const seams = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `M${(Math.cos(a) * 9).toFixed(1)} ${(Math.sin(a) * 9).toFixed(1)} L${(Math.cos(a) * 17).toFixed(1)} ${(Math.sin(a) * 17).toFixed(1)}`;
  }).join(" ");
  return `
    <defs><clipPath id="ball-clip"><circle r="26"/></clipPath></defs>
    <circle r="28" fill="#FFFFFF"/>
    <g clip-path="url(#ball-clip)">
      <polygon points="${pentagon(0, 0, 9)}" fill="${OUT}"/>
      ${outer}
      <path d="${seams}" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <circle r="28" fill="none" stroke="${OUT}" stroke-width="5"/>
    ${glare("M-16 -14 Q-12 -20 -5 -22", 5, 0.8)}`;
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

const knight = (x: number, y: number) => `
  <g transform="translate(${x} ${y}) scale(1.25)">
    <rect x="-22" y="-12" width="44" height="13" rx="4" fill="#F4EBDD" ${line(4.5)}/>
    <rect x="-16" y="-22" width="32" height="11" rx="3" fill="#F4EBDD" ${line(4.5)}/>
    <path d="M-14 -22 C-16 -44 -10 -58 -2 -66 C-6 -72 -4 -82 4 -86 L10 -78 C22 -72 30 -58 28 -48 C27 -41 19 -41 15 -45 C10 -41 6 -36 8 -28 L14 -22 Z" fill="#F4EBDD" ${line(4.5)}/>
    <circle cx="10" cy="-66" r="3" fill="${OUT}"/>
    <path d="M-6 -62 C-10 -50 -10 -38 -8 -28" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity="0.4"/>
  </g>`;

const ACTIVITY: Record<BeaverActivity, () => SlotContent> = {
  none: () => ({}),
  juggle: () => ({
    "slot-prop-front": `
      <ellipse id="ball-shadow" cx="187" cy="524" rx="26" ry="6" fill="#2A1A12" opacity="0.18"/>
      <g id="prop-ball">${soccerBall()}</g>`,
  }),
  dribble: () => ({
    "slot-prop-back": `
      <ellipse id="ball-shadow" cx="340" cy="524" rx="30" ry="6" fill="#2A1A12" opacity="0.18"/>
      <g id="prop-ball">${basketball()}</g>`,
  }),
  lift: () => ({ "slot-hold-left": dumbbell(54, 418), "slot-hold-right": dumbbell(320, 418) }),
  chess: () => ({ "slot-hold-front-right": knight(318, 412) }),
};

/** Собирает содержимое всех слотов для наряда и активности. */
export function buildSlots(outfit: BeaverOutfit, activity: BeaverActivity): SlotContent {
  const out: SlotContent = {};
  const add = (c: SlotContent) => {
    for (const [k, v] of Object.entries(c) as [Slot, string][]) out[k] = (out[k] ?? "") + v;
  };
  if (outfit.shirt) add(SHIRTS[outfit.shirt]());
  if (outfit.neck) add({ "slot-neck": NECK[outfit.neck]() });
  if (outfit.eyewear) add({ "slot-eyes": EYEWEAR[outfit.eyewear]() });
  if (outfit.hat) add({ "slot-hat": HATS[outfit.hat]() });
  add(ACTIVITY[activity]());
  return out;
}
