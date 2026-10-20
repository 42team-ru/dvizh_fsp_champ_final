import { useLayoutEffect } from "react";

/** Ширина макета, под которую нарисован интерфейс (fullHD). */
const BASE_WIDTH = 1920;

/**
 * На широких экранах (2K, 4K) масштабирует страницу так, чтобы она выглядела как на fullHD:
 * при ширине 2560 px зум 1,33, при 3840 px — 2. Меньше fullHD ничего не меняется.
 *
 * CSS-зум растягивает холсты как картинку, и карта 2ГИС (WebGL) выходила мыльной. Поэтому на время зума
 * `devicePixelRatio` умножается на него: один CSS-пиксель и правда занимает столько физических,
 * и карта рисует холст в полном разрешении экрана.
 */
export function ViewportScale() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const native = Object.getOwnPropertyDescriptor(window, "devicePixelRatio")
      ?? Object.getOwnPropertyDescriptor(Window.prototype, "devicePixelRatio");
    const readNative = () => (native?.get ? (native.get.call(window) as number) : 1);
    let scale = 1;
    if (native?.configurable !== false) {
      Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => readNative() * scale });
    }
    const apply = () => {
      scale = Math.max(1, window.innerWidth / BASE_WIDTH);
      root.style.zoom = scale > 1 ? String(scale) : "";
      root.style.setProperty("--vp-zoom", String(scale));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.zoom = "";
      root.style.removeProperty("--vp-zoom");
      if (native) Object.defineProperty(window, "devicePixelRatio", native);
    };
  }, []);

  return null;
}
