import type { KeyboardEvent } from "react";

/**
 * Поле сообщения как в мессенджере: Enter отправляет, Ctrl+Enter (или Shift+Enter) — перенос строки.
 * Во время набора через IME (японский, китайский) Enter подтверждает слово и ничего не отправляет.
 */
export function enterToSend(e: KeyboardEvent<HTMLTextAreaElement>, setValue: (v: string) => void, submit: () => void) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
    submit();
    return;
  }
  const el = e.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = el;
  setValue(value.slice(0, start) + "\n" + value.slice(end));
  requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
}

/** Подсказка для title поля ввода. */
export const ENTER_HINT = "Enter — отправить, Ctrl+Enter — новая строка";
