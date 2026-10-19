import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import beaverSvg from "./beaver.svg?raw";
import { createBeaverRig, type BeaverRig, type ReactOptions } from "./beaver-rig";
import { usePetsCatalog } from "@/shared/api/generated/core/pets/pets";
import { buildSlots, SLOTS, type BeaverActivity, type BeaverArts, type BeaverOutfit } from "./beaver-wardrobe";
import { scopeSvgIds, svgResourceIds } from "./scope-svg-ids";
import "./beaver-pet.css";

// This contour lives outside defs and is referenced only by wardrobe <use> elements.
const baseReferenceIds = new Set([
  ...svgResourceIds(beaverSvg), "head-outline",
]);

export type BeaverMood = "idle" | "happy" | "surprised" | "thinking" | "sad" | "wink" | "offended" | "sleep";

/** Управление бобром снаружи: сыграть эмоцию, которая сама сбросится к базовому настроению. */
export type BeaverPetHandle = { react(mood: BeaverMood, opts?: ReactOptions): void };

type Props = {
  /** Базовое настроение: до смены пропа или первого контакта. Короткие эмоции — через ref.react(). */
  mood?: BeaverMood;
  ref?: Ref<BeaverPetHandle>;
  /** Реплика сервера: исчезает через 20 секунд или при первом контакте. */
  say?: string;
  sayHref?: string;
  /** В профиле реплика занимает существующее поле карточки. */
  speechContainer?: HTMLElement | null;
  /** Что надето: головной убор или наушники, очки, одежда, экипировка, вещь на шее. */
  outfit?: BeaverOutfit;
  /** Инвентарь рядом или в лапах: мяч, гантели, шахматы, лыжи, хоккей, ноутбук. */
  activity?: BeaverActivity;
  /** Рисунки вещей не из каталога: предпросмотр в админке. Ключ «слот:код». */
  extraArts?: BeaverArts;
  /** Глаза следят за курсором. */
  followCursor?: boolean;
  className?: string;
  onClick?: () => void;
  /** Первый контакт (тычок или поглаживание): хозяин развеселил бобра — сохранить это на сервере. */
  onCheer?: () => void;
};

/** Анимированный маскот-бобр. Настроение, наряд и активность задаются пропсами, движение считает beaver-rig. */
export function BeaverPet({ mood = "idle", outfit = {}, activity = "none", followCursor = true, className, onClick, say, sayHref, speechContainer, extraArts, onCheer, ref: handleRef }: Props) {
  const instanceId = useId();
  const svgPrefix = `beaver-${instanceId.replace(/[^a-zA-Z0-9_-]/g, (char) => `_${char.codePointAt(0)!.toString(16)}_`)}`;
  const scopedSvg = useMemo(() => scopeSvgIds(beaverSvg, svgPrefix, baseReferenceIds), [svgPrefix]);
  const ref = useRef<HTMLDivElement>(null);
  const rig = useRef<BeaverRig | null>(null);
  const [speechVisible, setSpeechVisible] = useState(false);
  const interacted = useRef(false);
  const onCheerRef = useRef(onCheer);
  onCheerRef.current = onCheer;
  const outfitKey = JSON.stringify(outfit);
  // Вещи от админа рисуются по каталогу; встроенные знает сам гардероб.
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const arts = useMemo(() => {
    const map: BeaverArts = { ...extraArts };
    for (const slot of catalog.data?.data.slots ?? []) {
      for (const item of slot.items) if (item.art) map[`${slot.id}:${item.id}`] = item.art;
    }
    return map;
  }, [catalog.data, extraArts]);

  useImperativeHandle(handleRef, () => ({ react: (m, opts) => rig.current?.react(m, opts) }), []);

  useEffect(() => {
    if (!ref.current) return;
    rig.current = createBeaverRig(ref.current, followCursor, () => {
      if (interacted.current) return;
      interacted.current = true;
      setSpeechVisible(false);
      rig.current?.setMood("idle");
      onCheerRef.current?.();
    });
    return () => rig.current?.destroy();
  }, [followCursor]);

  useEffect(() => {
    interacted.current = false;
    rig.current?.setMood(mood);
    setSpeechVisible(Boolean(say));
    const timer = window.setTimeout(() => setSpeechVisible(false), 20_000);
    return () => window.clearTimeout(timer);
  }, [mood, say, sayHref, followCursor]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const content = buildSlots(JSON.parse(outfitKey) as BeaverOutfit, activity, arts);
    const referenceIds = new Set([...baseReferenceIds, ...svgResourceIds(Object.values(content).join(""))]);
    for (const id of SLOTS) {
      const slot = root.querySelector(`#${id}`);
      if (slot) slot.innerHTML = scopeSvgIds(content[id] ?? "", svgPrefix, referenceIds);
    }
    rig.current?.setActivity(activity);
  }, [outfitKey, activity, followCursor, svgPrefix, arts]);

  const speech = (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{speechVisible ? say : ""}</span>
      <div className={`beaver-speech ${speechContainer ? "beaver-speech--card" : ""} ${speechVisible ? "beaver-speech--visible" : ""}`} aria-hidden={!speechVisible}>
        <div>
          {say && (sayHref
            ? <Link tabIndex={speechVisible ? 0 : -1} to={sayHref} title={say} aria-label={say} className="beaver-speech__text underline underline-offset-2">{say}</Link>
            : <span title={say} className="beaver-speech__text">{say}</span>)}
        </div>
      </div>
    </>
  );

  return (
    <div className={`beaver-pet-container ${className ?? ""}`}>
      {speechContainer ? createPortal(speech, speechContainer) : speech}
      <div
        ref={ref}
        className="beaver-pet"
        role="button"
        tabIndex={0}
        aria-label="Бобр: потрогать"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            rig.current?.poke(ref.current?.querySelector("#head") ?? null);
            onClick?.();
          }
        }}
        onClick={(event) => {
          // Реакция зависит от того, куда ткнули: нос, голова, живот, хвост, лапы.
          rig.current?.poke(event.target instanceof Element ? event.target : null);
          onClick?.();
        }}
        dangerouslySetInnerHTML={{ __html: scopedSvg }}
      />
    </div>
  );
}
