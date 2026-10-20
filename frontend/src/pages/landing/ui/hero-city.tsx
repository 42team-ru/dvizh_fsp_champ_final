import { LandingBeaver } from "./landing-beaver";
import { Chip } from "./parts";

/** Иллюстрация города: масштабируется целиком вместе с бобром и подписью. */
export function HeroCity() {
  return (
    <figure className="hero-city">
      <img
        src="/landing/s1/city3-cut.png"
        alt="Спортивный город: баскетбол, велосипед и пробежка у реки"
        width={883}
        height={832}
      />
      <div className="hero-city-beaver">
        <LandingBeaver act="wave" outfit={{ hat: "cap" }} />
      </div>
      <figcaption className="hero-city-caption">
        <Chip icon="/landing/s1/icon-pin.svg" className="-rotate-2 bg-lime px-4 py-1.5 text-xs shadow-hard-sm">
          Встречи в 5 минутах от дома
        </Chip>
        <Chip icon="/landing/s1/icon-friends.svg" className="rotate-2 bg-white px-4 py-1.5 text-xs shadow-hard-sm">
          Мяч, велосипед, пробежка — выбирай
        </Chip>
      </figcaption>
    </figure>
  );
}

