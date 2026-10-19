import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { useLocation, useOutlet } from "react-router"

/**
 * Страница, «замороженная» на момент появления: при уходе она гаснет со своим содержимым,
 * а не с уже подменённым содержимым новой страницы.
 */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

/**
 * Outlet с плавной сменой страниц: старая коротко гаснет, новая мягко проявляется.
 * Только прозрачность: transform и filter сломали бы fixed-панели внутри страницы.
 */
export function PageTransition() {
  const { pathname } = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
      >
        <FrozenOutlet />
      </motion.div>
    </AnimatePresence>
  )
}
