import fontFaces from "@/shared/styles/fonts.css?raw";

/** Все ресурсы PNG встраиваются в SVG: экспорт не зависит от внешнего сервиса или CDN. */
async function dataUrl(url: string) {
  const address = new URL(url, window.location.origin);
  if (address.origin !== window.location.origin)
    throw new Error("Изображение должно быть с этого сайта");
  const response = await fetch(address, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Не удалось загрузить ресурс картинки");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

let embeddedFonts: Promise<string> | undefined;
async function fonts() {
  embeddedFonts ??= (async () => {
    let css = fontFaces;
    for (const match of fontFaces.matchAll(/url\("([^"]+)"\)/g)) {
      css = css.replace(match[0], `url("${await dataUrl(match[1])}")`);
    }
    return css;
  })().catch((error) => {
    embeddedFonts = undefined;
    throw error;
  });
  return embeddedFonts;
}

/** Явные стили заменяют Tailwind и переменные, которых нет в изолированном SVG. Холст не использует псевдоэлементы. */
async function inlineNode(source: Element, clone: Element) {
  const style = getComputedStyle(source);
  const target = (clone as HTMLElement | SVGElement).style;
  for (const property of style) {
    // Браузер разворачивает ссылки на SVG-градиенты/clipPath в абсолютные URL страницы.
    // В скачиваемом SVG они снова должны ссылаться на его собственные defs.
    const value = style
      .getPropertyValue(property)
      .replace(/url\(["']?[^)"']*#([^)"']+)["']?\)/g, "url(#$1)");
    target.setProperty(property, value);
  }
  target.setProperty("animation", "none");
  target.setProperty("transition", "none");
  if (source instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
    await source.decode();
    clone.removeAttribute("srcset");
    clone.removeAttribute("loading");
    clone.src = await dataUrl(source.currentSrc || source.src);
  }
  await Promise.all(
    Array.from(source.children, (child, index) =>
      inlineNode(child, clone.children[index]),
    ),
  );
}

/** PNG имеет размер самого холста, независимо от DPR устройства и масштаба превью. */
export async function downloadPoster(node: HTMLElement, title: string) {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('800 48px "Unbounded"', "Движ Sport"),
    document.fonts.load('700 32px "Manrope"', "Движ Sport"),
  ]);
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const clone = node.cloneNode(true) as HTMLElement;
  await inlineNode(node, clone);
  const style = document.createElement("style");
  style.textContent = await fonts();
  clone.prepend(style);
  const markup = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось создать картинку");
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Не удалось сохранить PNG")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug =
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "share";
  link.download = `dvizh-${slug}.png`;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
