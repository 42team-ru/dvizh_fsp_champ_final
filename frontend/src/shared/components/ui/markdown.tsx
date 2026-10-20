import { Fragment, useState, type ReactNode } from "react";
import { cn } from "cn";
import { parseBlocks, parseInline, type Block, type Inline } from "@/shared/lib/markdown";

/**
 * Текст поста: Markdown разбирается в дерево (`shared/lib/markdown`) и рисуется React-элементами,
 * без dangerouslySetInnerHTML — HTML из текста не исполняется.
 */
export function Markdown({ text, className, compact }: { text: string; className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col text-foreground", compact ? "gap-2 text-[15px] leading-[23px]" : "gap-4 text-[17px] leading-[28px]", className)}>
      {parseBlocks(text).map((block, i) => (
        <Fragment key={i}>{renderBlock(block, compact)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: Block, compact?: boolean): ReactNode {
  switch (block.kind) {
    case "heading": {
      // # — крупный, ## — средний, ### — малый; в разметке страницы на ступень ниже: h1 — заголовок поста
      const size = block.level === 1
        ? compact ? "text-xl leading-7" : "text-[28px] leading-[36px]"
        : block.level === 2
          ? compact ? "text-lg leading-6" : "text-[22px] leading-[30px]"
          : compact ? "text-base leading-6" : "text-lg leading-6";
      const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
      return <Tag className={cn("mt-2 font-display font-bold text-foreground", size)}>{inline(block.text)}</Tag>;
    }
    case "quote":
      return (
        <blockquote className="box-border flex gap-4 rounded-[18px] border-2 border-ink bg-lime-soft px-5 py-4 font-bold">
          <span aria-hidden="true" className="w-1.5 shrink-0 self-stretch rounded-full border-[1.5px] border-ink bg-secondary" />
          <span className="min-w-0">{inline(block.text)}</span>
        </blockquote>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("flex flex-col gap-1.5 pl-6", block.ordered ? "list-decimal" : "list-disc", "marker:font-extrabold marker:text-primary")}>
          {block.items.map((item, i) => <li key={i} className="pl-1">{inline(item)}</li>)}
        </Tag>
      );
    }
    case "code":
      return (
        <pre className="overflow-x-auto rounded-[16px] border-2 border-ink bg-muted px-4 py-3 font-mono text-[14px] leading-[22px]">
          <code>{block.text}</code>
        </pre>
      );
    default:
      return <p className="break-words">{inline(block.text)}</p>;
  }
}

function inline(text: string): ReactNode[] {
  return renderInline(parseInline(text));
}

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text": return <Fragment key={i}>{node.text}</Fragment>;
      case "break": return <br key={i} />;
      case "code": return <code key={i} className="rounded-[6px] border border-ink/30 bg-muted px-1.5 py-px font-mono text-[0.9em]">{node.text}</code>;
      case "bold": return <strong key={i} className="font-extrabold">{renderInline(node.children)}</strong>;
      case "italic": return <em key={i}>{renderInline(node.children)}</em>;
      case "strike": return <s key={i}>{renderInline(node.children)}</s>;
      case "spoiler": return <Spoiler key={i}>{renderInline(node.children)}</Spoiler>;
      case "link": return <PostLink key={i} href={node.href}>{renderInline(node.children)}</PostLink>;
    }
  });
}

function PostLink({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a href={href} className="font-bold text-primary underline decoration-2 underline-offset-2 hover:text-ink"
      {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
      {children}
    </a>
  );
}

/** Спойлер как в Telegram: текст под «шумом», нажатие показывает. */
function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={open ? undefined : "Спойлер: нажмите, чтобы показать"}
      aria-expanded={open}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
      className={cn("rounded-[6px] px-0.5 transition-all", open ? "bg-muted" : "cursor-pointer bg-ink/80 text-transparent blur-[3px] select-none")}
    >
      {children}
    </span>
  );
}
