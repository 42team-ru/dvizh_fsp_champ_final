import { Extension, Mark, markInputRule, markPasteRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spoiler: { toggleSpoiler: () => ReturnType };
  }
}

/** Спойлер как в Telegram (||текст||): в редакторе текст виден, но подсвечен; в посте он скрыт до нажатия. */
export const Spoiler = Mark.create({
  name: "spoiler",
  parseHTML: () => [{ tag: "span[data-spoiler]" }],
  renderHTML: () => ["span", { "data-spoiler": "", class: "blog-spoiler" }, 0],
  addCommands() {
    return { toggleSpoiler: () => ({ commands }) => commands.toggleMark(this.name) };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-p": () => this.editor.commands.toggleSpoiler() };
  },
  addInputRules() {
    return [markInputRule({ find: /(?:^|\s)(\|\|(?!\s)([^|]+)\|\|)$/, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: /(?:^|\s)(\|\|(?!\s)([^|]+)\|\|)/g, type: this.type })];
  },
});

/** Сочетания клавиш Telegram Desktop поверх стандартных (Ctrl+B, Ctrl+I уже есть). */
const TelegramShortcuts = Extension.create({
  name: "telegramShortcuts",
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-x": () => this.editor.commands.toggleStrike(),
      "Mod-Shift-m": () => this.editor.commands.toggleCode(),
    };
  },
});

/**
 * Что умеет редактор поста — ровно то, что умеет Markdown постов. Разметка при наборе сама превращается
 * в оформление: «**слово**» → жирное, «## » → заголовок, «> » → цитата, «- » / «1. » → список.
 */
export function blogExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      horizontalRule: false,
      dropcursor: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      protocols: ["https", "http"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      validate: (href) => /^https?:\/\//i.test(href),
    }),
    Spoiler,
    TelegramShortcuts,
    Placeholder.configure({ placeholder }),
  ];
}
