# Prepara las imágenes de public/visuales/ para la web, según las fichas técnicas de docs/VISUALES.md:
#   - las recorta por el centro a la proporción exacta de su carpeta, si la diferencia es pequeña (hasta un 12 %);
#   - las deja en la medida exacta de su carpeta y las convierte al formato que toca (WebP casi siempre),
#     conservando la transparencia y bajando la calidad si hace falta para no pasar del peso máximo.
# Las reglas están en tools/limites-imagenes.json. Los SVG no se tocan (los revisa tools/revisar-imagenes.js).
# Adaptado de Aldeanos vs Lobos.
#   python tools/optimizar-imagenes.py            → solo informa (no cambia nada)
#   python tools/optimizar-imagenes.py --aplicar  → reescribe las que no cumplen (y borra el PNG/JPG si pasa a WebP)
# Guarda antes los originales en alta resolución FUERA del repositorio (en visuales-originales/, que git ignora).
# Necesita Pillow:  pip install pillow
import json
import os
import sys
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(RAIZ, 'public', 'visuales')
with open(os.path.join(RAIZ, 'tools', 'limites-imagenes.json'), encoding='utf-8') as f:
    REGLAS = json.load(f)['reglas']
RASTER = {'.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.webp': 'webp'}
TOLERANCIA = 0.12  # diferencia de proporción que se arregla recortando; si es mayor, hay que regenerar


def regla_para(ruta):
    return next((r for r in REGLAS if ruta.startswith(r['prefijo'])), None)


def recortar_a_proporcion(img, ancho, alto):
    objetivo = ancho / alto
    actual = img.width / img.height
    if abs(actual / objetivo - 1) < 0.005:
        return img
    if actual > objetivo:  # sobra ancho
        nuevo = round(img.height * objetivo)
        x = (img.width - nuevo) // 2
        return img.crop((x, 0, x + nuevo, img.height))
    nuevo = round(img.width / objetivo)  # sobra alto
    y = (img.height - nuevo) // 2
    return img.crop((0, y, img.width, y + nuevo))


def guardar(img, destino, formato, kb_maximo):
    if formato == 'webp':
        # Se baja la calidad poco a poco hasta que pese lo permitido.
        for calidad in (90, 85, 80, 75, 70, 65, 60):
            img.save(destino, 'WEBP', quality=calidad, method=6)
            if os.path.getsize(destino) / 1024 <= kb_maximo:
                return
    elif formato == 'jpg':
        img.convert('RGB').save(destino, 'JPEG', quality=88, optimize=True)
    else:
        img.save(destino, 'PNG', optimize=True)


def main():
    sys.stdout.reconfigure(encoding='utf-8')  # la consola de Windows usa cp1252
    aplicar = '--aplicar' in sys.argv
    pendientes = 0
    for carpeta, _, nombres in os.walk(BASE):
        for nombre in sorted(nombres):
            raiz_nombre, ext = os.path.splitext(nombre)
            formato = RASTER.get(ext.lower())
            if not formato:
                continue
            ruta = os.path.join(carpeta, nombre)
            rel = os.path.relpath(ruta, BASE).replace(os.sep, '/')
            regla = regla_para(rel)
            if not regla or 'ancho' not in regla:
                print(f'✖ {rel}: esta carpeta no lleva imágenes de este tipo (ver docs/VISUALES.md)')
                continue
            ancho, alto = regla['ancho'], regla['alto']
            permitidos = [f for f in regla['formatos'] if f != 'svg']
            kb = os.path.getsize(ruta) / 1024
            with Image.open(ruta) as original:
                original.load()
                img = original.copy()
            if formato in permitidos and img.size == (ancho, alto) and kb <= regla['kb']:
                continue
            pendientes += 1
            antes = f'{rel}: {img.width}×{img.height}, {kb:.0f} KB'
            diferencia = abs((img.width / img.height) / (ancho / alto) - 1)
            if diferencia > TOLERANCIA:
                print(f'✖ {antes} → su proporción no es la de {ancho}×{alto}: hay que regenerarla con esa proporción')
                continue
            if img.width < ancho or img.height < alto:
                print(f'✖ {antes} → es más pequeña que {ancho}×{alto}: hay que generarla más grande')
                continue
            destino_formato = formato if formato in permitidos else permitidos[0]
            destino = os.path.join(carpeta, f'{raiz_nombre}.{destino_formato}')
            if not aplicar:
                print(f'{antes} → quedaría en .{destino_formato} de {ancho}×{alto}')
                continue
            transparente = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
            img = recortar_a_proporcion(img.convert('RGBA' if transparente else 'RGB'), ancho, alto)
            img = img.resize((ancho, alto), Image.LANCZOS)
            guardar(img, destino, destino_formato, regla['kb'])
            if os.path.abspath(destino) != os.path.abspath(ruta):
                os.remove(ruta)
            nuevo = os.path.getsize(destino) / 1024
            aviso = '' if nuevo <= regla['kb'] else f'  ⚠ sigue pesando más de {regla["kb"]} KB: simplifica la imagen'
            print(f'{antes} → {os.path.relpath(destino, BASE).replace(os.sep, "/")}: {ancho}×{alto}, {nuevo:.0f} KB{aviso}')
    if pendientes == 0:
        print('✔ Todas las imágenes tienen ya su medida y su formato')
    elif not aplicar:
        print(f'\n{pendientes} imagen(es) por preparar. Para aplicar: python tools/optimizar-imagenes.py --aplicar')


if __name__ == '__main__':
    main()
