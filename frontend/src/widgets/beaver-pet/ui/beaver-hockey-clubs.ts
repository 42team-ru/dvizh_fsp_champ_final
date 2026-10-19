import cska from "./emblems/hockey/cska.svg?raw";
import metallurg from "./emblems/hockey/metallurg.svg?raw";
import lokomotiv from "./emblems/hockey/lokomotiv.svg?raw";
import severstal from "./emblems/hockey/severstal.svg?raw";
import torpedo from "./emblems/hockey/torpedo.svg?raw";
import barys from "./emblems/hockey/barys.svg?raw";
import spartak from "./emblems/hockey/spartak.svg?raw";
import neftekhimik from "./emblems/hockey/neftekhimik.svg?raw";
import sokol from "./emblems/hockey/sokol.svg?raw";

/** Отдельные хоккейные клубы: одинаковые названия с футболом не разделяют эмблемы. */
export const HOCKEY_CLUBS = {
  "hc-cska": { label: "ЦСКА (Москва)", color: "#D42A35", trim: "#FFFFFF", accent: "#174B96", svg: cska, badgeBackground: true },
  "hc-metallurg": { label: "Металлург (Магнитогорск)", color: "#173456", trim: "#FFFFFF", accent: "#D42A35", svg: metallurg, badgeBackground: false },
  "hc-lokomotiv": { label: "Локомотив (Ярославль)", color: "#D42A35", trim: "#FFFFFF", accent: "#173456", svg: lokomotiv, badgeBackground: true },
  "hc-severstal": { label: "Северсталь (Череповец)", color: "#26201D", trim: "#F4C431", accent: "#3B4652", svg: severstal, badgeBackground: false },
  "hc-torpedo": { label: "Торпедо (Нижний Новгород)", color: "#174B96", trim: "#FFFFFF", accent: "#D42A35", svg: torpedo, badgeBackground: false },
  "hc-barys": { label: "Барыс (Астана)", color: "#00A9D6", trim: "#FFFFFF", accent: "#173456", svg: barys, badgeBackground: false },
  "hc-spartak": { label: "Спартак (Москва)", color: "#D42A35", trim: "#FFFFFF", accent: "#D42A35", svg: spartak, badgeBackground: true },
  "hc-neftekhimik": { label: "Нефтехимик (Нижнекамск)", color: "#174B96", trim: "#FFFFFF", accent: "#D42A35", svg: neftekhimik, badgeBackground: false },
  "hc-sokol": { label: "Сокол (Красноярск)", color: "#751B30", trim: "#FFFFFF", accent: "#102E50", svg: sokol, badgeBackground: false },
} as const;

export type HockeyClubId = keyof typeof HOCKEY_CLUBS;
