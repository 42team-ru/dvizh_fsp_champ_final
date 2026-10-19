import * as React from "react"
import { cn } from "cn"

/** Иконка из `public/home` (или `public/<папка>`, если имя вида `feed/icon-pin`), размер задаётся классом `size-*`. */
function Icon({
  name,
  className,
  ...props
}: Omit<React.ComponentProps<"img">, "src" | "alt"> & { name: string }) {
  return (
    <img
      data-slot="icon"
      src={name.includes("/") ? `/${name}.svg` : `/home/${name}.svg`}
      alt=""
      className={cn("block shrink-0", className)}
      {...props}
    />
  )
}

export { Icon }
