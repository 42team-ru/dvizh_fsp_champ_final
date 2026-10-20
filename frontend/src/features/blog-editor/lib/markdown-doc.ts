import type { JSONContent } from "@tiptap/react";
import { parseBlocks, parseInline, type Inline } from "@/shared/lib/markdown";

/**
 * Мост между Markdown (так пост хранится на сервере) и документом визуального редактора (TipTap/ProseMirror).
 * Пользователь видит только оформление, а в API уходит тот же Markdown, что рисует страница поста.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };

function inlineToNodes(nodes: Inline[], marks: Mark[] = []): JSONContent[] {
  return nodes.flatMap((node): JSONContent[] => {
    switch (node.type) {
      case "text": return [{ type: "text", text: node.text, ...(marks.length ? { marks } : {}) }];
      case "break": return [{ type: "hardBreak" }];
      case "code": return [{ type: "text", text: node.text, marks: [...marks, { type: "code" }] }];
      case "link": return inlineToNodes(node.children, [...marks, { type: "link", attrs: { href: node.href } }]);
      default: return inlineToNodes(node.children, [...marks, { type: node.type }]);
    }
  }).filter((n) => n.type !== "text" || n.text);
}

const paragraph = (text: string): JSONContent => {
  const content = inlineToNodes(parseInline(text));
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
};

/** Markdown → документ редактора. */
export function markdownToDoc(markdown: string): JSONContent {
  const content = parseBlocks(markdown).map((block): JSONContent => {
    switch (block.kind) {
      case "heading": {
        const inline = inlineToNodes(parseInline(block.text));
        return { type: "heading", attrs: { level: block.level <= 2 ? 2 : 3 }, ...(inline.length ? { content: inline } : {}) };
      }
      case "quote": return { type: "blockquote", content: [paragraph(block.text)] };
      case "list":
        return {
          type: block.ordered ? "orderedList" : "bulletList",
          content: block.items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
        };
      case "code": return { type: "codeBlock", ...(block.text ? { content: [{ type: "text", text: block.text }] } : {}) };
      default: return paragraph(block.text);
    }
  });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/** Служебные символы в обычном тексте экранируем, чтобы «2*3» не стало курсивом. */
const escape = (text: string) => text.replace(/([\\`*_~|[\]])/g, "\\$1");

const OPEN: Record<string, string> = { bold: "**", italic: "__", strike: "~~", spoiler: "||", code: "`", link: "[" };
const close = (mark: Mark) => (mark.type === "link" ? `](${String(mark.attrs?.href ?? "")})` : OPEN[mark.type]);
const sameMark = (a: Mark, b: Mark) => a.type === b.type && (a.type !== "link" || a.attrs?.href === b.attrs?.href);
/** Порядок вложенности: ссылка снаружи, код — внутри всего. */
const ORDER = ["link", "bold", "italic", "strike", "spoiler", "code"];

/**
 * Строка из inline-узлов: открытые выделения держим стеком, чтобы соседние куски одного стиля не дробились
 * («**раз****два**»), а пробелы по краям не попадали внутрь маркеров (иначе Markdown их не распознает).
 */
function inlineToMarkdown(nodes: JSONContent[] = []): string {
  let out = "";
  let pending = "";
  const open: Mark[] = [];
  const closeTo = (depth: number) => {
    while (open.length > depth) out += close(open.pop()!);
  };
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      closeTo(0);
      out += pending + "\n";
      pending = "";
      continue;
    }
    const raw = node.text ?? "";
    const marks = ((node.marks ?? []) as Mark[]).filter((m) => m.type in OPEN)
      .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    const lead = raw.match(/^\s*/)![0];
    const core = raw.slice(lead.length).replace(/\s+$/, "");
    const trail = raw.slice(lead.length + core.length);
    if (!core) {
      pending += raw;
      continue;
    }
    let keep = 0;
    while (keep < open.length && keep < marks.length && sameMark(open[keep], marks[keep])) keep++;
    // пробел на стыке: внутри маркеров, если стиль продолжается, иначе — снаружи (Markdown не любит «** слово**»)
    closeTo(keep);
    out += pending + lead;
    pending = "";
    for (const mark of marks.slice(open.length)) {
      out += OPEN[mark.type];
      open.push(mark);
    }
    out += open.some((m) => m.type === "code") ? core : escape(core);
    pending = trail;
  }
  closeTo(0);
  return out + pending;
}

const textOf = (node: JSONContent) => inlineToMarkdown(node.content);

function blockToMarkdown(node: JSONContent): string {
  switch (node.type) {
    case "heading": return `${"#".repeat(Number(node.attrs?.level ?? 2))} ${textOf(node)}`;
    case "blockquote":
      return (node.content ?? []).map(blockToMarkdown).join("\n").split("\n").map((l) => `> ${l}`).join("\n");
    case "bulletList":
    case "orderedList":
      return (node.content ?? []).map((item, i) => {
        const prefix = node.type === "orderedList" ? `${i + 1}. ` : "- ";
        return prefix + (item.content ?? []).map(blockToMarkdown).join(" ").replace(/\n/g, " ");
      }).join("\n");
    case "codeBlock": return "```\n" + (node.content ?? []).map((n) => n.text ?? "").join("") + "\n```";
    // абзац, который начинается с «#», «>» или «-», не должен стать заголовком, цитатой или списком
    default: return textOf(node).replace(/^([#>+-])/, "\\$1");
  }
}

/** Документ редактора → Markdown; пустые абзацы пропускаются. */
export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? []).map(blockToMarkdown).filter((b) => b.trim()).join("\n\n");
}
