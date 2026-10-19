/** Наши плоские декорации: тот же контур и палитра, что у одежды. Координаты корневого SVG. */
const line = 'stroke="#241510" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
const sun = (fill = "#F4C431") => `<circle cx="375" cy="-3" r="33" fill="${fill}" ${line}/>
  <path d="M375 -51 V-44 M423 -3 H416 M341 -37 L346 -32 M409 -37 L404 -32" fill="none" ${line}/>
  <path d="M358 -15 Q362 -24 372 -25" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.5"/>`;
const cloud = `<path d="M35 20 Q22 -5 44 -14 Q59 -45 83 -18 Q116 -25 122 1 Q140 24 109 26 H48 Q31 27 35 20 Z" fill="#FFFDF9" ${line}/>`;
const tree = (x: number, y: number, snow = false) => `<g transform="translate(${x} ${y})">
  <path d="M0 0 V100" fill="none" ${line}/>
  <path d="M0 -52 L-34 0 H-22 L-44 36 H44 L22 0 H34 Z" fill="${snow ? "#F4EBDD" : "#3FA45B"}" ${line}/>
</g>`;
const frame = (color: string, scene: string) => `
  <defs><clipPath id="backdrop-clip"><rect x="-7" y="-72" width="484" height="484" rx="28"/></clipPath></defs>
  <g clip-path="url(#backdrop-clip)">
    <rect x="-10" y="-75" width="490" height="490" fill="${color}"/>${scene}
  </g>
  <rect x="-7" y="-72" width="484" height="484" rx="28" fill="none" ${line}/>`;

export const BACKGROUND_VIEWBOX = "-10 -75 490 490";
export const BEAVER_VIEWBOX = "-10 -20 490 435";

export const BACKGROUNDS = {
  meadow: () => frame("#8FD3F4", `${sun()}${cloud}
    <path d="M-10 320 Q110 266 242 321 Q375 282 480 308 V415 H-10 Z" fill="#9BCB75" ${line}/>
    <path d="M15 363 L25 344 L35 363 M393 360 L403 341 L413 360" fill="none" ${line}/>`),
  stadium: () => frame("#8FD3F4", `${sun()}${cloud}
    <path d="M-10 175 H480 V270 H-10 Z" fill="#F4EBDD" ${line}/>
    <path d="M-10 200 H480 M-10 224 H480 M-10 248 H480" fill="none" stroke="#E7A33E" stroke-width="10"/>
    <path d="M-10 280 H480 V415 H-10 Z" fill="#3FA45B" ${line}/>
    <path d="M15 302 H455 L470 398 H0 Z M235 302 V398 M-2 350 H472" fill="none" stroke="#F4EBDD" stroke-width="5"/>
    <ellipse cx="235" cy="350" rx="53" ry="25" fill="none" stroke="#F4EBDD" stroke-width="5"/>`),
  rink: () => frame("#9384C6", `
    <path d="M25 -35 H145 V75 H25 Z M325 -35 H445 V75 H325 Z" fill="#F4EBDD" ${line}/>
    <path d="M85 -35 V75 M385 -35 V75" fill="none" ${line}/>
    <path d="M-10 223 H480 V284 H-10 Z" fill="#F4EBDD" ${line}/>
    <path d="M-10 236 H480" stroke="#D8402F" stroke-width="9"/>
    <path d="M-10 284 H480 V415 H-10 Z" fill="#C7E8F6" ${line}/>
    <path d="M-10 351 H480" stroke="#D8402F" stroke-width="5"/>
    <ellipse cx="235" cy="352" rx="65" ry="32" fill="none" stroke="#1F7FD0" stroke-width="5"/>
    <path d="M17 316 L59 310 M395 386 L446 379" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>`),
  river: () => frame("#F4EBDD", `${sun("#E7A33E")}${cloud}
    <path d="M-10 240 Q110 213 235 243 Q367 211 480 238 V340 H-10 Z" fill="#8FD3F4" ${line}/>
    <path d="M6 277 H76 M363 288 H435 M17 310 H103" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
    <path d="M-10 340 H480 V415 H-10 Z" fill="#E7A33E" ${line}/>
    <path d="M-10 311 H480 M15 312 V352 M90 312 V352 M390 312 V352 M465 312 V352" fill="none" ${line}/>`),
  snowpark: () => frame("#C7E8F6", `${sun("#F4EBDD")}
    ${tree(35, 210, true)}${tree(418, 172, true)}
    <path d="M-10 314 Q113 279 235 319 Q358 290 480 316 V415 H-10 Z" fill="#FFFDF9" ${line}/>
    <path d="M30 28 H46 M38 20 V36 M325 110 H341 M333 102 V118 M433 62 H449 M441 54 V70" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
    <path d="M32 378 L69 369 M382 353 L420 346" fill="none" stroke="#8FD3F4" stroke-width="5" stroke-linecap="round"/>`),
  gym: () => frame("#F4EBDD", `
    <rect x="324" y="-26" width="119" height="121" rx="12" fill="#8FD3F4" ${line}/>
    <path d="M383 -26 V95 M324 34 H443" fill="none" ${line}/>
    <path d="M23 66 V282 M84 66 V282 M23 90 H84 M23 123 H84 M23 156 H84 M23 189 H84 M23 222 H84 M23 255 H84" fill="none" stroke="#93552C" stroke-width="8" stroke-linecap="round"/>
    <path d="M-10 307 H480 V415 H-10 Z" fill="#E7A33E" ${line}/>
    <path d="M-10 349 H480 M-10 392 H480 M15 307 L-10 415 M455 307 L480 415" fill="none" stroke="#93552C" stroke-width="5"/>`),
  sunset: () => frame("#E9B6A2", `
    <circle cx="344" cy="97" r="72" fill="#E7A33E" ${line}/>
    <path d="M14 -31 L30 -2 H-2 Z M400 230 L416 259 H384 Z" fill="#9384C6" ${line}/>
    <path d="M-10 289 Q126 235 249 294 Q376 256 480 288 V415 H-10 Z" fill="#9384C6" ${line}/>
    <path d="M-10 345 Q235 312 480 345 V415 H-10 Z" fill="#F4EBDD" ${line}/>
    <path d="M28 70 Q39 54 50 70 Q61 86 72 70" fill="none" ${line}/>`),
  nightcity: () => frame("#1E2B3C", `
    <path d="M367 -34 Q337 14 389 23 Q342 45 330 3 Q319 -29 367 -34 Z" fill="#F4EBDD" ${line}/>
    <path d="M35 -31 V-15 M27 -23 H43 M270 34 V50 M262 42 H278" stroke="#F4C431" stroke-width="5" stroke-linecap="round"/>
    <path d="M-10 285 V125 H52 V187 H96 V103 H143 V285 M331 285 V143 H386 V199 H427 V108 H480 V285" fill="#3B4652" ${line}/>
    <path d="M10 152 H30 M108 130 H126 M108 162 H126 M346 170 H369 M442 138 H462 M442 171 H462" stroke="#F4C431" stroke-width="8"/>
    <path d="M-10 309 H480 V415 H-10 Z" fill="#9384C6" ${line}/>
    <path d="M4 366 H49 M409 366 H454" stroke="#F4EBDD" stroke-width="7" stroke-linecap="round"/>`),
} as const;

export type BackgroundId = keyof typeof BACKGROUNDS;
