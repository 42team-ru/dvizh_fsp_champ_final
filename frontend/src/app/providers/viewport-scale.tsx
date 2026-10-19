import { useLayoutEffect } from "react";

/** Ширина макета, под которую нарисован интерфейс (fullHD). */
const BASE_WIDTH = 1920;

/**
 * На широких экранах (2K, 4K) масштабирует страницу так, чтобы она выглядела как на fullHD:
 * при ширине 2560 px зум 1,33, при 3840 px — 2. Меньше fullHD ничего не меняется.
 */
export function ViewportScale() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const scale = Math.max(1, window.innerWidth / BASE_WIDTH);
      root.style.zoom = scale > 1 ? String(scale) : "";
      root.style.setProperty("--vp-zoom", String(scale));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.zoom = "";
      root.style.removeProperty("--vp-zoom");
    };
  }, []);

  return null;
}
