# Prepara las imágenes de public/visuales/ para la web: las reduce al tamaño máximo de su carpeta y las convierte al
# formato que toca (WebP casi siempre), conservando la transparencia. Las reglas están en tools/limites-imagenes.json
# y se explican en docs/VISUALES.md. Adaptado de Aldeanos vs Lobos.
#   python tools/optimizar-imagenes.py            → solo informa (no cambia nada)
#   python tools/optimizar-imagenes.py --aplicar  → reescribe las que no cumplen (y borra el PNG/JPG si pasa a WebP)
# Guarda antes los originales en alta resolución FUERA del repositorio (por ejemplo en visuales-originales/).
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


def regla_para(ruta):
    return next(r for r in REGLAS if ruta.startswith(r['prefijo']))


def reducir(img, lado):
    if max(img.size) <= lado:
        return img
    escala = lado / max(img.size)
    return img.resize((max(1, round(img.width * escala)), max(1, round(img.height * escala))), Image.LANCZOS)


def guardar(img, destino, formato, kb_maximo):
    if formato == 'webp':
        # Se baja la calidad poco a poco hasta que pese lo permitido.
        for calidad in (85, 80, 75, 70, 65, 60):
            img.save(destino, 'WEBP', quality=calidad, method=6)
            if os.path.getsize(destino) / 1024 <= kb_maximo:
                return
    elif formato == 'jpg':
        img.convert('RGB').save(destino, 'JPEG', quality=85, optimize=True)
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
            permitidos = [f for f in regla['formatos'] if f != 'svg']
            kb = os.path.getsize(ruta) / 1024
            with Image.open(ruta) as original:
                original.load()
                img = original.copy()
            if formato in permitidos and max(img.size) <= regla['lado'] and kb <= regla['kb']:
                continue
            pendientes += 1
            destino_formato = formato if formato in permitidos else permitidos[0]
            destino = os.path.join(carpeta, f'{raiz_nombre}.{destino_formato}')
            antes = f'{rel}: {img.width}×{img.height}, {kb:.0f} KB'
            if not aplicar:
                print(f'{antes} → se pasaría a .{destino_formato} de {regla["lado"]} px como máximo')
                continue
            transparente = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
            img = reducir(img.convert('RGBA' if transparente else 'RGB'), regla['lado'])
            guardar(img, destino, destino_formato, regla['kb'])
            if os.path.abspath(destino) != os.path.abspath(ruta):
                os.remove(ruta)
            nuevo = os.path.getsize(destino) / 1024
            aviso = '' if nuevo <= regla['kb'] else f'  ⚠ sigue pesando más de {regla["kb"]} KB: simplifica la imagen'
            print(f'{antes} → {os.path.relpath(destino, BASE).replace(os.sep, "/")}: {img.width}×{img.height}, {nuevo:.0f} KB{aviso}')
    if pendientes == 0:
        print('✔ Todas las imágenes tienen ya su tamaño y su formato')
    elif not aplicar:
        print(f'\n{pendientes} imagen(es) por preparar. Para aplicar: python tools/optimizar-imagenes.py --aplicar')


if __name__ == '__main__':
    main()
