/*
 * Короткие ссылки для QR. UUID из 36 символов записывается 26 символами в base32 (алфавит Crockford,
 * только цифры и заглавные буквы), а вся ссылка — заглавными. Так QR кодируется в плотном
 * буквенно-цифровом режиме и получается заметно крупнее. Код однозначно превращается обратно
 * в UUID на фронте, поэтому бэкенду короткие ссылки не нужны.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID → 26 символов base32: 128 бит дополняются двумя нулевыми до 130. */
export function uuidToCode(uuid: string): string {
  let bits = 0n;
  for (const ch of uuid.replace(/-/g, "")) bits = (bits << 4n) | BigInt(parseInt(ch, 16));
  bits <<= 2n;
  let code = "";
  for (let i = 25; i >= 0; i--) code += ALPHABET[Number((bits >> BigInt(i * 5)) & 31n)];
  return code;
}

/** Обратно в UUID; null — если код испорчен. Регистр и похожие буквы (O→0, I/L→1) не важны. */
export function codeToUuid(code: string): string | null {
  const clean = code.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(clean)) return null;
  let bits = 0n;
  for (const ch of clean) bits = (bits << 5n) | BigInt(ALPHABET.indexOf(ch));
  if ((bits & 3n) !== 0n) return null;
  const hex = (bits >> 2n).toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Короткие префиксы и полные страницы, куда они ведут. */
const SHORT = [
  { full: "events", short: "E" },
  { full: "orgs", short: "O" },
] as const;

/** Путь страницы → короткий путь для QR; неизвестные пути остаются как есть. */
export function shortPath(path: string): string {
  const [, section, ref] = path.match(/^\/([a-z]+)\/([^/?#]+)$/) ?? [];
  const known = SHORT.find((s) => s.full === section);
  if (known && UUID.test(ref)) return `/${known.short}/${uuidToCode(ref)}`;
  // Логины — латиница, цифры, точка и дефис: регистр бэкенду не важен, а заглавные — плотнее в QR.
  if (section === "users" && /^[a-z0-9.-]+$/i.test(ref)) return `/U/${ref.toUpperCase()}`;
  return path;
}

/** Короткий путь → полный; null — не короткая ссылка или код испорчен. */
export function expandShortPath(kind: string, ref: string): string | null {
  const k = kind.toUpperCase();
  if (k === "U") return `/users/${ref.toLowerCase()}`;
  const known = SHORT.find((s) => s.short === k);
  const uuid = known ? codeToUuid(ref) : null;
  return known && uuid ? `/${known.full}/${uuid}` : null;
}
