import type { BeaverMood } from "./beaver-pet";
import type { BeaverActivity } from "./beaver-wardrobe";

/*
 * Процедурная анимация бобра. Каждый кадр считаем «куда часть хочет попасть» (target),
 * а пружина плавно тянет её туда. Поэтому смена настроения и реакции никогда не скачут.
 * Все точки вращения заданы в координатах рисунка, а не через CSS transform-origin.
 */

type Spring = { x: number; v: number; k: number; d: number };

const spring = (k: number, zeta: number, x = 0): Spring => ({ x, v: 0, k, d: 2 * zeta * Math.sqrt(k) });

function step(s: Spring, target: number, dt: number) {
  s.v += (s.k * (target - s.x) - s.d * s.v) * dt;
  s.x += s.v * dt;
}

/** Точки вращения частей в координатах рисунка. */
const PIVOT = {
  head: [188, 288],
  earLeft: [78, 102],
  earRight: [298, 102],
  tail: [262, 462],
  torso: [188, 482],
  armLeft: [102, 320],
  armRight: [272, 320],
  browLeft: [111, 113],
  browRight: [263, 113],
  eyeLeft: [110, 159],
  eyeRight: [263, 159],
  muzzleTop: [187.5, 176],
  mouthOpenTop: [187.5, 236],
  mouthO: [187.5, 245],
  headCenter: [187.5, 110],
  sparkle: [356, 92],
  anger: [346, 44],
  steamLeft: [62, 30],
  steamRight: [312, 30],
  zzz: [296, 70],
  ground: [188, 524],
} as const;

/**
 * Поза настроения — цели для пружин.
 * browL/browR: [сдвиг по y, наклон]; отрицательный наклон поднимает внутренний край (тревога), положительный опускает (хмурость).
 * lid: 0 — глаз открыт, 1 — закрыт веком. arcL/arcR: 1 — глаз закрыт дугой «^» (смех, подмигивание).
 * mouth: -1 грусть, 0 улыбка, 1 широкая улыбка. jaw: открытый смеющийся рот. oMouth: рот «О».
 * surprise, sparkle: эффекты вокруг головы. chin: левая лапа у подбородка.
 * cross: лапы скрещены на груди. blush: румянец (0 — обычный). anger, steam: знак злости и пар из ушей. sleep: сон и «Z Z Z».
 */
type MoodPose = {
  headRot: number; headY: number; ear: number;
  browL: [number, number]; browR: [number, number];
  lookX: number; lookY: number; tailAmp: number; tailSpeed: number;
  lid: number; mouth: number; arcL: number; arcR: number; eyeScale: number;
  jaw: number; oMouth: number; surprise: number; sparkle: number; chin: number;
  cross: number; blush: number; anger: number; steam: number; sleep: number;
};

const BASE: MoodPose = {
  headRot: 0, headY: 0, ear: 0, browL: [0, 0], browR: [0, 0], lookX: 0, lookY: 0, tailAmp: 4, tailSpeed: 2.2,
  lid: 0, mouth: 0, arcL: 0, arcR: 0, eyeScale: 1, jaw: 0, oMouth: 0, surprise: 0, sparkle: 0, chin: 0,
  cross: 0, blush: 0, anger: 0, steam: 0, sleep: 0,
};

/** Внутренняя поза «блаженство» — пока бобра гладят по голове; наружу как настроение не выдаётся. */
type PoseId = BeaverMood | "bliss";

const POSE: Record<PoseId, MoodPose> = {
  idle: BASE,
  happy: { ...BASE, headY: -2, ear: -8, browL: [-7, -4], browR: [-7, -4], tailAmp: 9, tailSpeed: 9, mouth: 0.55, arcL: 1, arcR: 1, jaw: 1 },
  sad: { ...BASE, headRot: 3, headY: 5, ear: 18, browL: [-3, -16], browR: [-3, -16], lookY: 3, tailAmp: 1.5, tailSpeed: 1, lid: 0.05, mouth: -0.75 },
  thinking: { ...BASE, headRot: 4, browL: [-9, -10], browR: [2, 6], lookX: 6, lookY: -6, tailAmp: 3, tailSpeed: 1.6, lid: 0.1, mouth: 0.15, chin: 1 },
  surprised: { ...BASE, headY: -4, ear: -14, browL: [-14, -3], browR: [-14, -3], tailAmp: 7, tailSpeed: 6, eyeScale: 1.13, oMouth: 1, surprise: 1 },
  wink: { ...BASE, headRot: -4, ear: -4, browL: [-5, 0], browR: [5, 8], tailAmp: 5, tailSpeed: 4, mouth: 0.7, arcR: 1, sparkle: 1 },
  offended: { ...BASE, headRot: -9, headY: -3, ear: 10, browL: [2, 15], browR: [2, 15], lookX: -6, tailAmp: 1.5, tailSpeed: 1, lid: 1, mouth: -0.6, cross: 1, blush: 1, anger: 1, steam: 1 },
  sleep: { ...BASE, headRot: 6, headY: 9, ear: 16, browL: [3, -4], browR: [3, -4], tailAmp: 1, tailSpeed: 0.7, lid: 1, mouth: 0.05, blush: 0.4, sleep: 1 },
  bliss: { ...BASE, headRot: 4, headY: 2, ear: 12, browL: [-3, -6], browR: [-3, -6], tailAmp: 8, tailSpeed: 7, mouth: 0.65, arcL: 1, arcR: 1 },
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Формы улыбки с одинаковой структурой команд, чтобы их можно было плавно смешивать. */
const MOUTH_SAD = [145, 232, 150, 222, 168, 214, 187.5, 219, 207, 214, 225, 222, 230, 232];
const MOUTH_SMILE = [139, 215, 143, 236, 166, 240, 187.5, 219, 209, 240, 232, 236, 236, 215];
const MOUTH_GRIN = [131, 207, 137, 242, 166, 248, 187.5, 219, 209, 248, 238, 242, 244, 207];

function mouthPath(m: number) {
  const [from, to, k] = m < 0 ? [MOUTH_SMILE, MOUTH_SAD, -m] : [MOUTH_SMILE, MOUTH_GRIN, m];
  const v = from.map((a, i) => (a + (to[i] - a) * k).toFixed(1));
  return `M${v[0]} ${v[1]} C${v[2]} ${v[3]} ${v[4]} ${v[5]} ${v[6]} ${v[7]} C${v[8]} ${v[9]} ${v[10]} ${v[11]} ${v[12]} ${v[13]}`;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** Центр тени на земле (как у #shadow в beaver.svg). */
const SHADOW_CENTER = [190, 524] as const;

const rot = (deg: number, [x, y]: readonly number[]) => `rotate(${deg.toFixed(2)} ${x} ${y})`;
const scaleAt = (sx: number, sy: number, [x, y]: readonly number[]) =>
  `translate(${x} ${y}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-x} ${-y})`;

/** Временная реакция: играет `ms` миллисекунд и сама возвращается к базовому настроению. */
export type ReactOptions = { ms?: number; hop?: boolean; wiggle?: boolean; wave?: boolean };

export type BeaverRig = {
  /** Базовое настроение — держится, пока его не сменят. */
  setMood(m: BeaverMood): void;
  /** Сыграть эмоцию и вернуться к базовому настроению. */
  react(m: BeaverMood, opts?: ReactOptions): void;
  /** Реакция на тычок: что сделать, решает часть тела, по которой попали. */
  poke(target: Element | null): void;
  setActivity(a: BeaverActivity): void;
  hop(): void;
  destroy(): void;
};

export function createBeaverRig(root: HTMLElement, followCursor: boolean, onInteraction?: () => void): BeaverRig {
  const q = (sel: string) => root.querySelector<SVGGElement>(sel);
  const el = {
    inner: q("#beaver-inner"), torso: q("#torso"), head: q("#head"), tail: q("#tail"),
    earL: q("#ear-left"), earR: q("#ear-right"), armL: q("#arm-left"), armR: q("#arm-right"),
    eyeL: q("#eye-left"), eyeR: q("#eye-right"), browL: q("#brow-left"), browR: q("#brow-right"),
    lids: Array.from(root.querySelectorAll<SVGGElement>(".lid")),
    eyeOpenL: q("#eye-left .eye-open"), eyeOpenR: q("#eye-right .eye-open"),
    eyeArcL: q("#eye-left .eye-arc"), eyeArcR: q("#eye-right .eye-arc"),
    muzzle: q("#muzzle"), mouthOpen: q("#mouth-open"), mouthTeeth: q("#mouth-teeth"), mouthO: q("#mouth-o"),
    fxSurprise: q("#fx-surprise"), fxSparkle: q("#fx-sparkle"),
    fxAnger: q("#fx-anger"), fxSteam: q("#fx-steam"), fxZzz: q("#fx-zzz"),
    puffs: Array.from(root.querySelectorAll<SVGGElement>("#fx-steam .puff")),
    zs: Array.from(root.querySelectorAll<SVGGElement>("#fx-zzz .z")),
    blush: Array.from(root.querySelectorAll<SVGEllipseElement>(".blush")),
    smile: root.querySelector<SVGPathElement>("#smile"),
    glints: Array.from(root.querySelectorAll<SVGGElement>(".pupil-glint")),
    // Предметы активности вставляются позже, поэтому ищем их в setActivity.
    ball: null as SVGGElement | null,
    ballShadow: null as SVGEllipseElement | null,
    puck: null as SVGGElement | null,
    puckShadow: null as SVGEllipseElement | null,
  };

  const s = {
    headRot: spring(60, 0.7), headY: spring(60, 0.8),
    earL: spring(260, 0.25), earR: spring(260, 0.25),
    tail: spring(90, 0.35), armL: spring(120, 0.5), armR: spring(140, 0.45),
    browLY: spring(150, 0.7), browLT: spring(150, 0.7), browRY: spring(150, 0.7), browRT: spring(150, 0.7),
    arcL: spring(260, 0.8), arcR: spring(260, 0.8), eyeScale: spring(220, 0.4, 1),
    jaw: spring(160, 0.55), oMouth: spring(200, 0.5), surprise: spring(200, 0.45), sparkle: spring(120, 0.6),
    lookX: spring(220, 0.75), lookY: spring(220, 0.75),
    squash: spring(320, 0.22),
    lid: spring(140, 0.8), mouth: spring(90, 0.6),
    wiggle: spring(300, 0.3),
    blush: spring(90, 0.8), anger: spring(260, 0.3), steam: spring(80, 0.8), sleep: spring(60, 0.9),
  };

  // Тень лежит на земле: выносим её из прыгающей группы, иначе она подлетает вместе с бобром.
  const shadow = root.querySelector<SVGEllipseElement>("#shadow");
  if (shadow && el.inner && shadow.parentNode === el.inner) el.inner.before(shadow);

  // Лапа у подбородка должна быть поверх головы, поэтому её узел временно переносится выше.
  const armLHome = el.armL ? { parent: el.armL.parentNode, next: el.armL.nextSibling } : null;
  let armLFront = false;

  let baseMood: BeaverMood = "idle";
  let reaction: { mood: PoseId; until: number; wiggle: boolean } | null = null;
  /** Настроение, которое показывается прямо сейчас: реакция поверх базового. */
  let mood: PoseId = "idle";
  let lastInteraction = performance.now();
  let nextFidget = rand(9, 15);
  const pokes: number[] = [];
  let strokeDist = 0;
  let strokeAt = 0;
  let lastStroke: { x: number; y: number } | null = null;
  /** Каким глазом подмигивать: выбирается при каждом подмигивании. */
  let winkSide: "left" | "right" = "right";
  let winkChosen = false;
  let activity: BeaverActivity = "none";
  let actT = 0;
  let ballRot = 0;
  let breathPhase = 0;
  let t = 0;
  let last = performance.now();
  let raf = 0;
  let hopT = -1;
  let waveUntil = 0;
  let nextBlink = rand(1, 3);
  let blinkT = -1;
  let doubleBlink = false;
  let nextTwitch = rand(3, 7);
  let pointer: { x: number; y: number } | null = null;
  let pointerAt = -99;
  let saccade = { x: 0, y: 0, until: 0 };

  const onMove = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height * 0.35)) / r.height;
    const k = Math.min(1, Math.hypot(dx, dy) * 2);
    const a = Math.atan2(dy, dx);
    pointer = { x: Math.cos(a) * k * 9, y: Math.sin(a) * k * 9 };
    pointerAt = t;

    // Поглаживание: быстрые движения туда-сюда над головой копят «расстояние ласки».
    const overHead = e.target instanceof Element && e.target.closest("#head") && root.contains(e.target);
    const now = performance.now();
    if (overHead && reaction?.mood !== "sleep") {
      if (lastStroke && now - strokeAt < 150) strokeDist += Math.hypot(e.clientX - lastStroke.x, e.clientY - lastStroke.y);
      else strokeDist *= 0.5;
      lastStroke = { x: e.clientX, y: e.clientY };
      strokeAt = now;
      if (strokeDist > 500) {
        onInteraction?.();
        startReaction("bliss", { ms: 900 });
        strokeDist = 400;
      }
    } else {
      lastStroke = null;
      strokeDist = 0;
    }
  };
  if (followCursor) window.addEventListener("pointermove", onMove);

  /** Одноразовые эффекты при смене показываемого настроения. */
  function enterMood(prev: PoseId, next: PoseId) {
    if (next === "surprised" && prev !== "surprised") {
      // Вздрагивает: голова и уши подскакивают.
      s.headY.v -= 90;
      s.earL.v += 160;
      s.earR.v -= 160;
      s.eyeScale.v += 2;
    }
    if (next === "offended" && prev !== "offended") {
      // «Хмф!»: топает, резко отворачивается, знак злости выпрыгивает.
      startHop();
      s.headRot.v -= 70;
      s.anger.v += 9;
    }
    if (prev === "sleep" && next !== "sleep") {
      // Проснулся: глаза распахиваются.
      s.eyeScale.v += 3;
      s.headY.v -= 60;
    }
    if (next === "wink" && prev !== "wink" && !winkChosen) winkSide = Math.random() < 0.5 ? "left" : "right";
    winkChosen = false;
    if (blinkT < 0) nextBlink = t + 0.05;
  }

  function startReaction(m: PoseId, { ms = 2200, hop = false, wiggle = false, wave = false }: ReactOptions = {}) {
    const now = performance.now();
    reaction = { mood: m, until: now + ms, wiggle };
    lastInteraction = now;
    if (hop) startHop();
    if (wave) waveUntil = now + Math.min(ms, 1500);
    if (reduced) settle();
  }

  function startHop() {
    if (hopT >= 0) return;
    s.squash.v += 1.6;
    hopT = 0;
  }

  function frame(now: number, loop = true) {
    // Метка rAF бывает раньше performance.now() при создании (длинный монтаж диалога): отрицательный dt
    // превращает затухание пружин в раскачку — голова делает полуоборот, лапы взлетают. Поэтому снизу 0.
    const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30));
    last = now;
    t += dt;
    // Реакция поверх базового настроения; закончилась — плавно возвращаемся к базовому.
    if (reaction && now > reaction.until) reaction = null;
    const shown: PoseId = reaction?.mood ?? baseMood;
    if (shown !== mood) enterMood(mood, shown);
    mood = shown;

    // Скучает: если долго никто не трогает, сам что-нибудь делает.
    // Совсем заскучал — засыпает, пока не разбудят.
    if (!reaction && baseMood === "idle" && (now - lastInteraction) / 1000 > 40) {
      startReaction("sleep", { ms: Infinity });
    }
    if (!reaction && baseMood === "idle" && activity === "none" && (now - lastInteraction) / 1000 > nextFidget) {
      const roll = Math.random();
      if (roll < 0.35) startReaction("wink", { ms: 1300 });
      else if (roll < 0.6) startReaction("happy", { ms: 1100, hop: true });
      else if (roll < 0.8) startReaction("surprised", { ms: 1000 });
      else waveUntil = now + 1200;
      lastInteraction = now;
      nextFidget = rand(10, 18);
    }
    const p = mood === "wink" && winkSide === "left"
      ? { ...POSE.wink, headRot: -POSE.wink.headRot, arcL: 1, arcR: 0, browL: POSE.wink.browR, browR: POSE.wink.browL }
      : POSE[mood];

    // Взгляд: за курсором, а без него — редкие случайные «осмотры».
    let lookX: number, lookY: number;
    if (pointer && t - pointerAt < 2.5) {
      lookX = pointer.x; lookY = pointer.y;
    } else {
      if (t > saccade.until) saccade = Math.random() < 0.4 ? { x: 0, y: 0, until: t + rand(1.5, 3) } : { x: rand(-7, 7), y: rand(-4, 5), until: t + rand(0.8, 2.2) };
      lookX = saccade.x; lookY = saccade.y;
    }
    lookX += p.lookX;
    lookY += p.lookY;

    // Дыхание задаёт общий ритм: голова едет вместе с грудью, а не отдельно.
    // Во сне дыхание медленное и глубокое; фаза копится, чтобы смена темпа не давала рывка.
    breathPhase += dt * (1.85 - 1.0 * clamp01(s.sleep.x));
    const breath = Math.sin(breathPhase) * (1 + 0.8 * clamp01(s.sleep.x));
    const idleSway = 1.3 * Math.sin(t * 0.9) + 0.6 * Math.sin(t * 0.37 + 1);
    const ponder = mood === "thinking" ? 2.5 * Math.sin(t * 1.3) : 0;
    const chuckle = p.jaw * Math.sin(t * 13);
    const waving = now < waveUntil;
    const armSwing = 1.5 * Math.sin(t * 1.85 + 0.6);

    // Цели по умолчанию; активность ниже может их переопределить.
    let headRotT = p.headRot + idleSway + ponder;
    let headYT = p.headY - breath * 2.2 + 2 * chuckle;
    let armLT = p.chin ? -132 + 2 * Math.sin(t * 1.1) : -armSwing + (mood === "sad" ? 5 : 0);
    let armRT = waving ? -72 + 14 * Math.sin(t * 12) : armSwing - (mood === "sad" ? 5 : 0);
    if (p.cross) {
      // Скрестил лапы на груди и демонстративно сопит.
      armLT = -108 + 2 * Math.sin(t * 1.6);
      armRT = 104 - 2 * Math.sin(t * 1.6);
    }
    let mouthT = p.mouth;
    let lidT = p.lid;
    let browYT = 0;
    let ball: { x: number; y: number; sq: number; h: number; ground: number } | null = null;

    actT += dt;
    if (activity === "juggle" || activity === "dribble") {
      // Оба мяча просто отскакивают от земли рядом с бобром.
      const T = activity === "juggle" ? 1.05 : 0.85;
      const u = (actT % T) / T;
      const d = Math.min(u, 1 - u);
      const h = 120 * 4 * u * (1 - u);
      const sq = 1 - 0.14 * Math.exp(-(d * d) / 0.001);
      // Нижняя точка остаётся на земле даже при сплющивании.
      ball = { x: 478, y: 524 - 43.5 * sq - h, sq, h, ground: 524 };
      ballRot = 0;
    } else if (activity === "lift") {
      // Подъём гантелей в стороны: на пике напряжения прищур и сжатый рот.
      const raise = (1 - Math.cos((2 * Math.PI * actT) / 1.8)) / 2;
      armLT = 64 * raise;
      armRT = -64 * raise;
      lidT = Math.max(lidT, 0.1 + 0.3 * raise);
      mouthT = 0.6 - 0.9 * raise;
      browYT += 3 * raise;
      headYT += 2 * raise;
    } else if (activity === "chess") {
      // Задумчиво разглядывает доску рядом.
      armRT = -5 + 2 * Math.sin(t * 1.2);
      headRotT += 3 + 3 * Math.sin(t * 0.8);
      lookX = 7;
      lookY = 8;
      mouthT = Math.min(mouthT, -0.2);
      lidT = Math.max(lidT, 0.12);
    }

    step(s.lookX, lookX, dt);
    step(s.lookY, lookY, dt);
    step(s.headRot, headRotT + s.lookX.x * 0.35 - s.wiggle.x * 0.8, dt);
    step(s.headY, headYT, dt);

    // Уши: висят на голове с инерцией и иногда сами дёргаются.
    if (t > nextTwitch) {
      (Math.random() < 0.5 ? s.earL : s.earR).v += (Math.random() < 0.5 ? -1 : 1) * rand(120, 220);
      nextTwitch = t + rand(3, 8);
    }
    step(s.earL, -p.ear - s.headRot.v * 0.12, dt);
    step(s.earR, p.ear - s.headRot.v * 0.12, dt);

    // Прыжок: парабола, а на приземлении — пружинистый «сплющ».
    let hopY = 0;
    if (hopT >= 0) {
      hopT += dt / 0.5;
      if (hopT >= 1) { hopT = -1; s.squash.v -= 2.4; }
      else hopY = -34 * 4 * hopT * (1 - hopT);
    }
    const stretch = hopT >= 0 ? 0.05 * Math.sin(Math.PI * hopT) : 0;
    step(s.squash, 0, dt);
    // Щекотка: тело и голова мелко трясутся от смеха.
    step(s.wiggle, reaction?.wiggle ? 4 * Math.sin(t * 22) : 0, dt);

    // Хвост и лапы отстают от тела — вторичное движение.
    step(s.tail, p.tailAmp * Math.sin(t * p.tailSpeed) - s.squash.v * 6, dt);
    step(s.armR, armRT, dt);
    step(s.armL, armLT, dt);
    step(s.mouth, mouthT, dt);
    step(s.lid, lidT, dt);
    step(s.browLY, p.browL[0] + browYT, dt);
    step(s.browLT, p.browL[1], dt);
    step(s.browRY, p.browR[0] + browYT, dt);
    step(s.browRT, p.browR[1], dt);
    step(s.arcL, p.arcL, dt);
    step(s.arcR, p.arcR, dt);
    step(s.eyeScale, p.eyeScale, dt);
    step(s.jaw, p.jaw * (0.85 + 0.15 * chuckle), dt);
    step(s.oMouth, p.oMouth, dt);
    step(s.surprise, p.surprise, dt);
    step(s.sparkle, p.sparkle, dt);
    step(s.blush, p.blush, dt);
    step(s.anger, p.anger, dt);
    step(s.steam, p.steam, dt);
    step(s.sleep, p.sleep, dt);

    // Моргание по случайному расписанию, иногда двойное.
    let blink = 0;
    if (blinkT < 0 && t > nextBlink) { blinkT = 0; doubleBlink = Math.random() < 0.2; }
    if (blinkT >= 0) {
      blinkT += dt / 0.15;
      blink = Math.sin(Math.PI * Math.min(blinkT, 1));
      if (blinkT >= 1) {
        if (doubleBlink) { doubleBlink = false; blinkT = -1; nextBlink = t + 0.12; }
        else { blinkT = -1; nextBlink = t + rand(2, 6); }
      }
    }

    const sq = 1 + s.squash.x;
    el.inner?.setAttribute("transform", `translate(0 ${hopY.toFixed(2)}) ${scaleAt(1 / Math.sqrt(sq) - stretch * 0.5, sq + stretch, PIVOT.ground)}`);
    // как у мяча: чем выше бобр, тем тень меньше и бледнее; у земли — полная
    const lift = clamp01(-hopY / 34);
    shadow?.setAttribute("transform", scaleAt(1 - 0.4 * lift, 1 - 0.25 * lift, SHADOW_CENTER));
    shadow?.setAttribute("opacity", (0.18 * (1 - 0.5 * lift)).toFixed(3));
    el.torso?.setAttribute("transform", `${rot(s.wiggle.x, PIVOT.torso)} ${scaleAt(1 + breath * 0.007, 1 + breath * 0.02, PIVOT.torso)}`);
    el.head?.setAttribute("transform", `translate(0 ${s.headY.x.toFixed(2)}) ${rot(s.headRot.x, PIVOT.head)}`);
    el.earL?.setAttribute("transform", rot(s.earL.x, PIVOT.earLeft));
    el.earR?.setAttribute("transform", rot(s.earR.x, PIVOT.earRight));
    el.tail?.setAttribute("transform", rot(s.tail.x, PIVOT.tail));
    el.armL?.setAttribute("transform", rot(s.armL.x, PIVOT.armLeft));
    el.armR?.setAttribute("transform", rot(s.armR.x, PIVOT.armRight));
    const ex = s.lookX.x * 0.3, ey = s.lookY.x * 0.3;
    el.eyeL?.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
    el.eyeR?.setAttribute("transform", `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
    const lid = Math.max(s.lid.x, blink);
    for (const g of el.lids) g.setAttribute("transform", `translate(0 ${(-64 * (1 - lid)).toFixed(2)})`);
    el.smile?.setAttribute("d", mouthPath(Math.max(-1, Math.min(1, s.mouth.x))));

    // Глаз-дуга: открытый глаз сплющивается и гаснет, на его месте проявляется «^».
    const es = s.eyeScale.x;
    const eyeState = (open: SVGGElement | null, arc: SVGGElement | null, c: number, center: readonly number[]) => {
      const k = clamp01(c);
      open?.setAttribute("transform", scaleAt(es, es * (1 - 0.85 * k), center));
      open?.setAttribute("opacity", clamp01((0.6 - k) / 0.2).toFixed(2));
      arc?.setAttribute("opacity", clamp01((k - 0.4) / 0.2).toFixed(2));
    };
    eyeState(el.eyeOpenL, el.eyeArcL, s.arcL.x, PIVOT.eyeLeft);
    eyeState(el.eyeOpenR, el.eyeArcR, s.arcR.x, PIVOT.eyeRight);

    // Рот: открытый смеющийся растёт вниз от верхнего края, «О» раскрывается из центра, зубы при «О» прячутся.
    const jaw = clamp01(s.jaw.x), o = clamp01(s.oMouth.x);
    el.muzzle?.setAttribute("transform", scaleAt(1 + 0.04 * jaw, 1 + 0.17 * jaw + 0.03 * o, PIVOT.muzzleTop));
    el.mouthOpen?.setAttribute("opacity", clamp01(jaw * 4).toFixed(2));
    el.mouthOpen?.setAttribute("transform", scaleAt(1, Math.max(0.01, jaw), PIVOT.mouthOpenTop));
    el.mouthTeeth?.setAttribute("opacity", (1 - o).toFixed(2));
    el.mouthO?.setAttribute("opacity", clamp01(o * 3).toFixed(2));
    el.mouthO?.setAttribute("transform", scaleAt(Math.max(0.01, o), Math.max(0.01, o), PIVOT.mouthO));

    // Эффекты: штрихи удивления пульсируют наружу, искорка мерцает.
    const sur = clamp01(s.surprise.x), spk = clamp01(s.sparkle.x);
    el.fxSurprise?.setAttribute("opacity", sur.toFixed(2));
    el.fxSurprise?.setAttribute("transform", scaleAt(0.85 + 0.15 * sur + 0.04 * Math.sin(t * 9), 0.85 + 0.15 * sur + 0.04 * Math.sin(t * 9), PIVOT.headCenter));
    el.fxSparkle?.setAttribute("opacity", spk.toFixed(2));
    const mirror = winkSide === "left" ? "translate(375 0) scale(-1 1) " : "";
    el.fxSparkle?.setAttribute("transform", `${mirror}${rot(12 * Math.sin(t * 2), PIVOT.sparkle)} ${scaleAt(spk * (0.85 + 0.18 * Math.sin(t * 5)), spk * (0.85 + 0.18 * Math.sin(t * 5)), PIVOT.sparkle)}`);

    // Румянец: обида — щёки краснеют, сон — лёгкий.
    for (const b of el.blush) b.setAttribute("opacity", (0.35 + 0.45 * clamp01(s.blush.x)).toFixed(2));

    // Обида: знак злости выпрыгивает с перелётом и пульсирует, из ушей идёт пар.
    const ang = Math.max(0, s.anger.x);
    el.fxAnger?.setAttribute("opacity", clamp01(ang).toFixed(2));
    const pulse = ang * (1 + 0.12 * Math.sin(t * 10));
    el.fxAnger?.setAttribute("transform", `translate(${PIVOT.anger[0]} ${PIVOT.anger[1]}) scale(${pulse.toFixed(3)})`);
    const steam = clamp01(s.steam.x);
    el.fxSteam?.setAttribute("opacity", steam.toFixed(2));
    el.puffs.forEach((g, i) => {
      const k = (t * 0.9 + i * 0.5) % 1;
      const [x0, y0] = i === 0 ? PIVOT.steamLeft : PIVOT.steamRight;
      const dir = i === 0 ? -1 : 1;
      g.setAttribute("transform", `translate(${(x0 + dir * 18 * k).toFixed(1)} ${(y0 - 50 * k).toFixed(1)}) scale(${(0.5 + 0.7 * k).toFixed(2)})`);
      g.setAttribute("opacity", Math.sin(Math.PI * k).toFixed(2));
    });

    // Сон: три «Z» по очереди всплывают, растут и тают.
    const zz = clamp01(s.sleep.x);
    el.fxZzz?.setAttribute("opacity", zz.toFixed(2));
    el.zs.forEach((g, i) => {
      const k = (t * 0.35 + i / 3) % 1;
      const [x0, y0] = PIVOT.zzz;
      g.setAttribute("transform", `translate(${(x0 + 55 * k + 8 * Math.sin(k * 6 + i)).toFixed(1)} ${(y0 - 110 * k).toFixed(1)}) rotate(${(-12 + 10 * k).toFixed(1)}) scale(${(0.55 + 0.75 * k).toFixed(2)})`);
      g.setAttribute("opacity", Math.min(1, Math.sin(Math.PI * k) * 1.6).toFixed(2));
    });

    // Поднятая к подбородку лапа рисуется поверх головы, опущенная — возвращается на место.
    const wantFront = s.armL.x < -45;
    if (el.armL && armLHome && wantFront !== armLFront) {
      if (wantFront) el.head?.after(el.armL);
      else armLHome.parent?.insertBefore(el.armL, armLHome.next);
      armLFront = wantFront;
    }
    for (const g of el.glints) g.setAttribute("transform", `translate(${(s.lookX.x * 0.7).toFixed(2)} ${(s.lookY.x * 0.7).toFixed(2)})`);
    el.browL?.setAttribute("transform", `translate(0 ${s.browLY.x.toFixed(2)}) ${rot(s.browLT.x, PIVOT.browLeft)}`);
    el.browR?.setAttribute("transform", `translate(0 ${s.browRY.x.toFixed(2)}) ${rot(-s.browRT.x, PIVOT.browRight)}`);
    if (ball && el.ball) {
      el.ball.setAttribute("transform", `translate(${ball.x.toFixed(2)} ${ball.y.toFixed(2)}) scale(${(1 / Math.sqrt(ball.sq)).toFixed(3)} ${ball.sq.toFixed(3)}) rotate(${ballRot.toFixed(1)})`);
      const k = Math.max(0.35, 1 - ball.h / 260);
      el.ballShadow?.setAttribute("transform", `translate(${ball.x.toFixed(2)} ${ball.ground}) scale(${k.toFixed(3)} 1) translate(${-ball.x.toFixed(2)} ${-ball.ground})`);
      el.ballShadow?.setAttribute("cx", ball.x.toFixed(2));
      el.ballShadow?.setAttribute("opacity", (0.2 * k).toFixed(3));
    }

    if (activity === "hockey" && el.puck) {
      // Шайба скользит туда-обратно по льду, оставаясь на одной высоте.
      const phase = (2 * Math.PI * actT) / 2.4;
      const x = 478 + 65 * Math.sin(phase);
      const y = 510;
      el.puck.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      el.puckShadow?.setAttribute("cx", x.toFixed(2));
      el.puckShadow?.setAttribute("opacity", "0.15");
    }

    if (loop) raf = requestAnimationFrame((n) => frame(n));
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Без анимации доводим пружины до цели за один вызов, чтобы поза всё равно применилась. */
  const settle = () => {
    for (let i = 0; i < 90; i++) frame(last + 1000 / 60, false);
  };
  if (reduced) settle();
  else raf = requestAnimationFrame((n) => frame(n));

  return {
    setMood(m) {
      if (m === "happy" && baseMood !== "happy") startHop();
      baseMood = m;
      if (reduced) settle();
    },
    react(m, opts = {}) {
      const ms = m === "sleep" ? 7000 : m === "offended" ? 3200 : undefined;
      startReaction(m, { hop: m === "happy", ...(ms ? { ms } : {}), ...opts });
    },
    poke(target) {
      const wasSleeping = reaction?.mood === "sleep" || baseMood === "sleep";
      onInteraction?.();
      const now = performance.now();
      lastInteraction = now;
      // Спящего тычок будит: вздрагивает и удивляется.
      if (wasSleeping) {
        startReaction("surprised", { ms: 1400, hop: true });
        return;
      }
      // Пока обижен, тычки только продлевают обиду.
      if (reaction?.mood === "offended" && now < reaction.until) {
        reaction.until = now + 3200;
        return;
      }
      // Затыкали: больше 6 тычков за 3 секунды — бобр расстраивается.
      pokes.push(now);
      while (pokes.length && now - pokes[0] > 3000) pokes.shift();
      if (pokes.length >= 6) {
        pokes.length = 0;
        startReaction("offended", { ms: 3200 });
        return;
      }
      const part = (sel: string) => !!target?.closest(sel);
      if (part("#nose")) startReaction("surprised", { ms: 1400 });
      else if (part("#eye-left") || part("#brow-left") || part("#eye-right") || part("#brow-right") || part("#eyes")) {
        // Подмигивает тем глазом, в который ткнули.
        winkSide = part("#eye-left") || part("#brow-left") ? "left" : "right";
        winkChosen = true;
        startReaction("wink", { ms: 1200 });
      }
      else if (part("#ear-left") || part("#ear-right")) {
        (part("#ear-left") ? s.earL : s.earR).v += part("#ear-left") ? -420 : 420;
        startReaction("happy", { ms: 900 });
      } else if (part("#head")) startReaction("happy", { ms: 1500 });
      else if (part("#tail")) {
        s.tail.v -= 500;
        startReaction("surprised", { ms: 1300 });
      } else if (part("#arm-left") || part("#arm-right")) startReaction("happy", { ms: 1500, wave: true });
      else if (part("#feet")) startReaction("happy", { ms: 1000, hop: true });
      else if (part("#torso")) startReaction("happy", { ms: 1800, wiggle: true });
      else startReaction("happy", { ms: 1200, hop: true, wave: true });
    },
    setActivity(a) {
      activity = a;
      actT = 0;
      el.ball = root.querySelector<SVGGElement>("#prop-ball");
      el.ballShadow = root.querySelector<SVGEllipseElement>("#ball-shadow");
      el.puck = root.querySelector<SVGGElement>("#prop-puck");
      el.puckShadow = root.querySelector<SVGEllipseElement>("#puck-shadow");
      if (reduced) settle();
    },
    hop() {
      startHop();
      waveUntil = performance.now() + 1200;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    },
  };
}
