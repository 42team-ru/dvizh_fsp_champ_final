import { motion } from "motion/react"
import { Outlet, useLocation } from "react-router"

/** Outlet с плавным появлением страницы. Без transform: иначе ломаются fixed-панели внутри. */
export function PageTransition() {
  const { pathname } = useLocation()
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Outlet />
    </motion.div>
  )
}
