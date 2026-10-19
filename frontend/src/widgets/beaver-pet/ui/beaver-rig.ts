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
  ground: [188, 524],
} as const;

/** lid: 0 — глаз открыт, 1 — закрыт. mouth: -1 грусть, 0 улыбка, 1 широкая улыбка. */
type MoodPose = { headRot: number; headY: number; ear: number; browY: number; browTilt: number; lookX: number; lookY: number; tailAmp: number; tailSpeed: number; lid: number; mouth: number };

const POSE: Record<BeaverMood, MoodPose> = {
  idle: { headRot: 0, headY: 0, ear: 0, browY: 0, browTilt: 0, lookX: 0, lookY: 0, tailAmp: 4, tailSpeed: 2.2, lid: 0, mouth: 0 },
  happy: { headRot: 0, headY: -2, ear: -8, browY: -5, browTilt: 0, lookX: 0, lookY: 0, tailAmp: 9, tailSpeed: 9, lid: 0, mouth: 1 },
  sad: { headRot: 4, headY: 9, ear: 24, browY: 4, browTilt: -14, lookX: 0, lookY: 5, tailAmp: 1.5, tailSpeed: 1, lid: 0.38, mouth: -1 },
  thinking: { headRot: 0, headY: 0, ear: 0, browY: -2, browTilt: 0, lookX: -4, lookY: -7, tailAmp: 3, tailSpeed: 1.6, lid: 0.18, mouth: -0.3 },
};

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
const rot = (deg: number, [x, y]: readonly number[]) => `rotate(${deg.toFixed(2)} ${x} ${y})`;
const scaleAt = (sx: number, sy: number, [x, y]: readonly number[]) =>
  `translate(${x} ${y}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-x} ${-y})`;

export type BeaverRig = { setMood(m: BeaverMood): void; setActivity(a: BeaverActivity): void; hop(): void; destroy(): void };

export function createBeaverRig(root: HTMLElement, followCursor: boolean): BeaverRig {
  const q = (sel: string) => root.querySelector<SVGGElement>(sel);
  const el = {
    inner: q("#beaver-inner"), torso: q("#torso"), head: q("#head"), tail: q("#tail"),
    earL: q("#ear-left"), earR: q("#ear-right"), armL: q("#arm-left"), armR: q("#arm-right"),
    eyeL: q("#eye-left"), eyeR: q("#eye-right"), browL: q("#brow-left"), browR: q("#brow-right"),
    lids: Array.from(root.querySelectorAll<SVGGElement>(".lid")),
    smile: root.querySelector<SVGPathElement>("#smile"),
    glints: Array.from(root.querySelectorAll<SVGGElement>(".pupil-glint")),
    // Предметы активности вставляются позже, поэтому ищем их в setActivity.
    ball: null as SVGGElement | null,
    ballShadow: null as SVGEllipseElement | null,
  };

  const s = {
    headRot: spring(60, 0.7), headY: spring(60, 0.8),
    earL: spring(260, 0.25), earR: spring(260, 0.25),
    tail: spring(90, 0.35), armL: spring(120, 0.5), armR: spring(140, 0.45),
    browY: spring(150, 0.7), browTilt: spring(150, 0.7),
    lookX: spring(220, 0.75), lookY: spring(220, 0.75),
    squash: spring(320, 0.22),
    lid: spring(140, 0.8), mouth: spring(90, 0.6),
  };

  let mood: BeaverMood = "idle";
  let activity: BeaverActivity = "none";
  let actT = 0;
  let ballRot = 0;
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
  };
  if (followCursor) window.addEventListener("pointermove", onMove);

  function frame(now: number, loop = true) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    t += dt;
    const p = POSE[mood];

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
    const breath = Math.sin(t * 1.85);
    const idleSway = 1.3 * Math.sin(t * 0.9) + 0.6 * Math.sin(t * 0.37 + 1);
    const ponder = mood === "thinking" ? 5 * Math.sin(t * 1.3) : 0;
    const waving = now < waveUntil;
    const armSwing = 1.5 * Math.sin(t * 1.85 + 0.6);

    // Цели по умолчанию; активность ниже может их переопределить.
    let headRotT = p.headRot + idleSway + ponder;
    let headYT = p.headY - breath * 2.2;
    let armLT = -armSwing + (mood === "sad" ? 5 : 0) + (mood === "thinking" ? 8 : 0);
    let armRT = waving ? -72 + 14 * Math.sin(t * 12) : armSwing - (mood === "sad" ? 5 : 0);
    let mouthT = p.mouth;
    let lidT = p.lid;
    let browYT = p.browY;
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
    step(s.headRot, headRotT + s.lookX.x * 0.35, dt);
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

    // Хвост и лапы отстают от тела — вторичное движение.
    step(s.tail, p.tailAmp * Math.sin(t * p.tailSpeed) - s.squash.v * 6, dt);
    step(s.armR, armRT, dt);
    step(s.armL, armLT, dt);
    step(s.mouth, mouthT, dt);
    step(s.lid, lidT, dt);
    step(s.browY, browYT, dt);
    step(s.browTilt, p.browTilt, dt);

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
    el.torso?.setAttribute("transform", scaleAt(1 + breath * 0.007, 1 + breath * 0.02, PIVOT.torso));
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
    for (const g of el.glints) g.setAttribute("transform", `translate(${(s.lookX.x * 0.7).toFixed(2)} ${(s.lookY.x * 0.7).toFixed(2)})`);
    el.browL?.setAttribute("transform", `translate(0 ${s.browY.x.toFixed(2)}) ${rot(s.browTilt.x, PIVOT.browLeft)}`);
    el.browR?.setAttribute("transform", `translate(0 ${s.browY.x.toFixed(2)}) ${rot(-s.browTilt.x, PIVOT.browRight)}`);
    if (ball && el.ball) {
      el.ball.setAttribute("transform", `translate(${ball.x.toFixed(2)} ${ball.y.toFixed(2)}) scale(${(1 / Math.sqrt(ball.sq)).toFixed(3)} ${ball.sq.toFixed(3)}) rotate(${ballRot.toFixed(1)})`);
      const k = Math.max(0.35, 1 - ball.h / 260);
      el.ballShadow?.setAttribute("transform", `translate(${ball.x.toFixed(2)} ${ball.ground}) scale(${k.toFixed(3)} 1) translate(${-ball.x.toFixed(2)} ${-ball.ground})`);
      el.ballShadow?.setAttribute("cx", ball.x.toFixed(2));
      el.ballShadow?.setAttribute("opacity", (0.2 * k).toFixed(3));
    }

    if (loop) raf = requestAnimationFrame((n) => frame(n));
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) frame(performance.now(), false);
  else raf = requestAnimationFrame((n) => frame(n));

  return {
    setMood(m) {
      if (m === "happy" && mood !== "happy") this.hop();
      mood = m;
      if (blinkT < 0) nextBlink = t + 0.05;
      if (reduced) frame(performance.now(), false);
    },
    setActivity(a) {
      activity = a;
      actT = 0;
      el.ball = root.querySelector<SVGGElement>("#prop-ball");
      el.ballShadow = root.querySelector<SVGEllipseElement>("#ball-shadow");
      if (reduced) frame(performance.now(), false);
    },
    hop() {
      if (hopT >= 0) return;
      s.squash.v += 1.6;
      hopT = 0;
      waveUntil = performance.now() + 1200;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    },
  };
}
