import { QRCodeSVG } from "qrcode.react"
import { cn } from "cn"

/** Полная ссылка на страницу сайта: QR сканируют с чужого телефона, относительный путь там бесполезен. */
function absoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString()
}

/**
 * QR-код на страницу сайта. Цвета намеренно не из темы: чёрное на белом сканируется любой камерой,
 * а тёмная тема с «чернилами» светлого цвета дала бы инверсный код, который читают не все.
 */
function QrCode({ path, className, label }: { path: string; className?: string; label?: string }) {
  return (
    <QRCodeSVG
      value={absoluteUrl(path)}
      role="img"
      aria-label={label ?? "QR-код со ссылкой"}
      level="M"
      marginSize={1}
      bgColor="#ffffff"
      fgColor="#000000"
      className={cn("block shrink-0 rounded-md border-2 border-ink", className)}
    />
  )
}

export { QrCode, absoluteUrl }
