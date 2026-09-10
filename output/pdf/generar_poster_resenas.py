"""Póster imprimible de reseñas. QR y tipografía vectoriales, logo original."""
from pathlib import Path
import json
import math

import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4, letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
URL = 'https://cabanasplayaterco.com/resenas'
LOGO = ROOT / 'frontend/public/assets/terco_logo_nav.png'
FONTDIR = Path('C:/Windows/Fonts')
for name, file in [('Serif', 'georgia.ttf'), ('SerifBold', 'georgiab.ttf'),
                   ('Sans', 'segoeui.ttf'), ('SansBold', 'segoeuib.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONTDIR / file)))

INK = HexColor('#083F4C')
TEAL = HexColor('#007C92')
SAND = HexColor('#FFFCF5')
MUTED = HexColor('#405E64')
PALE = HexColor('#DDF4F1')
SEA = HexColor('#00A4BC')

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=20, border=4)
qr.add_data(URL)
qr.make(fit=True)
MATRIX = qr.get_matrix()
qr.make_image(fill_color='black', back_color='white').save(OUT / 'qr-resenas-playa-terco.png')


def design(c):
    # Coordinates use a 612 x 792 point portrait sheet, with a top-origin helper.
    def rect(x, top, w, h, color, radius=0):
        c.setFillColor(color)
        if radius:
            c.roundRect(x, 792-top-h, w, h, radius, fill=1, stroke=0)
        else:
            c.rect(x, 792-top-h, w, h, fill=1, stroke=0)

    def text(value, baseline, size, font='Sans', color=INK, x=306):
        width = pdfmetrics.stringWidth(value, font, size)
        t = c.beginText(x-width/2, 792-baseline)
        t.setCharSpace(0)
        t.setFont(font, size)
        t.setFillColor(color)
        t.textOut(value)
        c.drawText(t)

    def tracking(value, baseline, size, spacing, color=TEAL):
        width = pdfmetrics.stringWidth(value, 'SansBold', size) + spacing * (len(value)-1)
        t = c.beginText((612-width)/2, 792-baseline)
        t.setFont('SansBold', size)
        t.setCharSpace(spacing)
        t.setFillColor(color)
        t.textOut(value)
        c.drawText(t)

    def curve(points, color, width):
        c.setStrokeColor(color)
        c.setLineWidth(width)
        p = c.beginPath()
        p.moveTo(points[0], 792-points[1])
        p.curveTo(points[2], 792-points[3], points[4], 792-points[5], points[6], 792-points[7])
        c.drawPath(p)

    rect(0, 0, 612, 792, white)
    rect(24, 24, 564, 744, SAND, 8)

    # A quiet coastal motif frames the unchanged, transparent brand logo.
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(24, 24, 564, 744, 8)
    c.clipPath(clip, stroke=0, fill=0)
    curve((0, 96, 73, 14, 122, 57, 183, 31), PALE, 31)
    curve((424, 34, 478, 48, 533, 4, 613, 83), PALE, 31)
    curve((2, 115, 79, 36, 130, 79, 179, 55), HexColor('#9DDFDF'), 1)
    curve((436, 58, 492, 72, 538, 24, 620, 111), HexColor('#9DDFDF'), 1)
    c.restoreState()

    logo_width = 162
    logo_height = 162 * 326 / 500
    c.drawImage(str(LOGO), (612-logo_width)/2, 792-43-logo_height,
                width=logo_width, height=logo_height, mask='auto')
    tracking('PACÍFICO COLOMBIANO', 171, 9, 2.1)

    text('¿Cómo estuvo', 222, 39, 'SerifBold')
    text('tu estadía?', 267, 39, 'SerifBold')
    text('Queremos conocer tu experiencia.', 296, 14, color=MUTED)

    text('Escanea y deja tu reseña', 339, 22, 'SansBold', TEAL)

    # Four complete white modules surround the QR. Nothing is overlaid on it.
    size = 222.0
    left = (612-size)/2
    top = 356
    rect(left, top, size, size, white)
    module = size/len(MATRIX)
    c.setFillColor(HexColor('#000000'))
    for row, cells in enumerate(MATRIX):
        start = None
        for col in range(len(cells)+1):
            dark = col < len(cells) and cells[col]
            if dark and start is None:
                start = col
            if not dark and start is not None:
                c.rect(left+start*module, 792-top-(row+1)*module,
                       (col-start)*module, module, stroke=0, fill=1)
                start = None
    # Corner marks sit outside the QR's quiet zone.
    c.setStrokeColor(SEA)
    c.setLineWidth(2.2)
    c.setLineCap(1)
    for x, y, sx, sy in [(left-7, top-7, 1, 1), (left+size+7, top-7, -1, 1),
                          (left-7, top+size+7, 1, -1), (left+size+7, top+size+7, -1, -1)]:
        p = c.beginPath()
        p.moveTo(x+sx*17, 792-y)
        p.lineTo(x, 792-y)
        p.lineTo(x, 792-y-sy*17)
        c.drawPath(p)
    c.linkURL(URL, (left, 792-top-size, left+size, 792-top), relative=0)

    text('Abre la cámara de tu celular y apunta al QR.', 607, 11.5, color=MUTED)
    text('En la página, toca «Escribir reseña».', 625, 11.5, color=MUTED)
    text('cabanasplayaterco.com/resenas', 654, 13, 'SansBold', TEAL)
    c.linkURL(URL, (170, 792-659, 442, 792-639), relative=0)

    c.setStrokeColor(HexColor('#D4DFD9'))
    c.setLineWidth(0.8)
    c.line(246, 792-676, 366, 792-676)
    text('Tu opinión nos ayuda a mejorar', 700, 12, color=MUTED)
    text('y a inspirar a otros viajeros.', 718, 12, color=MUTED)
    text('¡Gracias por visitarnos!', 744, 12, 'SansBold')

    c.saveState()
    clip = c.beginPath()
    clip.roundRect(24, 24, 564, 744, 8)
    c.clipPath(clip, stroke=0, fill=0)
    curve((8, 788, 113, 737, 177, 793, 273, 779), PALE, 35)
    curve((340, 789, 446, 755, 526, 745, 622, 769), PALE, 35)
    curve((14, 775, 114, 741, 178, 788, 260, 775), HexColor('#7CD1D5'), 1)
    curve((365, 778, 465, 749, 537, 754, 612, 759), HexColor('#7CD1D5'), 1)
    c.restoreState()


outputs = []
for suffix, paper in [('carta', letter), ('a4', A4)]:
    target = OUT / f'poster-resenas-playa-terco-{suffix}.pdf'
    c = canvas.Canvas(str(target), pagesize=paper, pageCompression=1)
    c.setTitle('Comparte tu experiencia | Cabañas Playa Terco')
    c.setAuthor('Cabañas Playa Terco')
    c.setSubject('Póster para imprimir con acceso QR a las reseñas')
    c.setCreator('Cabañas Playa Terco · diseño para impresión')
    scale = min(paper[0]/612, paper[1]/792)
    c.translate((paper[0]-612*scale)/2, (paper[1]-792*scale)/2)
    c.scale(scale, scale)
    design(c)
    c.showPage()
    c.save()
    outputs.append({'file': target.name, 'size_points': list(paper),
                    'qr_size_mm': round(222*scale*25.4/72, 1)})

(OUT / 'poster-resenas-manifiesto.json').write_text(json.dumps({
    'destination': URL,
    'logo_source': 'frontend/public/assets/terco_logo_nav.png',
    'layout': 'Composición vectorial original; logo existente sin modificaciones.',
    'qr': {'error_correction': 'H', 'quiet_zone_modules': 4, 'matrix_modules': len(MATRIX)},
    'outputs': outputs,
    'print': 'Imprimir al 100 % / tamaño real en el tamaño de papel correspondiente.',
}, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(outputs, ensure_ascii=False, indent=2))
