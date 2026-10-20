import { useId, useState, type ReactNode } from "react";
import { QrCode } from "@/shared/components/ui/qr-code";
import { ORGANIZATION_VERIFIED_LABEL } from "@/shared/lib/statuses";
import type { ShareFormat } from "./share-dialog";

/** Экспорт встраивает только изображения с нашего origin; недоступный логотип заменяем буквой. */
function OrganizationLogo({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  let src: string | undefined;
  if (logoUrl && typeof window !== "undefined") {
    try {
      const url = new URL(logoUrl, window.location.origin);
      if (url.origin === window.location.origin) src = url.href;
    } catch {
      // Некорректная ссылка не должна мешать скачиванию афиши.
    }
  }
  return (
    <div className="flex size-[140px] shrink-0 items-center justify-center overflow-hidden rounded-[28px] border-[4px] border-ink bg-card shadow-hard">
      {src && failedUrl !== src ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <span className="font-display text-[82px] font-extrabold">
          {name.trim()[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Лаймовая афиша клуба. В сторис оставляем больше воздуха над данными и под QR. */
export function ShareOrganization({
  path,
  name,
  logoUrl,
  award,
  location,
  sports,
  stats,
  nextMeeting,
  format,
}: {
  path: string;
  name: string;
  logoUrl?: string;
  award?: string;
  location: string;
  sports: string[];
  stats: { value: string | number; label: string }[];
  nextMeeting?: string;
  format: ShareFormat;
}) {
  const story = format === "story";
  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-lime text-ink">
      <PassportWaves className="pointer-events-none absolute inset-0 text-ink/10" />
      <div
        className="relative flex min-h-0 flex-1 flex-col justify-between gap-[22px] px-[48px]"
        style={{
          paddingTop: story ? 140 : 48,
          paddingBottom: story ? 100 : 48,
        }}
      >
        <header className="flex items-center gap-[28px]">
          <OrganizationLogo name={name} logoUrl={logoUrl} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-[14px]">
            {award && (
              <span className="max-w-full rounded-[24px] border-[3px] border-ink bg-ink px-[20px] py-[10px] text-[24px] leading-tight font-extrabold text-lime">
                {award}
              </span>
            )}
            <span className="rounded-pill border-[3px] border-ink bg-card px-[20px] py-[10px] text-[24px] leading-tight font-extrabold">
              ✓ {ORGANIZATION_VERIFIED_LABEL}
            </span>
          </div>
        </header>
        <div className="flex min-w-0 flex-col gap-[20px]">
          <h2
            className="line-clamp-3 font-display leading-[1.17] font-extrabold break-words"
            style={{ fontSize: name.length > 55 ? 54 : 66 }}
          >
            {name}
          </h2>
          {location && (
            <p className="line-clamp-2 text-[30px] leading-snug font-bold break-words">
              {location}
            </p>
          )}
        </div>
        {sports.length > 0 && (
          <div className="flex flex-wrap gap-[12px]">
            {sports.slice(0, 4).map((sport, index) => (
              <span
                key={index}
                className="max-w-full truncate rounded-pill border-[3px] border-ink bg-card px-[24px] py-[10px] text-[27px] leading-tight font-extrabold"
              >
                {sport}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-[18px]">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 flex-col gap-[14px] rounded-[28px] border-[4px] border-ink bg-card p-[24px]"
            >
              <span className="truncate font-display text-[56px] leading-none font-extrabold">
                {stat.value}
              </span>
              <span className="text-[25px] leading-tight font-extrabold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
        {nextMeeting && (
          <p className="rounded-[24px] border-[3px] border-ink bg-card px-[24px] py-[18px] text-[28px] leading-snug font-bold">
            <span className="line-clamp-2 break-words">
              Ближайшая встреча: {nextMeeting}
            </span>
          </p>
        )}
        <footer className="flex items-center gap-[24px] border-t-[4px] border-dashed border-ink pt-[26px]">
          <QrCode
            path={path}
            label="QR-код: страница клуба"
            className="size-[160px] rounded-[16px] border-[4px]"
          />
          <p className="text-[30px] leading-snug font-extrabold whitespace-nowrap">
            Наведи камеру —<br />
            вступай в клуб
          </p>
          <span className="ml-auto rounded-pill border-[4px] border-ink bg-card px-[28px] py-[14px] font-display text-[32px] font-bold">
            движ
          </span>
        </footer>
      </div>
    </div>
  );
}

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
        <span className="min-w-0 truncate whitespace-nowrap">ДВИЖ · ТУСОВОЧНЫЙ ТАЛОН</span>
        <span className="shrink-0 whitespace-nowrap text-[24px] text-primary-foreground">
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
          <p className="max-w-[440px] text-[31px] leading-[1.3] font-extrabold whitespace-nowrap">
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

/** Афиша поста блога: та же сетка, что у билета встречи, — шапка, обложка с плашками, заголовок, строки, QR. */
export function SharePost({
  path,
  kind,
  chips,
  title,
  rows,
  cover,
  format,
}: {
  path: string;
  kind: string;
  chips: string[];
  title: string;
  rows: { label: string; value: string }[];
  cover: { src: string; position: string } | null;
  format: ShareFormat;
}) {
  const story = format === "story";
  return (
    <div className="flex size-full flex-col bg-card text-ink">
      <header className="flex h-[100px] shrink-0 items-center justify-between gap-6 border-b-[4px] border-ink bg-ultramarine px-[46px] text-[25px] font-extrabold tracking-[2px] text-lime">
        <span className="min-w-0 truncate whitespace-nowrap">ДВИЖ · БЛОГ</span>
        <span className="shrink-0 whitespace-nowrap text-[24px] text-primary-foreground uppercase">{kind}</span>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden border-b-[4px] border-ink bg-sky-soft">
        {cover && (
          <img src={cover.src} alt="" style={{ objectPosition: cover.position }} className="size-full max-w-none object-cover" />
        )}
        <div className="absolute top-[38px] right-[42px] left-[42px] flex flex-wrap gap-[16px]">
          {chips.filter(Boolean).map((label, i) => (
            <span key={i}
              className={`max-w-full truncate rounded-pill border-[4px] border-ink px-[28px] py-[12px] text-[31px] leading-tight font-extrabold ${i === 0 ? "bg-lime" : "bg-card"}`}>
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-[28px] px-[46px] pt-[38px] pb-[34px]">
        <h2 className="line-clamp-3 break-words font-display leading-[1.17] font-extrabold"
          style={{ fontSize: title.length > 65 ? 56 : 66 }}>
          {title}
        </h2>
        <div className="flex flex-col gap-[18px]">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[150px_minmax(0,1fr)] items-baseline gap-[16px]">
              <span className="text-[24px] font-extrabold tracking-[3px] text-muted-foreground">{row.label}</span>
              <span className="line-clamp-2 text-[32px] leading-[1.35] font-extrabold">{row.value}</span>
            </div>
          ))}
        </div>
        <footer className="flex items-center gap-[25px] border-t-[5px] border-dashed border-ink pt-[26px]"
          style={{ paddingBottom: story ? 24 : 0 }}>
          <QrCode path={path} label="QR-код: пост в блоге" className="size-[160px] rounded-[12px] border-[3px]" />
          <p className="max-w-[440px] text-[31px] leading-[1.3] font-extrabold whitespace-nowrap">
            Наведи камеру —<br />и читай пост
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
          <p className="text-[31px] leading-snug font-bold whitespace-nowrap">
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
