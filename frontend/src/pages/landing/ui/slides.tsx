import type * as React from "react";
import { Link } from "react-router";
import { cn } from "cn";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { REGISTER_ORG_URL, REGISTER_URL } from "../model/landing-content";
import { LandingBeaver } from "./landing-beaver";
import { LandingMap } from "./landing-map";
import { HeroCity } from "./hero-city";

import type { BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { Art, At, Gear, Card, Chip, Coin, CtaLink, Initials, Kicker, Layer, Point, Slide, Title } from "./parts";

const A = "/landing";

/* ---------- 01 Герой ---------- */

export function HeroSlide() {
  return (
    <Slide n={1} className="landing-hero bg-ultramarine">
      <div className="hero-layout">
        <div className="hero-copy">
          <Chip className="bg-ink px-3 py-2 text-[11px] text-lime">СПОРТ НАЧИНАЕТСЯ С КОМПАНИИ</Chip>
          <h1 className="hero-title font-display font-extrabold text-white">
            Твой город.<br />Твои люди.<br /><span className="text-lime">Твой движ.</span>
          </h1>
          <p className="hero-description font-medium text-white/90">
            Компания для спорта в пяти минутах от дома. Бегай, играй и пробуй новое с теми, кто рядом.
          </p>
          <div className="hero-actions">
            <CtaLink to={REGISTER_URL} tone="lime" icon={`${A}/s1/icon-arrow.svg`}>Найти компанию</CtaLink>
            <CtaLink to={REGISTER_ORG_URL} tone="outline">Я организатор</CtaLink>
          </div>
        </div>
        <HeroCity />
      </div>
    </Slide>
  );
}
/* ---------- 02 Знакомо ---------- */

const THOUGHTS = [
  { x: 60, y: 270, r: 5, tone: "bg-white", text: "«Не с кем бегать по утрам»" },
  {
    x: 880,
    y: 260,
    r: -4,
    tone: "bg-sun",
    text: "«Где сегодня играют в футбол?»",
  },
  {
    x: 90,
    y: 510,
    r: -3,
    tone: "bg-peach",
    text: "«Боюсь, что не потяну темп»",
  },
  {
    x: 880,
    y: 500,
    r: 4,
    tone: "bg-sky-soft",
    text: "«Все друзья опять заняты»",
  },
];

export function PainSlide() {
  return (
    <Slide n={2} className="bg-paper">
      <Layer speed={1}>
        <Gear shape="stopwatch" x={120} y={112} size={72} r={-12} />
        <Gear shape="football" x={1000} y={480} size={110} />
        <Gear shape="dumbbell" x={1038} y={107} size={84} r={-18} />
      </Layer>
      <Layer speed={0.6}>
        <Blob x={190} y={500} w={900} h={520} className="bg-lavender-soft" />
      </Layer>
      <Layer speed={1} mobile>
        <At x={190} y={120} w={900} anim="up" className="flex flex-col items-center gap-[14px] text-center">
          <Kicker className="text-ultramarine">ЗНАКОМО?</Kicker>
          <Title className="lg:text-[64px] lg:leading-[70px]">Хочется спорта, но…</Title>
        </At>
        <At x={420} y={290} w={440} h={490} anim="scale" d={200} className="w-[240px]">
          <LandingBeaver mood="thinking" act="think" activity="dribble" />
        </At>
      </Layer>
      <Layer speed={1.3} mobile>
        <div className="flex flex-col items-center gap-4 lg:contents">
          {THOUGHTS.map((t, i) => (
            <At key={t.text} x={t.x} y={t.y} r={t.r} anim="pop" d={250 + i * 80}>
              <Card className={cn("w-full rounded-[24px] px-6 py-5 lg:w-[340px]", t.tone)}>
                <p className="font-display text-lg leading-7 font-extrabold text-ink lg:text-[22px] lg:leading-[30px]">
                  {t.text}
                </p>
              </Card>
            </At>
          ))}
          <At x={940} y={715} anim="up" d={700}>
            <Chip
              icon={`${A}/s2/icon-arrow.svg`}
              className="bg-lime px-4 py-2.5 text-base shadow-[4px_4px_0_var(--ink)]"
            >
              Бублик знает, где все
            </Chip>
          </At>
        </div>
      </Layer>
    </Slide>
  );
}

/* ---------- 03 Карта ---------- */

export function MapSlide() {
  return (
    <Slide n={3} className="bg-sky-soft">
      <Layer speed={1}>
        <Gear shape="stopwatch" x={620} y={690} size={64} r={-12} />
        <Gear shape="basketball" x={420} y={610} size={90} />
        <Gear shape="dumbbell" x={448} y={97} size={84} r={-18} />
      </Layer>
      <Layer speed={1} mobile>
        <At x={64} y={150} w={470} className="flex flex-col items-start gap-[18px]">
          <Kicker className="text-ultramarine">КАРТА И ВРЕМЯ</Kicker>
          <Title className="lg:w-[470px]">Всё, что рядом — на карте</Title>
          <Point icon={`${A}/s3/icon-map.svg`}>Выбери спорт — на карте останутся подходящие встречи</Point>
          <Point icon={`${A}/s3/icon-clock.svg`}>Задай время или посмотри, что начнётся скоро</Point>
          <Point icon={`${A}/s3/icon-list.svg`}>Нажми на метку, чтобы узнать о встрече</Point>
          <CtaLink to={REGISTER_URL} tone="blue" icon={`${A}/s3/icon-arrow.svg`}>
            Открыть карту
          </CtaLink>
        </At>
        <At x={580} y={130} w={640} className="relative w-full">
          <LandingMap />
        </At>
      </Layer>
    </Slide>
  );
}
/* ---------- 04 Подборка ---------- */

const REASONS = ["Твой вид спорта", "Рядом с домом", "Вечер — как ты любишь", "Знакомые идут", "Для новичков"];

function EventCard({
  cover,
  coverTone,
  sport,
  time,
  title,
  reasons,
}: {
  cover: React.ReactNode;
  coverTone: string;
  sport: string;
  time: string;
  title: string;
  reasons: string[];
}) {
  return (
    <div className="flex w-[340px] max-w-full flex-col overflow-hidden rounded-[28px] border-3 border-ink bg-white shadow-[8px_8px_0_var(--ink)]">
      <div className={cn("h-[190px] border-b-3 border-ink", coverTone)}>{cover}</div>
      <div className="flex flex-col items-start gap-2.5 px-5 pt-4 pb-5">
        <div className="flex items-center gap-2">
          <Chip className="bg-sky-soft text-xs">{sport}</Chip>
          <span className="text-sm font-extrabold text-ink">{time}</span>
        </div>
        <p className="font-display text-xl leading-[26px] font-extrabold text-ink">{title}</p>
        <div className="flex flex-col items-start gap-1.5">
          {reasons.map((r) => (
            <Chip key={r} icon={`${A}/s4/icon-check-sm.svg`} className="bg-lime-soft py-1 text-xs">
              {r}
            </Chip>
          ))}
        </div>
        <Button
          asChild
          rough={false}
          className="pointer-events-auto h-12 w-full border-[2.5px] text-[15px] shadow-none"
        >
          <Link to={REGISTER_URL}>Записаться</Link>
        </Button>
      </div>
    </div>
  );
}

export function PicksSlide() {
  return (
    <Slide n={4} className="bg-lime">
      <Layer speed={1}>
        <Gear shape="stopwatch" x={996} y={120} size={72} r={-12} />
        <Gear shape="football" x={430} y={620} size={110} />
        <Gear shape="dumbbell" x={1150} y={640} size={84} r={-18} />
      </Layer>
      <Layer speed={0.6}>
        <At x={870} y={190} r={-7} anim="left" d={300}>
          <EventCard
            cover={<LandingBeaver act="cheer" outfit={{ hat: "cyclehelmet" }} className="mx-auto h-full w-[170px]" />}
            coverTone="bg-peach"
            sport="Вело"
            time="Вс 11:00"
            title="Велопрогулка до Удачного"
            reasons={["Твой вид спорта"]}
          />
        </At>
        <At x={560} y={200} r={7} anim="right" d={300}>
          <EventCard
            cover={
              <LandingBeaver
                act="wave"
                outfit={{ shirt: "football" }}
                activity="juggle"
                className="mx-auto h-full w-[170px]"
              />
            }
            coverTone="bg-mint"
            sport="Футбол"
            time="Ср 19:30"
            title="Вечерний футбол 6×6"
            reasons={["Вечер — как ты любишь", "Для новичков"]}
          />
        </At>
      </Layer>
      <Layer speed={1} mobile>
        <At x={64} y={170} w={520} anim="up" className="flex flex-col items-start gap-[22px]">
          <Kicker className="text-ink">ПОДБОРКА «ВАМ ПОДОЙДЁТ»</Kicker>
          <Title className="lg:w-[520px]">Встречи под тебя — и объясним почему</Title>
          <p className="text-[17px] leading-[25px] font-medium text-ink lg:w-[480px]">
            Учитываем виды спорта, уровень, расстояние, удобное время, знакомых и надёжность организатора.
          </p>
          <div className="flex flex-wrap gap-2 lg:w-[500px]">
            {REASONS.map((r, i) => (
              <span key={r} data-anim="pop" style={{ "--d": `${500 + i * 70}ms` } as React.CSSProperties}>
                <Chip icon={`${A}/s4/icon-check.svg`} className="bg-white px-4 py-2 text-sm">
                  {r}
                </Chip>
              </span>
            ))}
            <span
              data-anim="pop"
              style={
                {
                  "--d": `${500 + REASONS.length * 70}ms`,
                } as React.CSSProperties
              }
            >
              <Chip icon={`${A}/s4/icon-check-lime.svg`} className="bg-ink px-4 py-2 text-sm text-lime">
                Попробуй новое
              </Chip>
            </span>
          </div>
          <CtaLink to={REGISTER_URL} tone="blue" icon={`${A}/s3/icon-arrow.svg`}>
            Подобрать встречу
          </CtaLink>
        </At>
        <At x={730} y={120} anim="up" d={200}>
          <EventCard
            cover={<Art src={`${A}/s4/cover-run.jpg`} className="object-contain" />}
            coverTone="bg-sky"
            sport="Бег"
            time="Сб 09:00"
            title="Пробежка вокруг Татышева"
            reasons={["Твой вид спорта", "1,8 км от дома", "Нужны участники"]}
          />
        </At>
      </Layer>
      <Layer speed={1.3}>
        <At x={820} y={700} r={3} anim="up" d={700}>
          <Chip
            icon={`${A}/s4/icon-sparkle.svg`}
            className="bg-ink px-4 py-2.5 text-sm text-lime shadow-[4px_4px_0_var(--white)]"
          >
            ПОПРОБУЙ НОВОЕ · скалолазание
          </Chip>
        </At>
      </Layer>
    </Slide>
  );
}

/* ---------- 05 Бублик ---------- */

const ITEMS = [
  { x: 628, y: 200, r: 8, tone: "bg-white", art: "art-glasses", w: 60, h: 30 },
  { x: 1120, y: 218, r: -8, tone: "bg-sun", art: "art-scarf", w: 60, h: 35 },
  { x: 660, y: 511, r: -6, tone: "bg-peach", art: "art-ball", w: 50, h: 50 },
];
/** Бублик на слайде 5 примеряет вещи из каталога. */
const WARDROBE_LOOKS: BeaverOutfit[] = [
  { hat: "cap" },
  { hat: "cap", eyewear: "roundglasses" },
  { hat: "cap", eyewear: "roundglasses", neck: "scarf" },
  { neck: "scarf", shirt: "running" },
];
const STAMPS = [
  { text: "БЕГ", tone: "border-ultramarine text-ultramarine" },
  { text: "ФУТ", tone: "border-orange text-orange" },
  { text: "ЙОГА", tone: "border-green text-green" },
];

export function PetSlide() {
  return (
    <Slide n={5} className="bg-mint">
      <Layer speed={1}>
        <Gear shape="stopwatch" x={470} y={700} size={72} r={-12} />
        <Gear shape="basketball" x={920} y={110} size={110} />
        <Gear shape="dumbbell" x={563} y={107} size={84} r={-18} />
        <Gear shape="tennis" x={1143} y={513} size={40} r={20} />
        <Gear shape="shuttlecock" x={553} y={633} size={40} r={20} />
      </Layer>
      <Layer speed={0.6}>
        <Blob x={360} y={600} w={1100} h={600} className="bg-lime" />
      </Layer>
      <Layer speed={1} mobile>
        <At x={64} y={150} w={520} anim="up" className="flex flex-col items-start gap-[18px]">
          <Kicker className="text-ink">БОБР-КОМПАНЬОН</Kicker>
          <Title className="lg:w-[520px]">Бобр, который радуется вместе с тобой</Title>
          <Point icon={`${A}/s5/icon-shirt.svg`}>Одевай из каталога: кепки, шарфы, мячи</Point>
          <Point icon={`${A}/s5/icon-coin.svg`}>Монеты за каждую встречу — бобр растёт в уровне</Point>
          <Point icon={`${A}/s5/icon-stamp.svg`}>Паспорт со штампами за посещения</Point>
          <Point icon={`${A}/s6/icon-trophy.svg`}>Достижения открывают эксклюзивные вещи</Point>
          <Point icon={`${A}/s4/icon-sparkle.svg`}>Настроение бобра зависит от твоих встреч</Point>
        </At>
        <At x={700} y={180} w={430} h={470} anim="scale" d={150} className="relative w-[260px]">
          <LandingBeaver act="cheer" looks={WARDROBE_LOOKS} />
        </At>
      </Layer>
      <Layer speed={1.3}>
        {ITEMS.map((it, i) => (
          <At key={it.art} x={it.x} y={it.y} r={it.r} anim="pop" d={300 + i * 120}>
            <span
              className={cn(
                "grid size-[86px] place-items-center rounded-[22px] border-[2.5px] border-ink shadow-[4px_4px_0_var(--ink)]",
                it.tone,
              )}
            >
              <img src={`${A}/s5/${it.art}.svg`} alt="" style={{ width: it.w, height: it.h }} />
            </span>
          </At>
        ))}
        <At x={1030} y={425} r={-4} anim="right" d={400}>
          <Card className="flex w-[210px] flex-col gap-1.5 px-[14px] py-3">
            <div className="flex items-center gap-2">
              <Chip className="bg-lime text-[11px]">Уровень 4</Chip>
              <span className="text-xs font-extrabold text-ink">120 монет</span>
            </div>
            <Kicker className="text-ultramarine">ЭНЕРГИЯ</Kicker>
            <div className="flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-3 w-[22px] rounded-[4px] border-[1.5px] border-ink",
                    i < 3 ? "bg-ultramarine" : "bg-white",
                  )}
                />
              ))}
            </div>
            <p className="text-[11px] font-bold text-ink-muted">3 встречи за неделю</p>
          </Card>
        </At>
        <At x={871} y={640} r={5} anim="up" d={550}>
          <Card className="flex w-[200px] flex-col gap-2 rounded-[18px] bg-cream-warm px-[14px] py-3">
            <Kicker className="text-ultramarine">ОТМЕТКИ О ПОСЕЩЕНИИ</Kicker>
            <div className="flex gap-1.5">
              {STAMPS.map((s) => (
                <span
                  key={s.text}
                  className={cn(
                    "grid size-[52px] place-items-center rounded-pill border-3 border-dashed font-display text-[10px] font-extrabold",
                    s.tone,
                  )}
                >
                  {s.text}
                </span>
              ))}
            </div>
          </Card>
        </At>
        <At x={1180} y={120} anim="pop" d={900}>
          <Coin icon={`${A}/s5/icon-coin-lg.svg`} />
        </At>
        <At x={600} y={408} r={-15} anim="pop" d={1000}>
          <Coin icon={`${A}/s5/icon-coin-lg.svg`} />
        </At>
      </Layer>
    </Slide>
  );
}

/* ---------- 06 Организаторам ---------- */

const REQUESTS = [
  {
    initials: "ОК",
    tone: "bg-sky",
    name: "Ольга К.",
    note: "«Играю два года»",
  },
  {
    initials: "ИП",
    tone: "bg-sun",
    name: "Игорь П.",
    note: "«Буду по средам»",
  },
  {
    initials: "АС",
    tone: "bg-salmon",
    name: "Анна С.",
    note: "«Я новичок, можно?»",
  },
];
const WEEK = [
  { day: "ВТ", time: "19:00", tone: "bg-lime-soft" },
  { day: "СР", time: "19:30", tone: "bg-mint-pale" },
  { day: "ЧТ", time: "—", tone: "bg-paper" },
  { day: "СБ", time: "09:00", tone: "bg-sky-soft" },
  { day: "ВС", time: "11:00", tone: "bg-lime-soft" },
];

export function OrganizersSlide() {
  return (
    <Slide n={6} className="bg-ink">
      <Layer speed={1}>
        <Gear shape="stopwatch" x={91} y={564} size={72} r={-12} />
        <Gear shape="football" x={500} y={420} size={90} />
        <Gear shape="dumbbell" x={588} y={107} size={84} r={-18} />
        <Gear shape="tennis" x={1153} y={113} size={40} r={20} />
        <Gear shape="shuttlecock" x={593} y={653} size={40} r={20} />
      </Layer>
      <Layer speed={0.6}>
        <At x={620} y={130} r={4} anim="left" d={200}>
          <Card className="flex w-[380px] flex-col gap-3 rounded-[26px] px-5 py-5 shadow-[6px_6px_0_var(--ultramarine)]">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-extrabold text-ink">Заявки</p>
              <Chip className="bg-peach py-1 text-xs">5 ждут</Chip>
            </div>
            {REQUESTS.map((r) => (
              <div key={r.name} className="flex items-center gap-3 rounded-[16px] bg-paper px-3 py-2.5">
                <Initials tone={r.tone} className="size-10 text-xs">
                  {r.initials}
                </Initials>
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold text-ink">{r.name}</p>
                  <p className="text-xs font-medium text-ink-muted">{r.note}</p>
                </div>
                <span className="grid size-[34px] place-items-center rounded-pill border-2 border-ink bg-lime">
                  <img src={`${A}/s6/icon-ok.svg`} alt="" className="size-3.5" />
                </span>
                <span className="grid size-[34px] place-items-center rounded-pill border-2 border-ink bg-white">
                  <img src={`${A}/s6/icon-no.svg`} alt="" className="size-3" />
                </span>
              </div>
            ))}
          </Card>
        </At>
        <At x={640} y={510} r={-3} anim="up" d={350}>
          <Card className="flex w-[480px] flex-col gap-3 rounded-[24px] px-5 py-4 shadow-[6px_6px_0_var(--ultramarine)]">
            <Kicker className="text-ultramarine">НЕДЕЛЯ КЛУБА</Kicker>
            <div className="flex gap-1.5">
              {WEEK.map((d) => (
                <div
                  key={d.day}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-[14px] border-2 border-ink py-2.5",
                    d.tone,
                  )}
                >
                  <span className="text-xs font-extrabold text-ink-muted">{d.day}</span>
                  <span className="font-display text-base font-extrabold text-ink">{d.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </At>
      </Layer>
      <Layer speed={1} mobile>
        <At x={64} y={150} w={520} anim="up" className="flex flex-col items-start gap-[18px]">
          <Kicker className="text-lime">ДЛЯ КЛУБОВ И ОРГАНИЗАТОРОВ</Kicker>
          <Title className="text-white lg:w-[520px] lg:text-[56px] lg:leading-[60px]">Собирай группу без хаоса</Title>
          <Point icon={`${A}/s6/icon-users.svg`} box="bg-lime" className="text-white">
            Заявки и лист ожидания — в одном месте
          </Point>
          <Point icon={`${A}/s6/icon-check.svg`} box="bg-lime" className="text-white">
            Кворум: занятие состоится, если набралось
          </Point>
          <Point icon={`${A}/s6/icon-shield.svg`} box="bg-lime" className="text-white">
            Проверка клуба и страница организации
          </Point>
          <div className="flex flex-wrap gap-3">
            <CtaLink to={REGISTER_ORG_URL} tone="lime" shadow="accent">
              Стать организатором
            </CtaLink>
            <ReviewDialog />
          </div>
        </At>
        <At x={990} y={150} r={-5} anim="pop" d={450}>
          <div className="flex w-[230px] flex-col items-center gap-2 rounded-[26px] border-[2.5px] border-ink bg-lime p-5 shadow-[6px_6px_0_var(--ultramarine)]">
            <Kicker className="text-ink">КВОРУМ</Kicker>
            <div className="relative size-[130px]">
              <img src={`${A}/s6/quorum-ring.svg`} alt="" className="size-full" />
              <span className="absolute inset-0 grid place-items-center font-display text-[28px] font-extrabold text-ink">
                6/6
              </span>
            </div>
            <p className="text-[15px] font-extrabold text-ink">Состоится!</p>
          </div>
        </At>
      </Layer>
      <Layer speed={1.3}>
        <At x={950} y={440} r={6} anim="right" d={600}>
          <span className="flex items-center gap-2.5 rounded-pill border-[2.5px] border-ink bg-sun py-2.5 pr-4 pl-2.5 shadow-[4px_4px_0_var(--ultramarine)]">
            <span className="grid size-10 place-items-center rounded-pill border-2 border-ink bg-white">
              <img src={`${A}/s6/icon-trophy.svg`} alt="" className="size-[22px]" />
            </span>
            <span className="text-[15px] font-extrabold text-ink">Организация месяца</span>
          </span>
        </At>
        <At x={1050} y={560} w={170} h={190} r={-4} anim="up" d={500}>
          <LandingBeaver act="wave" outfit={{ neck: "whistle", hat: "cap" }} />
        </At>
      </Layer>
    </Slide>
  );
}

/** «Как проверяют»: коротко о допуске организации (правила 2–3а). */
function ReviewDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          rough={false}
          variant="clear"
          className="pointer-events-auto h-[60px] border-[2.5px] border-white px-[30px] text-[17px]"
        >
          Как проверяют
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Как проверяют клуб</DialogTitle>
          <DialogDescription>Один раз — и дальше публикуете встречи сразу.</DialogDescription>
        </DialogHeader>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base leading-6 text-ink">
          <li>Регистрируете аккаунт организации и заполняете анкету: название, описание, контакты, виды спорта.</li>
          <li>Администратор проверяет анкету и одобряет её, отклоняет с причиной или возвращает на доработку.</li>
          <li>После одобрения у клуба появляется публичная страница, а встречи публикуются без повторной модерации.</li>
        </ol>
        <CtaLink to={REGISTER_ORG_URL} tone="lime" className="h-12 self-start text-[15px]">
          Подать заявку
        </CtaLink>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 07 Как это работает ---------- */

const STEPS = [
  {
    n: 1,
    x: 40,
    y: 300,
    r: 3,
    color: "text-ultramarine",
    box: "bg-ultramarine",
    shadow: "shadow-[6px_6px_0_var(--ultramarine)]",
    icon: "icon-search",
    title: "Выбери спорт и время",
    text: "Подборка учтёт уровень, дни и расстояние от дома.",
  },
  {
    n: 2,
    x: 430,
    y: 340,
    r: -2,
    color: "text-orange",
    box: "bg-orange",
    shadow: "shadow-[6px_6px_0_var(--orange)]",
    icon: "icon-tap",
    title: "Запишись в один тап",
    text: "Если запись по заявке — организатор подтвердит.",
  },
  {
    n: 3,
    x: 820,
    y: 300,
    r: 2,
    color: "text-ink",
    box: "bg-lime",
    shadow: "shadow-[6px_6px_0_var(--lime)]",
    icon: "icon-check",
    title: "Приходи и собирай штампы",
    text: "За каждую встречу — монеты бобру и отметка в паспорте.",
  },
];

export function HowSlide() {
  return (
    <Slide n={7} className="bg-peach">
      <Layer speed={1}>
        <Gear shape="stopwatch" x={112} y={104} size={72} r={-12} />
        <Gear shape="basketball" x={40} y={650} size={100} />
        <Gear shape="dumbbell" x={1058} y={110} size={84} r={-18} />
      </Layer>
      <Layer speed={0.6}>
        <At x={140} y={330} w={1000} h={160} anim="draw" d={200}>
          <Art src={`${A}/s7/path.svg`} />
        </At>
      </Layer>
      <Layer speed={1} mobile>
        <At x={140} y={120} w={1000} anim="up" className="flex flex-col items-center gap-3 text-center">
          <Kicker className="text-ultramarine">КАК ЭТО РАБОТАЕТ</Kicker>
          <Title className="lg:text-[56px] lg:leading-[60px]">Три шага до первой тренировки</Title>
        </At>
        {STEPS.map((s, i) => (
          <At key={s.n} x={s.x} y={s.y} r={s.r} anim="up" d={500 + i * 300}>
            <div
              className={cn(
                "flex w-full flex-col gap-4 rounded-[30px] border-3 border-ink bg-white p-7 lg:min-h-[300px] lg:w-[360px]",
                s.shadow,
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("font-display text-[88px] leading-none font-extrabold", s.color)}>{s.n}</span>
                <span className={cn("grid size-16 place-items-center rounded-[18px] border-[2.5px] border-ink", s.box)}>
                  <img src={`${A}/s7/${s.icon}.svg`} alt="" className="size-7" />
                </span>
              </div>
              <p className="font-display text-[26px] leading-8 font-extrabold text-ink">{s.title}</p>
              <p className="text-base leading-6 font-medium text-ink-muted">{s.text}</p>
            </div>
          </At>
        ))}
      </Layer>
      <Layer speed={1.3}>
        <At x={1110} y={620} w={150} h={170} r={-6} anim="up" d={900}>
          <LandingBeaver mood="thinking" act="think" />
        </At>
        <At x={460} y={690} anim="up" d={1000}>
          <CtaLink to={REGISTER_URL} tone="blue" icon={`${A}/s3/icon-arrow.svg`}>
            Начать — это бесплатно
          </CtaLink>
        </At>
        <At x={850} y={700} r={3} anim="up" d={1100}>
          <Chip icon={`${A}/s7/icon-coin.svg`} className="bg-lime px-4 py-2 text-sm shadow-[4px_4px_0_var(--ink)]">
            за встречи — монеты бобру
          </Chip>
        </At>
      </Layer>
    </Slide>
  );
}

/* ---------- 08 Финал ---------- */

/** Облака в небе финального слайда: x, y, ширина. */
const CLOUDS: [number, number, number][] = [
  [20, 120, 150],
  [1090, 110, 140],
  [120, 440, 120],
  [1010, 440, 130],
];

export function FinalSlide({ onNavigate }: { onNavigate: (n: number) => void }) {
  return (
    <Slide n={8} className="bg-gradient-to-b from-sky to-sky-soft">
      <Layer speed={1}>
        <At
          x={1100}
          y={250}
          w={90}
          h={90}
          className="rounded-pill border-3 border-ink bg-sun shadow-[5px_5px_0_var(--ink)]"
        />
        {CLOUDS.map(([x, y, w]) => (
          <At key={`${x}-${y}`} x={x} y={y} w={w} h={w * 0.38}>
            <span className="block size-full rounded-pill border-[2.5px] border-ink bg-white shadow-[4px_4px_0_var(--ink)]" />
          </At>
        ))}
        <Gear shape="football" x={250} y={640} size={56} />
        <Gear shape="tennis" x={780} y={660} size={40} r={20} />
      </Layer>
      {/* трава в одном слое с Бубликом: он стоит на ней и при прокрутке */}
      <Layer speed={1}>
        <Blob x={-160} y={690} w={1600} h={620} className="bg-lime" />
      </Layer>
      <Layer speed={1} mobile>
        <At x={190} y={110} w={900} anim="up" className="flex flex-col items-center gap-[18px] text-center">
          <Chip className="bg-ink px-3 py-1.5 text-[11px] text-lime">ДЛЯ ВСЕХ, КТО ХОЧЕТ ДВИГАТЬСЯ</Chip>
          <Title className="text-[38px] leading-[44px] lg:w-[900px] lg:text-[76px] lg:leading-[82px]">
            Бублик уже ждёт тебя
          </Title>
          <p className="text-base leading-6 font-medium text-ink lg:w-[700px] lg:text-[19px] lg:leading-[27px]">
            Создай аккаунт за минуту — а он подберёт первую встречу рядом.
          </p>
          <div className="flex flex-wrap justify-center gap-[14px]">
            <CtaLink to={REGISTER_URL} tone="lime" icon={`${A}/s8/icon-arrow.svg`}>
              Создать аккаунт
            </CtaLink>
            <CtaLink
              to={REGISTER_ORG_URL}
              tone="outline"
              className="border-ink bg-white text-ink shadow-[5px_5px_0_var(--ink)]"
            >
              Я организатор
            </CtaLink>
          </div>
        </At>
        {/* лапы Бублика стоят на линии травы (верх холма y=690) */}
        <At x={520} y={492} w={240} h={250} anim="up" d={300} className="relative w-[200px]">
          <LandingBeaver act="wave" outfit={{ hat: "cap" }} />
        </At>
        <At x={840} y={492} w={350} className="w-full">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <Initials tone="bg-sky" className="size-10 text-xs">ОК</Initials>
                <Initials tone="bg-sun" className="size-10 text-xs">МР</Initials>
                <Initials tone="bg-mint" className="size-10 text-xs">ДВ</Initials>
              </div>
              <Kicker className="text-ultramarine">ТВОЯ КОМПАНИЯ РЯДОМ</Kicker>
            </div>
            <p className="font-display text-xl leading-7 font-extrabold">Всё начинается<br />с «пойдём»</p>
            <p className="text-sm leading-5 text-ink-muted">Выбери занятие по душе — и познакомься со своими людьми.</p>
            <div className="flex flex-wrap gap-2">
              <Chip className="bg-sky-soft px-3 py-1 text-xs">Бег</Chip>
              <Chip className="bg-lime-soft px-3 py-1 text-xs">Футбол</Chip>
              <Chip className="bg-peach px-3 py-1 text-xs">Йога</Chip>
            </div>
          </Card>
        </At>
        <At x={800} y={748} w={400}>
          <nav aria-label="Подвал" className="flex gap-6 text-xs font-extrabold whitespace-nowrap text-ink">
            <button type="button" onClick={() => onNavigate(1)} className="pointer-events-auto hover:underline">
              О проекте
            </button>
            <button type="button" onClick={() => onNavigate(6)} className="pointer-events-auto hover:underline">
              Организаторам
            </button>
            <span>Поддержка</span>
            <span>© 2026</span>
          </nav>
        </At>
      </Layer>
      <Layer speed={1.3}>
        <At x={360} y={540} r={10} anim="pop" d={600}>
          <Coin icon={`${A}/s8/icon-coin.svg`} size={56} />
        </At>
        <At x={1180} y={413} r={-10} anim="pop" d={700}>
          <Coin icon={`${A}/s8/icon-coin.svg`} size={56} />
        </At>
      </Layer>
    </Slide>
  );
}

/** Большой холм-капсула с обводкой (средний слой). */
function Blob({ x, y, w, h, className }: { x: number; y: number; w: number; h: number; className: string }) {
  return <At x={x} y={y} w={w} h={h} className={cn("max-w-none rounded-pill border-3 border-ink", className)} />;
}
