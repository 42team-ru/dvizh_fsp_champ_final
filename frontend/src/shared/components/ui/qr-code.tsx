import { QRCodeSVG } from "qrcode.react"
import { cn } from "cn"
import { shortPath } from "@/shared/lib/short-link"

/** Полная ссылка на страницу сайта: QR сканируют с чужого телефона, относительный путь там бесполезен. */
function absoluteUrl(path: string) {
  return new URL(path, window.location.origin).toString()
}

/** Буквенно-цифровой режим QR: только цифры, заглавные латинские и « $%*+-./:». */
const QR_ALNUM = /^[0-9A-Z $%*+\-./:]+$/

/**
 * Ссылка для QR: короткий путь (/E/<код> вместо /events/<uuid>) и заглавные буквы —
 * так код укладывается в плотный режим и получается в полтора раза крупнее.
 */
function qrUrl(path: string) {
  const url = absoluteUrl(shortPath(path)).replace(/\/$/, "")
  return QR_ALNUM.test(url.toUpperCase()) ? url.toUpperCase() : url
}

/**
 * QR-код на страницу сайта. Цвета намеренно не из темы: чёрное на белом сканируется любой камерой,
 * а тёмная тема с «чернилами» светлого цвета дала бы инверсный код, который читают не все.
 */
function QrCode({ path, className, label }: { path: string; className?: string; label?: string }) {
  return (
    <QRCodeSVG
      value={qrUrl(path)}
      role="img"
      aria-label={label ?? "QR-код со ссылкой"}
      level="L"
      marginSize={1}
      bgColor="#ffffff"
      fgColor="#000000"
      className={cn("block shrink-0 rounded-md border-2 border-ink", className)}
    />
  )
}

export { QrCode, absoluteUrl }
