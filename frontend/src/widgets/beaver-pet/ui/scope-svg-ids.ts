/** Local SVG references, including quoted CSS urls and legacy xlink:href. */
const localReference = /url\(\s*(["']?)#([^\s)"']+)\1\s*\)|\b(?:xlink:)?href\s*=\s*(["'])#([^"']+)\3/g;

/** Include unused definitions too: later slot content can reference them. */
export function svgResourceIds(svg: string): Set<string> {
  const ids = new Set<string>();
  for (const defs of svg.matchAll(/<defs\b[^>]*(?<!\/)>([\s\S]*?)<\/defs>/g)) {
    for (const match of defs[1].matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)) ids.add(match[2]);
  }
  for (const match of svg.matchAll(localReference)) ids.add(match[2] ?? match[4]);
  for (const match of svg.matchAll(/\baria-(?:labelledby|describedby)\s*=\s*(["'])(.*?)\1/g)) {
    for (const id of match[2].split(/\s+/).filter(Boolean)) ids.add(id);
  }
  return ids;
}

/** Scope reference targets only; structural ids stay available to the instance's rig. */
export function scopeSvgIds(svg: string, prefix: string, knownIds: ReadonlySet<string> = new Set()): string {
  const ids = new Set([...knownIds, ...svgResourceIds(svg)]);
  const scoped = (id: string) => ids.has(id) ? `${prefix}-${id}` : id;
  return svg
    .replace(/\bid\s*=\s*(["'])(.*?)\1/g, (_, quote, id) => `id=${quote}${scoped(id)}${quote}`)
    .replace(localReference, (reference, urlQuote, urlId, hrefQuote, hrefId) => urlId
      ? `url(${urlQuote}#${scoped(urlId)}${urlQuote})`
      : reference.replace(`#${hrefId}${hrefQuote}`, `#${scoped(hrefId)}${hrefQuote}`))
    .replace(/\b(aria-(?:labelledby|describedby))\s*=\s*(["'])(.*?)\2/g,
      (_, attribute, quote, value) => `${attribute}=${quote}${value.split(/\s+/).map(scoped).join(" ")}${quote}`);
}
