// Hoja de contactos de las imágenes: una página que muestra todas las de public/visuales/, carpeta por carpeta, a los
// tamaños a los que se verán en el juego y sobre fondo claro (crema) y oscuro (noche), con un hueco para las que
// faltan. Sirve para ver de un vistazo si alguna desentona con sus vecinas (línea, luz, colores o tamaño del motivo).
//   node tools/hoja-de-contactos.js   → escribe visuales-originales/hoja-de-contactos.html (git lo ignora)
// Los iconos SVG se insertan en la página para poder teñirlos con el color del texto, como hará el juego; los que no
// pasan la revisión (tools/revisar-imagenes.js) no se insertan.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revisarCarpeta, revisarSvg } from './revisar-imagenes.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'visuales-originales', 'hoja-de-contactos.html');

// Tamaños (ancho en px) a los que se muestra cada carpeta: los de su uso real en el juego.
const TAMANOS = [
  ['fichas/piezas/', [48, 96, 256]],
  ['fichas/retratos/', [96, 256]],
  ['tablero/centro/', [320]],
  ['tablero/esquinas/', [96, 192]],
  ['tablero/edificios/', [24, 48, 128]],
  ['botones/habilidades/', [40, 64, 128]],
  ['tarjetas/dorsos/', [120, 240]],
  ['tarjetas/efectos/', [192, 384]],
  ['tarjetas/cabeceras/', [256, 512]],
  ['interfaz/ilustraciones/', [128, 256]],
  ['marca/', [128, 320]],
  ['', [24, 48, 96]], // iconos SVG
];
const tamanosDe = ruta => TAMANOS.find(([prefijo]) => ruta.startsWith(prefijo))[1];
const carpetaDe = ruta => ruta.split('/').slice(0, -1).join('/');

function muestra(ruta, svg, fondo) {
  const color = fondo === 'claro' ? '#1D2430' : '#F4F1EA';
  const celdas = tamanosDe(ruta).map(ancho => {
    if (svg === undefined) return `<img src="../public/visuales/${ruta}" style="width:${ancho}px" alt="">`;
    const conTamano = svg.replace(/<svg\b/, `<svg width="${ancho}" height="${ancho}"`);
    return `<span style="color:${color}">${conTamano}</span>`;
  });
  return `<div class="fondo ${fondo}">${celdas.join('')}</div>`;
}

// esperados: rutas de docs/VISUALES.md; presentes: Map ruta → { svg: texto | undefined, valido: bool }.
export function construirHoja(esperados, presentes) {
  const todas = [...new Set([...esperados, ...presentes.keys()])].sort();
  const porCarpeta = new Map();
  for (const ruta of todas) porCarpeta.set(carpetaDe(ruta), [...(porCarpeta.get(carpetaDe(ruta)) ?? []), ruta]);
  const hechas = esperados.filter(r => presentes.has(r)).length;
  const secciones = [...porCarpeta].map(([carpeta, rutas]) => {
    const fichas = rutas.map(ruta => {
      const nombre = ruta.split('/').pop();
      const aviso = !esperados.includes(ruta) ? '<p class="aviso">No está en docs/VISUALES.md</p>' : '';
      if (!presentes.has(ruta)) return `<figure class="falta"><div class="hueco">falta</div><figcaption>${nombre}</figcaption></figure>`;
      const { svg, valido } = presentes.get(ruta);
      if (svg !== undefined && !valido) return `<figure class="falta"><div class="hueco">SVG con problemas: npm run revisar:imagenes</div><figcaption>${nombre}</figcaption></figure>`;
      return `<figure>${muestra(ruta, svg, 'claro')}${muestra(ruta, svg, 'oscuro')}<figcaption>${nombre}</figcaption>${aviso}</figure>`;
    });
    return `<section><h2>${carpeta}/ <small>${rutas.filter(r => presentes.has(r)).length} de ${rutas.length}</small></h2><div class="rejilla">${fichas.join('')}</div></section>`;
  });
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Hoja de contactos · Dueños de la Ciudad</title>
<style>
  body { margin: 0; padding: 24px; background: #E9E6DF; color: #1D2430; font-family: system-ui, sans-serif; }
  h1 { margin: 0 0 4px; } h2 { margin: 32px 0 12px; font-size: 18px; } small { color: #5B6472; font-weight: normal; }
  .rejilla { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  figure { margin: 0; background: #FBF9F4; border: 1px solid #C4C4C3; border-radius: 8px; padding: 8px; }
  figcaption { font-size: 12px; margin-top: 6px; }
  .fondo { display: flex; gap: 12px; align-items: flex-end; padding: 10px; border-radius: 6px; }
  .fondo + .fondo { margin-top: 6px; }
  .claro { background: #F4F1EA; } .oscuro { background: #16202E; }
  .fondo img, .fondo svg { display: block; }
  .falta { opacity: 0.6; } .hueco { width: 120px; height: 60px; display: grid; place-items: center; border: 2px dashed #A7ADB7; border-radius: 6px; font-size: 12px; text-align: center; padding: 4px; }
  .aviso { color: #B33F46; font-size: 12px; margin: 4px 0 0; }
</style>
</head>
<body>
<h1>Hoja de contactos</h1>
<p>Hechas ${hechas} de ${esperados.length} imágenes de docs/VISUALES.md. Cada imagen se ve a su tamaño real en el juego, sobre crema y sobre noche. Si una desentona con sus vecinas (línea, luz, colores o tamaño del motivo), hay que regenerarla.</p>
${secciones.join('\n')}
</body>
</html>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { archivos, esperados } = revisarCarpeta();
  const presentes = new Map(archivos.map(({ ruta, bytes }) => {
    if (!ruta.endsWith('.svg')) return [ruta, { svg: undefined, valido: true }];
    const texto = bytes.toString('utf8');
    return [ruta, { svg: texto, valido: revisarSvg(texto).length === 0 }];
  }));
  mkdirSync(dirname(SALIDA), { recursive: true });
  writeFileSync(SALIDA, construirHoja(esperados, presentes));
  console.log(`✔ Hoja de contactos en ${SALIDA}`);
  console.log(`  Ábrela en el navegador. Hechas ${esperados.filter(r => presentes.has(r)).length} de ${esperados.length}.`);
  if (!existsSync(join(RAIZ, 'public', 'visuales'))) console.log('  (Todavía no hay carpeta public/visuales/.)');
}
