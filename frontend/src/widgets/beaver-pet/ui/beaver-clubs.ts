import zenit from "./emblems/zenit.svg?raw";
import cska from "./emblems/cska.svg?raw";
import fakel from "./emblems/fakel.svg?raw";
import yenisey from "./emblems/yenisey.svg?raw";
import krasnodar from "./emblems/krasnodar.svg?raw";
import lokomotiv from "./emblems/lokomotiv.svg?raw";
import spartak from "./emblems/spartak.svg?raw";
import rostov from "./emblems/rostov.svg?raw";
import dynamo from "./emblems/dynamo.svg?raw";
import akron from "./emblems/akron.svg?raw";
import beavers from "./emblems/beavers.svg?raw";

/** Цвета одежды маскота и загруженные SVG; источники — в emblems/SOURCES.md. */
export const CLUBS = {
  zenit: { label: "Зенит", color: "#00A9D6", trim: "#FFFFFF", svg: zenit },
  cska: { label: "ЦСКА", color: "#D42A35", trim: "#174B96", svg: cska },
  fakel: { label: "Факел", color: "#174B96", trim: "#FFFFFF", svg: fakel },
  yenisey: { label: "Енисей", color: "#D32A32", trim: "#174B96", svg: yenisey },
  krasnodar: { label: "Краснодар", color: "#166B45", trim: "#26201D", svg: krasnodar },
  lokomotiv: { label: "Локомотив", color: "#13834B", trim: "#D42A35", svg: lokomotiv },
  spartak: { label: "Спартак", color: "#D42A35", trim: "#FFFFFF", svg: spartak },
  rostov: { label: "Ростов", color: "#F4C431", trim: "#174B96", svg: rostov },
  dynamo: { label: "Динамо", color: "#FFFFFF", trim: "#174B96", svg: dynamo },
  akron: { label: "Акрон", color: "#D42A35", trim: "#26201D", svg: akron },
  beavers: { label: "Хищные бобры", color: "#124E83", trim: "#FFFFFF", svg: beavers },
} as const;

export type ClubId = keyof typeof CLUBS;
