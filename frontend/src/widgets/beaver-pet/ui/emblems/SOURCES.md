# Источники клубных SVG

Загружены 19 октября 2026 года. Это готовые векторные эмблемы из источников, а не перерисовки. Права на эмблемы принадлежат соответствующим правообладателям; информация об авторах и условиях использования доступна на страницах источников.

| Клуб | Локальный SVG | Страница источника | Скачанный файл |
|---|---|---|---|
| Зенит | [zenit.svg](zenit.svg) | [Источник](https://en.wikipedia.org/wiki/File:FC_Zenit_Saint_Petersburg_crest.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/e/eb/FC_Zenit_Saint_Petersburg_crest.svg) |
| ЦСКА | [cska.svg](cska.svg) | [Источник](https://pfc-cska.com/ru/press-sluzhba/brandbook/) | [SVG](https://pfc-cska.com/uploads/content/press/poln-vektor.svg) |
| Факел | [fakel.svg](fakel.svg) | [Источник](https://www.footylogos.com/logos/fakel) | [SVG](https://assets.footylogos.com/logos/fakel-logo-footylogos.svg) |
| Енисей | [yenisey.svg](yenisey.svg) | [Источник](https://fr.wikipedia.org/wiki/Fichier:FC_Yenisey_Krasnoyarsk_(logo).svg) | [SVG](https://upload.wikimedia.org/wikipedia/fr/8/80/FC_Yenisey_Krasnoyarsk_(logo).svg) |
| Краснодар | [krasnodar.svg](krasnodar.svg) | [Источник](https://en.wikipedia.org/wiki/File:FC_Krasnodar_logo.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/3/30/FC_Krasnodar_logo.svg) |
| Локомотив | [lokomotiv.svg](lokomotiv.svg) | [Источник](https://en.wikipedia.org/wiki/File:FC_Lokomotiv_Moscow_logo.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/9/93/FC_Lokomotiv_Moscow_logo.svg) |
| Спартак | [spartak.svg](spartak.svg) | [Источник](https://en.wikipedia.org/wiki/File:FC_Spartak_Moscow_crest.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/9/93/FC_Spartak_Moscow_crest.svg) |
| Ростов | [rostov.svg](rostov.svg) | [Источник](https://en.wikipedia.org/wiki/File:FC_Rostov_logo.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/a/a2/FC_Rostov_logo.svg) |
| Динамо Москва | [dynamo.svg](dynamo.svg) | [Источник](https://en.wikipedia.org/wiki/File:Dynamo_Moscow_logo.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/e/e7/Dynamo_Moscow_logo.svg) |
| Акрон | [akron.svg](akron.svg) | [Источник](https://en.wikipedia.org/wiki/File:FC_Akron_Tolyatti_logo.svg) | [SVG](https://upload.wikimedia.org/wikipedia/en/d/de/FC_Akron_Tolyatti_logo.svg) |

Для вставки в маскота удалены фиксированные размеры корневого SVG и служебные данные редакторов. CSS классов перенесён в inline style, идентификаторы получили префиксы `club-<id>-`, ссылки внутри SVG обновлены. Геометрия, цвета и viewBox сохранены; растровых вложений и внешних ресурсов нет. Футболки маскота используют клубные цвета и не претендуют на точную копию игровой формы конкретного сезона.

`beavers.svg` — отдельная ручная векторная перерисовка присланной пользователем эмблемы «ССК ВГУ — Хищные бобры», включая контуры букв.

## Хоккейные клубы

Отдельные исходники в `hockey/`. Футбольные эмблемы одноимённых клубов не используются.

| Клуб | Файл | Источник |
|---|---|---|
| ЦСКА (Москва) | [cska.svg](hockey/cska.svg) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:CSKA_Moscow_logo.svg) |
| Металлург (Магнитогорск) | [metallurg.svg](hockey/metallurg.svg) | [PH4 — векторный архив](https://www.ph4.ru/logo_logo.php?d=hc_met) |
| Локомотив (Ярославль) | [lokomotiv.svg](hockey/lokomotiv.svg) | [Wikipedia](https://en.wikipedia.org/wiki/File:Lokomotiv_Yaroslavl_Logo.svg) |
| Северсталь (Череповец) | [severstal.svg](hockey/severstal.svg) | [Wikipedia](https://en.wikipedia.org/wiki/File:Severstal_Cherepovets_logo.svg) |
| Торпедо (Нижний Новгород) | [torpedo.svg](hockey/torpedo.svg) | [Официальный сайт клуба, SVG](https://hctorpedo.ru/local/templates/torpedo/img/Torpedo-Logo25.svg) |
| Барыс (Астана) | [barys.svg](hockey/barys.svg) | [Официальный сайт клуба, SVG](https://hcbarys.kz/upload/iblock/500/x8ou2u0e60ybvpxamypuygj7253ps2e8/barys_dark.svg) |
| Спартак (Москва) | [spartak.svg](hockey/spartak.svg) | [Wikipedia](https://en.wikipedia.org/wiki/File:HC_Spartak_Moscow_logo.svg) |
| Нефтехимик (Нижнекамск) | [neftekhimik.svg](hockey/neftekhimik.svg) | [Wikipedia](https://en.wikipedia.org/wiki/File:HC_Neftekhimik_Nizhnekamsk_logo.svg) |
| Сокол (Красноярск) | [sokol.svg](hockey/sokol.svg) | [PH4 — векторный архив](https://www.ph4.ru/logo_logo.php?d=hc_sokol) |

«Металлург» и «Сокол» получены из EPS внутри архивов [hc_met.zip](https://www.ph4.ru/DL/LOGO/h/hc_met.zip) и [hc_sokol.zip](https://www.ph4.ru/DL/LOGO/h/hc_sokol.zip): Ghostscript `pdfwrite -dEPSCrop`, затем `pdftocairo -svg`. Геометрия остаётся векторной; растровых вложений нет. Промежуточные EPS/PDF в репозиторий не включены. У остальных клубов загружены готовые SVG. Убран служебный XML, CSS перенесён в атрибуты, id получили префиксы `hc-<club>-`.

## ФСП России

`programming.svg` — пользовательский исходник `ie2r54gnztaos04378al8wxyqbt8hiwe.svg` с логотипом Федерации спортивного программирования России. Цвета и контуры сохранены, фиксированные размеры корневого SVG удалены. Файл не содержит растровых вставок или внешних ресурсов. На футболке логотип расположен в два ряда через два viewport исходного рисунка, сам исходник не перерисован.
