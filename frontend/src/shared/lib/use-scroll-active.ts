import { useEffect, useRef } from "react";

/**
 * Горизонтальная лента вкладок на телефоне: выбранная вкладка прокручивается в видимую часть ленты.
 * Иначе открытый раздел («Пользователи» в меню админки, «Команда» в кабинете) оказывался за правым краем.
 * Ищет внутри `[aria-selected="true"]` или `[aria-current="page"]`; страницу по вертикали не двигает.
 */
export function useScrollActiveIntoView<T extends HTMLElement>(active: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const box = ref.current;
    const item = box?.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"]');
    if (!box || !item || box.scrollWidth <= box.clientWidth) return;
    // координаты экрана → px ленты: на 2K/4K страница увеличена zoom (ViewportScale)
    const rect = box.getBoundingClientRect();
    const zoom = rect.width / (box.offsetWidth || 1) || 1;
    const left = (item.getBoundingClientRect().left - rect.left) / zoom + box.scrollLeft;
    box.scrollTo({ left: left - (box.clientWidth - item.offsetWidth) / 2 });
  }, [active]);
  return ref;
}
