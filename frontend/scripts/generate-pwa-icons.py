"""PNG из public/icon.svg без Python/npm-зависимостей; нужна системная librsvg."""
import ctypes as c
from ctypes.util import find_library
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
rsvg = c.CDLL(find_library("rsvg-2"))
cairo = c.CDLL(find_library("cairo"))
gobject = c.CDLL(find_library("gobject-2.0"))
rsvg.rsvg_handle_new_from_data.argtypes = [c.c_char_p, c.c_size_t, c.POINTER(c.c_void_p)]
rsvg.rsvg_handle_new_from_data.restype = c.c_void_p
class Rectangle(c.Structure):
    _fields_ = [(name, c.c_double) for name in ("x", "y", "width", "height")]


rsvg.rsvg_handle_render_document.argtypes = [c.c_void_p, c.c_void_p, c.POINTER(Rectangle), c.POINTER(c.c_void_p)]
rsvg.rsvg_handle_render_document.restype = c.c_int
cairo.cairo_image_surface_create.argtypes = [c.c_int, c.c_int, c.c_int]
cairo.cairo_image_surface_create.restype = c.c_void_p
cairo.cairo_create.argtypes = [c.c_void_p]
cairo.cairo_create.restype = c.c_void_p
cairo.cairo_surface_write_to_png.argtypes = [c.c_void_p, c.c_char_p]
cairo.cairo_surface_write_to_png.restype = c.c_int
cairo.cairo_destroy.argtypes = [c.c_void_p]
cairo.cairo_surface_destroy.argtypes = [c.c_void_p]
gobject.g_object_unref.argtypes = [c.c_void_p]

source = (root / "public/icon.svg").read_text()
output = root / "public/icons"
output.mkdir(exist_ok=True)
for name, size, scale in [
    ("icon-192", 192, 0.8), ("icon-512", 512, 0.8),
    # Весь квадрат рисунка вписан в безопасный круг диаметром 80% (0.56 * sqrt(2) < 0.8).
    ("icon-maskable-512", 512, 0.56), ("apple-touch-icon", 180, 0.8),
]:
    picture = ET.fromstring(source)
    side = size * scale
    inset = (size - side) / 2
    picture.attrib.update(x=str(inset), y=str(inset), width=str(side), height=str(side))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}">'
           f'<rect width="100%" height="100%" fill="#F6F4FF"/>'
           f'{ET.tostring(picture, encoding="unicode")}</svg>').encode()
    error = c.c_void_p()
    handle = rsvg.rsvg_handle_new_from_data(svg, len(svg), c.byref(error))
    if not handle:
        raise RuntimeError("librsvg: не удалось прочитать SVG")
    surface = cairo.cairo_image_surface_create(0, size, size)
    context = cairo.cairo_create(surface)
    viewport = Rectangle(0, 0, size, size)
    if not rsvg.rsvg_handle_render_document(handle, context, c.byref(viewport), c.byref(error)):
        raise RuntimeError("librsvg: не удалось отрисовать SVG")
    if cairo.cairo_surface_write_to_png(surface, str(output / f"{name}.png").encode()) != 0:
        raise RuntimeError("Cairo: не удалось записать PNG")
    cairo.cairo_destroy(context)
    cairo.cairo_surface_destroy(surface)
    gobject.g_object_unref(handle)
    print(f"{name}.png: {size}×{size}")
