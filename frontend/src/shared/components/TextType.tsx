import type { ElementType } from "react";

// TODO: болванка (react-bits TextType) — без анимации печати
export default function TextType({
  as: Tag = "div",
  text,
  className,
}: {
  as?: ElementType;
  text: string | string[];
  className?: string;
  cursorClassName?: string;
  typingSpeed?: number;
  pauseDuration?: number;
  loop?: boolean;
  [key: string]: unknown;
}) {
  return <Tag className={className}>{Array.isArray(text) ? text[0] : text}</Tag>;
}
