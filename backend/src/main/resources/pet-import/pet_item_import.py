#!/usr/bin/env python3
"""
Импорт вещи бобра для админки: PNG или SVG → безопасный SVG из одних <path> + параметры посадки на тело.

Запуск (бэкенд, PetArtImporter):  python pet_item_import.py --part HEAD --input item.png
Ответ — JSON в stdout: {"svg", "width", "height", "x", "y", "scale", "paths"}.
Ошибка для человека — текст в stderr, код выхода 2. Любой другой код — сбой скрипта.

Что делает:
1. PNG: однотонный фон заливкой от углов делает прозрачным, обрезает пустые края, уменьшает
   до 400 px и векторизует (vtracer) в цветной SVG.
2. SVG (и результат шага 1): разбирает svgelements, применяет все transform, выбрасывает всё,
   кроме контуров (скрипты, ссылки, растровые вставки, текст, фильтры), и пересобирает разметку
   заново: только <path d fill stroke ...> с плоскими цветами. Поэтому вывод безопасно вставлять в страницу.
3. Сдвигает рисунок в (0, 0) и считает translate(x y) scale(s), который вписывает его в рамку
   выбранной части тела. Рамки — в пространстве рисунка бобра (docs/beaver-pet.md, «Система координат»).
"""
import argparse
import io
import json
import re
import sys

# Часть тела → рамка (x, y, ширина, высота) в координатах рисунка бобра и прижатие по вертикали.
# Рисунок вписывается целиком, с сохранением пропорций, по центру по горизонтали.
BOXES = {
    # Шапка: макушка y≈32, брови y≈107. Низ вещи ложится на лоб, верх может уходить выше головы.
    "HEAD": (55, -40, 265, 140, "bottom"),
    # Очки: глаза (110, 159) и (263, 159).
    "EYES": (70, 120, 235, 80, "center"),
    # На шее: подбородок y≈290, вещь свисает вниз.
    "NECK": (125, 285, 125, 115, "top"),
    # На груди (принт, эмблема): животик x 116…265, y 304…464.
    "CHEST": (120, 320, 135, 120, "center"),
    # Низ: от пояса к стопам.
    "LEGS": (75, 430, 225, 75, "top"),
    # В правой лапе: кисть ≈ (320, 425), слот поворачивается вместе с лапой.
    "PAW": (285, 360, 100, 110, "center"),
    # Рядом на земле справа от бобра: земля y = 524.
    "GROUND": (410, 380, 150, 144, "bottom"),
}

MAX_INPUT_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 25_000_000
RASTER_SIDE = 400
MAX_PATHS = 1500
MAX_SVG_CHARS = 400_000

NUMBER = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


class UserError(Exception):
    """Понятная админу причина отказа: уходит в detail ответа 400."""


def fmt(value):
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def detect(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    head = data[:4096].lstrip(b"\xef\xbb\xbf \t\r\n").lower()
    if head.startswith(b"<") and b"<svg" in data[:65536].lower():
        return "svg"
    raise UserError("Нужен файл PNG или SVG")


def png_to_svg(data):
    from PIL import Image, ImageDraw
    if sys.version_info >= (3, 14):
        raise RuntimeError("vtracer 0.6.15 crashes on Python 3.14+: run this script with Python 3.13")
    import vtracer

    try:
        image = Image.open(io.BytesIO(data))
        if image.width * image.height > MAX_PIXELS:
            raise UserError("Слишком большая картинка: не больше 25 мегапикселей")
        image.load()
    except UserError:
        raise
    except Exception:
        raise UserError("Не удалось прочитать PNG")
    image = image.convert("RGBA")

    # Непрозрачная картинка: однотонный фон от углов делаем прозрачным.
    if image.getchannel("A").getextrema()[0] == 255:
        w, h = image.size
        for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
            if image.getpixel(corner)[3] == 255:
                ImageDraw.floodfill(image, corner, (0, 0, 0, 0), thresh=40)

    # Полупрозрачный ореол по краю даёт грязную кайму — режем по порогу.
    alpha = image.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    image.putalpha(alpha)
    box = alpha.getbbox()
    if box is None:
        raise UserError("На картинке ничего нет: она целиком прозрачная или одного цвета")
    image = image.crop(box)
    image.thumbnail((RASTER_SIDE, RASTER_SIDE), Image.Resampling.LANCZOS)
    image.putalpha(image.getchannel("A").point(lambda a: 255 if a >= 128 else 0))

    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return vtracer.convert_raw_image_to_svg(
        buffer.getvalue(), img_format="png", colormode="color", hierarchical="stacked", mode="spline",
        filter_speckle=6, color_precision=6, layer_difference=20, corner_threshold=60,
        length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=2,
    ).encode("utf-8")


def gradient_colors(data):
    """id градиента → цвет его первой остановки: градиент заменяется плоским цветом."""
    from xml.etree import ElementTree

    colors = {}
    for element in ElementTree.fromstring(data).iter():
        if element.tag.rsplit("}", 1)[-1] not in ("linearGradient", "radialGradient") or "id" not in element.attrib:
            continue
        for stop in element:
            style = dict(part.split(":", 1) for part in stop.get("style", "").split(";") if ":" in part)
            stop_color = stop.get("stop-color") or style.get("stop-color")
            if stop_color:
                colors[element.get("id")] = stop_color.strip()
                break
    return colors


def paint(element, name, gradients):
    """Заливка или обводка элемента; ссылка url(#id) на градиент — цвет его первой остановки."""
    from svgelements import Color

    raw = (element.values.get(name) or "").strip()
    own_opacity = float(element.values.get("opacity", 1) or 1)
    if raw.startswith("url("):
        stop = gradients.get(raw[4:].split(")", 1)[0].strip(" '\"#"))
        if stop is None:
            return None, 0.0
        return color(Color(stop))[0], float(element.values.get(name + "-opacity", 1) or 1) * own_opacity
    hex_color, opacity = color(getattr(element, name))
    return hex_color, opacity * own_opacity


def color(value):
    """Плоский цвет #rrggbb и непрозрачность; всё остальное — None."""
    if value is None or getattr(value, "value", None) is None:
        return None, 0.0
    try:
        return value.hexrgb.upper(), value.opacity
    except Exception:
        return None, 0.0


def shapes_from_svg(data):
    from svgelements import SVG, Path, Shape

    lowered = data[:65536].lower()
    if b"<!doctype" in lowered or b"<!entity" in lowered:
        raise UserError("SVG с DOCTYPE и сущностями не принимаем: сохраните файл заново без них")
    try:
        gradients = gradient_colors(data)
        document = SVG.parse(io.BytesIO(data), reify=True)
    except Exception:
        raise UserError("Не удалось разобрать SVG")

    shapes = []
    for element in document.elements():
        if not isinstance(element, Shape) or element.values.get("visibility") == "hidden" \
                or element.values.get("display") == "none":
            continue
        path = element if isinstance(element, Path) else Path(element)
        path.reify()
        if len(path) == 0:
            continue
        fill, fill_opacity = paint(element, "fill", gradients)
        stroke, stroke_opacity = paint(element, "stroke", gradients)
        width = float(getattr(element, "implicit_stroke_width", None) or element.stroke_width or 0)
        if stroke is None or width <= 0 or stroke_opacity <= 0:
            stroke, width = None, 0.0
        if fill is not None and fill_opacity <= 0:
            fill = None
        if fill is None and stroke is None:
            continue
        bbox = path.bbox()
        if bbox is None:
            continue
        pad = width / 2
        shapes.append({
            "path": path,
            "bbox": (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad),
            "fill": fill,
            "fill_opacity": fill_opacity,
            "stroke": stroke,
            "stroke_opacity": stroke_opacity,
            "width": width,
            "evenodd": element.values.get("fill-rule") == "evenodd",
        })
    if not shapes:
        raise UserError("В SVG нет ни одного контура с цветом: текст и вложенные картинки не поддерживаются")
    if len(shapes) > MAX_PATHS:
        raise UserError(f"Слишком сложный рисунок: {len(shapes)} контуров, можно до {MAX_PATHS}")
    return shapes


def to_markup(shapes):
    """Пересобирает разметку с нуля: только <path> с проверенными атрибутами, рисунок сдвинут в (0, 0)."""
    from svgelements import Matrix

    min_x = min(s["bbox"][0] for s in shapes)
    min_y = min(s["bbox"][1] for s in shapes)
    max_x = max(s["bbox"][2] for s in shapes)
    max_y = max(s["bbox"][3] for s in shapes)
    width, height = max_x - min_x, max_y - min_y
    if width < 1 or height < 1:
        raise UserError("Рисунок слишком маленький")

    shift = Matrix(f"translate({-min_x}, {-min_y})")
    parts = []
    for s in shapes:
        path = s["path"] * shift
        path.reify()
        d = NUMBER.sub(lambda m: fmt(float(m.group())), path.d())
        attrs = [f'd="{d}"']
        attrs.append(f'fill="{s["fill"]}"' if s["fill"] else 'fill="none"')
        if s["fill"] and s["fill_opacity"] < 1:
            attrs.append(f'fill-opacity="{fmt(s["fill_opacity"])}"')
        if s["evenodd"]:
            attrs.append('fill-rule="evenodd"')
        if s["stroke"]:
            attrs.append(f'stroke="{s["stroke"]}" stroke-width="{fmt(s["width"])}"'
                         ' stroke-linejoin="round" stroke-linecap="round"')
            if s["stroke_opacity"] < 1:
                attrs.append(f'stroke-opacity="{fmt(s["stroke_opacity"])}"')
        parts.append(f"<path {' '.join(attrs)}/>")
    markup = "".join(parts)
    if len(markup) > MAX_SVG_CHARS:
        raise UserError("Слишком детальный рисунок: упростите картинку или уменьшите число цветов")
    return markup, width, height


def fit(part, width, height):
    """Вписывает рисунок в рамку части тела: возвращает x, y, scale для translate(x y) scale(scale)."""
    box_x, box_y, box_w, box_h, align = BOXES[part]
    scale = min(box_w / width, box_h / height)
    x = box_x + (box_w - width * scale) / 2
    if align == "top":
        y = box_y
    elif align == "bottom":
        y = box_y + box_h - height * scale
    else:
        y = box_y + (box_h - height * scale) / 2
    return round(x, 2), round(y, 2), round(scale, 4)


def run(part, data):
    if len(data) > MAX_INPUT_BYTES:
        raise UserError("Файл больше 5 МБ")
    if detect(data) == "png":
        data = png_to_svg(data)
    markup, width, height = to_markup(shapes_from_svg(data))
    x, y, scale = fit(part, width, height)
    return {"svg": markup, "width": round(width, 2), "height": round(height, 2),
            "x": x, "y": y, "scale": scale, "paths": markup.count("<path")}


def main():
    # Бэкенд читает ответ как UTF-8; на Windows консоль по умолчанию в cp1251.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="PNG/SVG → вещь бобра")
    parser.add_argument("--part", required=True, choices=sorted(BOXES))
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    with open(args.input, "rb") as source:
        data = source.read(MAX_INPUT_BYTES + 1)
    try:
        result = run(args.part, data)
    except UserError as error:
        sys.stderr.write(str(error))
        sys.exit(2)
    sys.stdout.write(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
