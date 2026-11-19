"""Render original SVG layout studies to PNG using the system SVG renderer."""
import ctypes as C
from pathlib import Path
import textwrap
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parents[1] / 'docs' / 'mockups'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1760, 2120
root = ET.Element('svg', xmlns='http://www.w3.org/2000/svg', width=str(W), height=str(H), viewBox=f'0 0 {W} {H}')

def rect(x, y, w, h, fill='#fff', stroke='none', radius=8):
    ET.SubElement(root, 'rect', x=str(x), y=str(y), width=str(w), height=str(h), fill=fill, stroke=stroke, rx=str(radius))

def text(x, y, value, size=14, fill='#263238', weight='normal', width=None):
    lines = textwrap.wrap(value, max(10, int(width / (size * .55)))) if width else [value]
    for i, line in enumerate(lines):
        node = ET.SubElement(root, 'text', x=str(x), y=str(y + i * (size + 5)), fill=fill,
                             attrib={'font-family': 'DejaVu Sans', 'font-size': str(size), 'font-weight': weight})
        node.text = line
    return len(lines) * (size + 5)

levels = ['Bad', 'Okay', 'Good', 'Great']
colors = ['#c62828', '#966000', '#20723a', '#146b4f']
states = [
    ('Bad', [0, 1, 0], 'Poor scan quality expected: too few surface features detected.'),
    ('Okay', [1, 2, 1], 'Too little recognizable detail in the analysed area.'),
    ('Good', [2, 2, 3], 'Good conditions for reconstructing your object.'),
    ('Great', [3, 3, 3], 'Excellent conditions for reconstructing your object.'),
    ('Not enough data', [None, None, None], 'Not enough data to assess scan readiness. You can still continue.')
]
categories = ['Surface detail', 'Usable matches', 'Geometric consistency']
rect(0, 0, W, H, '#f0f3f6', radius=0)
text(24, 37, 'Scan readiness — layout studies', 25, weight='bold')
text(24, 65, 'Example data · all API grades · core categories expanded for comparison · no real device measurements', 13, '#586670')
for c, title in enumerate(['A · Compact scale + detail list', 'B · Assessment matrix', 'C · Rating rail + status rows']):
    text(20 + c * 580, 101, title, 18, weight='bold')

for r, (state, ratings, verdict) in enumerate(states):
    for c in range(3):
        x, y = 20 + c * 580, 120 + r * 394
        rect(x, y, 560, 378, '#fff', '#dce2e7')
        text(x + 18, y + 27, f'{state.upper()} · scan readiness', 12, '#65747d', 'bold')
        sx, sy = x + 20, y + 44
        active = levels.index(state) if state in levels else None
        if c == 0:
            for i, label in enumerate(levels):
                chosen = active == i
                rect(sx + i * 130, sy, 122, 40, '#edf6ff' if chosen else '#fafafa', '#0288d1' if chosen else '#e1e5e8', 5)
                text(sx + i * 130 + 12, sy + 25, ('✓ ' if chosen else '') + label, 14, colors[i] if chosen else '#7b858d', 'bold' if chosen else 'normal')
            sy += 62
            sy += text(sx, sy, verdict, 14, '#222', 'bold', 510)
            text(sx, sy + 12, 'More details  ▾', 12, '#65747d')
            for j, label in enumerate(categories):
                yy = sy + 38 + j * 26
                text(sx, yy, label, 13)
                grade = ratings[j]
                text(sx + 345, yy, levels[grade] if grade is not None else 'No data', 13, colors[grade] if grade is not None else '#65747d', 'bold')
        elif c == 1:
            text(sx, sy + 12, verdict, 14, '#222', 'bold', 510)
            ty = sy + 52
            for i, label in enumerate(levels):
                rect(sx + 217 + i * 75, ty - 17, 72, 27, '#edf6ff' if active == i else '#f6f8fa', radius=3)
                text(sx + 225 + i * 75, ty + 1, label, 12, '#0288d1' if active == i else '#65747d', 'bold')
            for j, label in enumerate(['Overall result'] + categories):
                yy = ty + 30 + j * 27
                grade = active if j == 0 else ratings[j - 1]
                text(sx, yy, label, 13, weight='bold' if j == 0 else 'normal')
                rect(sx + 216, yy - 17, 299, 24, '#fafbfc', radius=0)
                if grade is not None:
                    rect(sx + 217 + grade * 75, yy - 17, 72, 24, '#e2f0fb', radius=3)
                    text(sx + 245 + grade * 75, yy + 1, '✓', 16, colors[grade], 'bold')
                else:
                    text(sx + 232, yy, 'Not enough data', 12, '#65747d')
        else:
            rect(sx + 5, sy + 18, 495, 5, '#dfe6ec', radius=2)
            for i, label in enumerate(levels):
                xx = sx + 5 + i * 165
                ET.SubElement(root, 'circle', cx=str(xx), cy=str(sy + 20), r='8' if active == i else '4', fill=colors[i] if active == i else '#a8b5bf')
                text(max(sx, xx - 15), sy + 45, label, 12, colors[i] if active == i else '#65747d', 'bold' if active == i else 'normal')
            sy += 69
            sy += text(sx, sy, verdict, 14, '#222', 'bold', 510)
            for j, label in enumerate(categories):
                yy = sy + 31 + j * 27
                text(sx, yy, label, 13)
                grade = ratings[j]
                rect(sx + 370, yy - 16, 140, 24, '#f0f5f8', radius=12)
                text(sx + 384, yy, levels[grade] if grade is not None else 'No data', 12, colors[grade] if grade is not None else '#65747d', 'bold')
        if r == 0:
            text(sx, y + 273, 'Prepare the surface', 13, weight='bold')
            text(sx, y + 293, 'Use a suitable scan spray to reduce reflections.', 12)
            rect(sx, y + 307, 520, 54, '#e4f1fc', radius=5)
            text(sx + 12, y + 326, 'Consider cross-polarized lighting', 12, '#24516d', 'bold')
            text(sx + 12, y + 345, 'At 8 ms, a cross-polarizer may be missing.', 12, '#24516d')
        elif r == 1:
            text(sx, y + 287, 'Improve surface preparation with a suitable scan spray.', 12)
            text(sx, y + 315, 'Prepare surface and analyse again', 12, '#0288d1', 'bold')
        elif r in [2, 3]:
            text(sx, y + 291, 'You can continue with your current surface preparation.', 12, '#20723a')
        else:
            text(sx, y + 287, 'No grade is selected when measurements are missing.', 12, '#65747d')
            text(sx, y + 315, 'Analyse again', 12, '#0288d1', 'bold')

svg = OUT / 'scan-readiness-layouts.svg'
svg.write_text(ET.tostring(root, encoding='unicode'))
rsvg = C.CDLL('librsvg-2.so.2')
cairo = C.CDLL('libcairo.so.2')
rsvg.rsvg_handle_new_from_file.argtypes = [C.c_char_p, C.c_void_p]
rsvg.rsvg_handle_new_from_file.restype = C.c_void_p
cairo.cairo_image_surface_create.argtypes = [C.c_int, C.c_int, C.c_int]
cairo.cairo_image_surface_create.restype = C.c_void_p
cairo.cairo_create.argtypes = [C.c_void_p]
cairo.cairo_create.restype = C.c_void_p
class Rectangle(C.Structure):
    _fields_ = [('x', C.c_double), ('y', C.c_double), ('width', C.c_double), ('height', C.c_double)]
rsvg.rsvg_handle_render_document.argtypes = [C.c_void_p, C.c_void_p, C.POINTER(Rectangle), C.c_void_p]
rsvg.rsvg_handle_render_document.restype = C.c_int
cairo.cairo_surface_write_to_png.argtypes = [C.c_void_p, C.c_char_p]
cairo.cairo_surface_write_to_png.restype = C.c_int
surface = cairo.cairo_image_surface_create(0, W, H)
context = cairo.cairo_create(surface)
handle = rsvg.rsvg_handle_new_from_file(str(svg).encode(), None)
assert handle and rsvg.rsvg_handle_render_document(handle, context, C.byref(Rectangle(0, 0, W, H)), None)
png = OUT / 'scan-readiness-layouts.png'
assert cairo.cairo_surface_write_to_png(surface, str(png).encode()) == 0
print(png)
