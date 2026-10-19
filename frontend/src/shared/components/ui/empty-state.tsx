import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "cn"

/**
 * Пустое состояние: иконка в кружке, заголовок, пояснение и действие («Найти встречу»).
 * `tone` — фон кружка токеном (`bg-secondary`), `size="sm"` — для узких карточек и боковых колонок.
 */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  tone = "bg-secondary",
  size = "md",
  className,
}: {
  icon: LucideIcon
  title: string
  text?: ReactNode
  action?: ReactNode
  tone?: string
  size?: "sm" | "md"
  className?: string
}) {
  const sm = size === "sm"
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn(
        "flex w-full flex-col items-center text-center",
        sm ? "gap-2 py-2" : "gap-3 rounded-[24px] border-2 border-dashed border-track bg-card px-6 py-8",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.08 }}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "grid place-items-center rounded-full border-2 border-ink text-ink shadow-hard-sm",
            sm ? "size-11" : "size-16",
            tone
          )}
        >
          <Icon className={sm ? "size-5" : "size-7"} strokeWidth={2.2} aria-hidden />
        </motion.div>
      </motion.div>
      <p className={cn("font-display font-extrabold text-foreground", sm ? "text-[15px] leading-5" : "text-lg leading-6")}>
        {title}
      </p>
      {text && (
        <p className={cn("max-w-[420px] font-medium text-muted-foreground", sm ? "text-[13px] leading-[18px]" : "text-[15px] leading-[22px]")}>
          {text}
        </p>
      )}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </motion.div>
  )
}
