import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  Bold, Check, Code, EyeOff, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Strikethrough, X,
} from "lucide-react";
import { cn } from "cn";
import { blogExtensions } from "../lib/extensions";
import { docToMarkdown, markdownToDoc } from "../lib/markdown-doc";

type Props = {
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
};

type Tool = { key: string; label: string; hint?: string; icon: ReactNode; active(e: Editor): boolean; run(e: Editor): void };

const INLINE: Tool[] = [
  { key: "bold", label: "Жирный", hint: "Ctrl+B", icon: <Bold />, active: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { key: "italic", label: "Курсив", hint: "Ctrl+I", icon: <Italic />, active: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  { key: "strike", label: "Зачёркнутый", hint: "Ctrl+Shift+X", icon: <Strikethrough />, active: (e) => e.isActive("strike"), run: (e) => e.chain().focus().toggleStrike().run() },
  { key: "code", label: "Моноширинный", hint: "Ctrl+Shift+M", icon: <Code />, active: (e) => e.isActive("code"), run: (e) => e.chain().focus().toggleCode().run() },
  { key: "spoiler", label: "Спойлер", hint: "Ctrl+Shift+P", icon: <EyeOff />, active: (e) => e.isActive("spoiler"), run: (e) => e.chain().focus().toggleSpoiler().run() },
];

const BLOCKS: Tool[] = [
  { key: "h1", label: "Крупный заголовок", hint: "# в начале строки", icon: <Heading1 />, active: (e) => e.isActive("heading", { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { key: "h2", label: "Заголовок", hint: "## в начале строки", icon: <Heading2 />, active: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { key: "h3", label: "Подзаголовок", hint: "### в начале строки", icon: <Heading3 />, active: (e) => e.isActive("heading", { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { key: "quote", label: "Цитата", icon: <Quote />, active: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { key: "list", label: "Список", icon: <List />, active: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  { key: "numbered", label: "Нумерованный список", icon: <ListOrdered />, active: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
];

/**
 * Визуальный редактор поста: оформление применяется сразу и видно как в готовом посте, служебных символов
 * пользователь не видит. Как в Telegram: выделил — всплыла панель, или сочетание клавиш; набранные «**…**», «## »,
 * «> », «- » сами превращаются в оформление. Наружу (onChange) отдаётся Markdown — так пост хранится на сервере.
 */
export function MarkdownEditor({ value, onChange, placeholder = "", maxLength, id }: Props) {
  const emitted = useRef(value);
  const box = useRef<HTMLDivElement>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const editor = useEditor({
    extensions: blogExtensions(placeholder),
    content: markdownToDoc(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Текст поста",
        class: "blog-editor-content min-h-[240px] px-5 py-4 outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      const markdown = docToMarkdown(e.getJSON());
      emitted.current = markdown;
      onChange(markdown);
    },
  });

  // текст пришёл снаружи (загрузили пост для правки) — переносим в редактор, свои же правки не трогаем
  useEffect(() => {
    if (editor && value !== emitted.current) {
      emitted.current = value;
      editor.commands.setContent(markdownToDoc(value), false);
    }
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const { from, to, empty } = e.state.selection;
      let bubble: { top: number; left: number } | null = null;
      if (!empty && e.isFocused && box.current) {
        const start = e.view.coordsAtPos(from);
        const end = e.view.coordsAtPos(to);
        const rect = box.current.getBoundingClientRect();
        const above = Math.min(start.top, end.top) - rect.top - 50;
        bubble = {
          // над выделением, а если там верхняя панель — под ним
          top: above >= 56 ? above : Math.max(start.bottom, end.bottom) - rect.top + 8,
          left: Math.max(0, Math.min((start.left + end.left) / 2 - rect.left - 130, rect.width - 280)),
        };
      }
      return {
        bubble,
        active: Object.fromEntries([...INLINE, ...BLOCKS].map((t) => [t.key, t.active(e)])),
        link: e.isActive("link"),
        empty,
      };
    },
  });

  const openLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    setLinking("https://");
  };
  const applyLink = () => {
    if (!editor || linking === null) return;
    const href = linking.trim();
    if (/^https?:\/\/\S+\.\S+/i.test(href)) {
      const chain = editor.chain().focus().extendMarkRange("link");
      if (editor.state.selection.empty) chain.insertContent({ type: "text", text: href.replace(/^https?:\/\//, ""), marks: [{ type: "link", attrs: { href } }] }).run();
      else chain.setLink({ href }).run();
    }
    setLinking(null);
  };

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key.toLowerCase() === "k" || event.code === "KeyK")) {
        event.preventDefault();
        openLink();
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener("keydown", handler);
    return () => dom.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const button = (t: Pick<Tool, "key" | "label" | "hint" | "icon">, on: boolean, run: () => void, dark?: boolean) => (
    <button key={t.key} type="button" title={t.hint ? `${t.label} · ${t.hint}` : t.label} aria-label={t.label} aria-pressed={on}
      onMouseDown={(e) => e.preventDefault()} onClick={run}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-ink [&_svg]:size-[18px]",
        dark ? (on ? "bg-secondary text-ink" : "text-white hover:bg-white/15") : (on ? "bg-ink text-white" : "text-foreground hover:bg-muted"))}>
      {t.icon}
    </button>
  );
  const linkTool = { key: "link", label: state?.link ? "Убрать ссылку" : "Ссылка", hint: "Ctrl+K", icon: <Link2 /> };
  const length = value.length;

  return (
    <div ref={box} className="blog-editor relative box-border flex flex-col rounded-[20px] border-2 border-ink bg-card">
      <div role="toolbar" aria-label="Оформление" className="sticky top-[76px] z-10 flex flex-wrap items-center gap-1 rounded-t-[18px] border-b-2 border-ink bg-card px-2 py-1.5 max-lg:top-0">
        {editor && INLINE.map((t) => button(t, Boolean(state?.active[t.key]), () => t.run(editor)))}
        {editor && button(linkTool, Boolean(state?.link), openLink)}
        <span aria-hidden="true" className="mx-1 h-6 w-0.5 bg-track" />
        {editor && BLOCKS.map((t) => button(t, Boolean(state?.active[t.key]), () => t.run(editor)))}
        {maxLength ? (
          <span className={cn("ml-auto pr-2 text-xs font-bold tabular-nums", length > maxLength ? "text-destructive" : "text-muted-foreground")}>
            {length} / {maxLength}
          </span>
        ) : null}
      </div>

      {editor && (state?.bubble || linking !== null) && (
        <div role="toolbar" aria-label="Оформление выделенного"
          style={state?.bubble ? { top: state.bubble.top, left: state.bubble.left } : { top: 56, left: 8 }}
          className="absolute z-20 flex items-center gap-0.5 rounded-[14px] border-2 border-ink bg-ink p-1 shadow-hard-sm">
          {linking !== null ? (
            <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); applyLink(); }}>
              <input autoFocus value={linking} onChange={(e) => setLinking(e.target.value)} aria-label="Адрес ссылки"
                onKeyDown={(e) => e.key === "Escape" && setLinking(null)}
                className="h-8 w-[220px] rounded-[8px] bg-white px-2 text-sm font-semibold text-ink outline-none" />
              <button type="submit" aria-label="Добавить ссылку" className="flex size-8 items-center justify-center rounded-[8px] text-white hover:bg-white/15"><Check className="size-4" /></button>
              <button type="button" aria-label="Отмена" onClick={() => setLinking(null)} className="flex size-8 items-center justify-center rounded-[8px] text-white hover:bg-white/15"><X className="size-4" /></button>
            </form>
          ) : (
            <>
              {INLINE.map((t) => button(t, Boolean(state?.active[t.key]), () => t.run(editor), true))}
              {button(linkTool, Boolean(state?.link), openLink, true)}
            </>
          )}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
