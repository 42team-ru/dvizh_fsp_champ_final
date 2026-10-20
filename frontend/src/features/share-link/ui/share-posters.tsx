import { useId, type ReactNode } from "react";
import { QrCode } from "@/shared/components/ui/qr-code";
import type { ShareFormat } from "./share-dialog";

/** Водяные волны: векторный гильош, цвет наследуется из токенов темы. */
export function PassportWaves({ className }: { className?: string }) {
  const pattern = `passport-waves-${useId().replace(/:/g, "")}`;
  return (
    <svg aria-hidden="true" className={className} width="100%" height="100%">
      <defs>
        <pattern
          id={pattern}
          width="360"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M-180 50 Q-90 0 0 50 T180 50 T360 50 T540 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M-180 100 Q-90 50 0 100 T180 100 T360 100 T540 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pattern})`} />
    </svg>
  );
}

/** Афиша 1080px. В сторис увеличена иллюстрация, а данные и QR сохраняют читаемый размер. */
export function ShareTicket({
  path,
  number,
  sport,
  level,
  title,
  rows,
  cover,
  format,
}: {
  path: string;
  number: string;
  sport: string;
  level: string;
  title: string;
  rows: { label: string; value: string }[];
  cover: { src: string; position: string };
  format: ShareFormat;
}) {
  const story = format === "story";
  return (
    <div className="flex size-full flex-col bg-card text-ink">
      <header className="flex h-[100px] shrink-0 items-center justify-between gap-6 border-b-[4px] border-ink bg-ultramarine px-[46px] text-[25px] font-extrabold tracking-[2px] text-lime">
        <span>ДВИЖ · ПОСАДОЧНЫЙ ТАЛОН</span>
        <span className="shrink-0 text-[24px] text-primary-foreground">
          № {number}
        </span>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden border-b-[4px] border-ink bg-sky-soft">
        <img
          src={cover.src}
          alt=""
          style={{ objectPosition: cover.position }}
          className="size-full max-w-none object-cover"
        />
        <div className="absolute top-[38px] right-[42px] left-[42px] flex flex-wrap gap-[16px]">
          {[sport, level].map((label, i) => (
            <span
              key={i}
              className="max-w-full truncate rounded-pill border-[4px] border-ink bg-card px-[28px] py-[12px] text-[31px] leading-tight font-extrabold"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-[28px] px-[46px] pt-[38px] pb-[34px]">
        <h2
          className="line-clamp-3 break-words font-display leading-[1.17] font-extrabold"
          style={{ fontSize: title.length > 65 ? 56 : 66 }}
        >
          {title}
        </h2>
        <div className="flex flex-col gap-[18px]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[122px_minmax(0,1fr)] items-baseline gap-[16px]"
            >
              <span className="text-[24px] font-extrabold tracking-[3px] text-muted-foreground">
                {row.label}
              </span>
              <span className="line-clamp-2 text-[32px] leading-[1.35] font-extrabold">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <footer
          className="flex items-center gap-[25px] border-t-[5px] border-dashed border-ink pt-[26px]"
          style={{ paddingBottom: story ? 24 : 0 }}
        >
          <QrCode
            path={path}
            label="QR-код: страница встречи"
            className="size-[160px] rounded-[12px] border-[3px]"
          />
          <p className="max-w-[440px] text-[31px] leading-[1.3] font-extrabold">
            Наведи камеру —<br />и ты в игре
          </p>
          <span className="ml-auto rounded-pill border-[4px] border-ink bg-lime px-[32px] py-[14px] font-display text-[33px] font-bold">
            движ
          </span>
        </footer>
      </div>
    </div>
  );
}

/** Обложка паспорта. Герб передаётся страницей, чтобы feature не зависела от виджета питомца. */
export function SharePassport({
  path,
  name,
  handle,
  stats,
  emblem,
  mrz,
  format,
}: {
  path: string;
  name: string;
  handle: string;
  stats: { value: string | number; label: string }[];
  emblem: ReactNode;
  mrz: string;
  format: ShareFormat;
}) {
  const story = format === "story";
  return (
    <div className="relative flex size-full overflow-hidden bg-ultramarine text-primary-foreground">
      <div className="relative w-[64px] shrink-0 border-r-[4px] border-ink bg-ink">
        <div className="absolute inset-y-0 right-[16px] border-r-[4px] border-dashed border-lime/70" />
      </div>
      <PassportWaves className="pointer-events-none absolute inset-0 text-lilac/20" />
      <div
        className="relative flex min-w-0 flex-1 flex-col items-center justify-between gap-[28px] px-[52px] pt-[64px] pb-[34px] text-center"
        style={{ paddingTop: story ? 120 : 64, paddingBottom: story ? 70 : 34 }}
      >
        <header className="flex flex-col gap-[12px]">
          <h2 className="text-[34px] font-extrabold tracking-[5px] text-lime">
            ПАСПОРТ СПОРТСМЕНА
          </h2>
          <p className="text-[23px] font-bold tracking-[5px] text-primary-foreground/80">
            SPORT PASSPORT · ДВИЖ
          </p>
        </header>
        <div
          className="relative shrink-0 overflow-hidden rounded-full border-[5px] border-dashed border-lime bg-ink/20 p-[18px]"
          style={{ width: story ? 420 : 350, height: story ? 420 : 350 }}
        >
          <div className="relative size-full overflow-hidden rounded-full border-[4px] border-ink bg-sky-soft">
            {emblem}
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-[18px]">
          <p
            className="line-clamp-2 break-words font-display leading-[1.2] font-extrabold"
            style={{ fontSize: name.length > 36 ? 48 : 61 }}
          >
            {name}
          </p>
          <p className="line-clamp-2 text-[30px] leading-snug font-semibold text-primary-foreground/85">
            {handle}
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-[18px] text-left text-ink">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 flex-col gap-[12px] rounded-[30px] border-[4px] border-ink bg-lime p-[24px]"
            >
              <span className="truncate font-display text-[62px] leading-none font-extrabold">
                {stat.value}
              </span>
              <span className="text-[25px] leading-tight font-extrabold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex w-full items-center gap-[28px] text-left">
          <QrCode
            path={path}
            label="QR-код: профиль спортсмена"
            className="size-[170px] rounded-[16px] border-[4px]"
          />
          <p className="text-[31px] leading-snug font-bold">
            Наведи камеру —<br />
            профиль на Движе
          </p>
        </div>
        <p className="w-full overflow-hidden text-left font-mono text-[22px] whitespace-nowrap tracking-[2px] text-primary-foreground/55">
          {mrz}
        </p>
      </div>
    </div>
  );
}
