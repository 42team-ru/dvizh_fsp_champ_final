/**
 * Разбор Markdown постов в дерево: им рисуется пост (`shared/components/ui/markdown.tsx`) и наполняется визуальный
 * редактор (`features/blog-editor`). Синтаксис в духе Telegram: **жирный**, __курсив__ (и *курсив*), ~~зачёркнутый~~,
 * `код`, ||спойлер||, [ссылка](https://…), заголовки #, цитаты >, списки - и 1., блоки ```кода```.
 * Обратный слэш экранирует служебный символ: \* — просто звёздочка.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "break" }
  | { type: "code"; text: string }
  | { type: "bold" | "italic" | "strike" | "spoiler"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; text: string };

const HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const BULLET = /^\s{0,3}[-*+]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d+[.)]\s+(.*)$/;
const FENCE = /^\s{0,3}```/;

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (FENCE.test(line)) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) quote.push(QUOTE.exec(lines[i++])![1]);
      blocks.push({ kind: "quote", text: quote.join("\n") });
      continue;
    }
    const list = BULLET.test(line) ? BULLET : NUMBERED.test(line) ? NUMBERED : null;
    if (list) {
      const items: string[] = [];
      while (i < lines.length && list.test(lines[i])) items.push(list.exec(lines[i++])![1]);
      blocks.push({ kind: "list", ordered: list === NUMBERED, items });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !FENCE.test(lines[i]) && !HEADING.test(lines[i])
      && !QUOTE.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
      paragraph.push(lines[i++]);
    }
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }
  return blocks;
}

const INLINE =
  /(\\[\\`*_~|[\]()#>+\-])|(`[^`\n]+`)|(\*\*(?:\\.|[\s\S])+?\*\*)|(__(?:\\.|[\s\S])+?__)|(~~(?:\\.|[\s\S])+?~~)|(\|\|(?:\\.|[\s\S])+?\|\|)|(\[(?:\\.|[^\]\n])+\]\([^)\s]+\))|(https?:\/\/[^\s<]*[^\s<.,:;"')\]!?])|((?<![\p{L}\p{N}*])\*(?!\s)(?:\\.|[^*\n])+?(?<!\s)\*(?![\p{L}\p{N}]))|((?<![\p{L}\p{N}_])_(?!\s)(?:\\.|[^_\n])+?(?<!\s)_(?![\p{L}\p{N}]))/gu;
const LINK = /^\[((?:\\.|[^\]\n])+)\]\(([^)\s]+)\)$/;

/** Безопасная ссылка: http(s) или путь внутри сайта; остальное (javascript: и т.п.) — просто текст. */
export function safeHref(url: string) {
  return /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//")) ? url : null;
}

function plainText(text: string, out: Inline[]) {
  text.split("\n").forEach((part, i) => {
    if (i > 0) out.push({ type: "break" });
    if (part) out.push({ type: "text", text: part });
  });
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) plainText(text.slice(last, index), out);
    const token = match[0];
    if (match[1]) out.push({ type: "text", text: token.slice(1) });
    else if (match[2]) out.push({ type: "code", text: token.slice(1, -1) });
    else if (match[3]) out.push({ type: "bold", children: parseInline(token.slice(2, -2)) });
    else if (match[4]) out.push({ type: "italic", children: parseInline(token.slice(2, -2)) });
    else if (match[5]) out.push({ type: "strike", children: parseInline(token.slice(2, -2)) });
    else if (match[6]) out.push({ type: "spoiler", children: parseInline(token.slice(2, -2)) });
    else if (match[7]) {
      const [, label, url] = LINK.exec(token)!;
      const href = safeHref(url);
      if (href) out.push({ type: "link", href, children: parseInline(label) });
      else plainText(label, out);
    }
    else if (match[8]) out.push({ type: "link", href: token, children: [{ type: "text", text: token.replace(/^https?:\/\//, "") }] });
    else out.push({ type: "italic", children: parseInline(token.slice(1, -1)) });
    last = index + token.length;
  }
  if (last < text.length) plainText(text.slice(last), out);
  return out;
}
