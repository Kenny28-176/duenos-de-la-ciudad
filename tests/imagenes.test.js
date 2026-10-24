// Las imágenes de public/visuales/ cumplen las reglas de docs/VISUALES.md: están en su lista, con nombre válido, en el
// formato y la medida exactos de su carpeta, los SVG siguen la construcción común y los créditos están anotados. Si
// falla, la herramienta que generó la imagen debe ejecutar «python tools/optimizar-imagenes.py --aplicar», revisar el
// SVG o anotarla en public/visuales/CREDITOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LIMITES, cubre, dimensiones, imagenesEsperadas, patronesDeCreditos, reglaPara, revisarCarpeta, revisarImagenes, revisarSvg,
  tipoReal,
} from '../tools/revisar-imagenes.js';
import { construirHoja } from '../tools/hoja-de-contactos.js';

// Cabeceras mínimas de imágenes falsas, suficientes para leer el tipo y las dimensiones.
function png(ancho, alto, bytes = 24) {
  const b = Buffer.alloc(bytes);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write('IHDR', 12, 'latin1');
  b.writeUInt32BE(ancho, 16);
  b.writeUInt32BE(alto, 20);
  return b;
}
function webp(ancho, alto, bytes = 30) {
  const b = Buffer.alloc(bytes);
  b.write('RIFF', 0, 'latin1');
  b.write('WEBP', 8, 'latin1');
  b.write('VP8X', 12, 'latin1');
  b.writeUIntLE(ancho - 1, 24, 3);
  b.writeUIntLE(alto - 1, 27, 3);
  return b;
}
const APERTURA = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">';
const SVG_BIEN = `${APERTURA}<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="3" fill="currentColor"/></svg>`;
const CREDITOS = '| Archivos | Autoría |\n|---|---|\n| `fichas/piezas/*.webp`, `botones/acciones/*.svg` | IA |\n| `marca/portada.webp` | IA |\n';
const ESPERADOS = ['botones/acciones/comprar.svg', 'fichas/piezas/oso.png', 'fichas/piezas/rata.webp', 'fichas/piezas/toro.webp', 'marca/portada.webp'];

test('lee el tipo real y las dimensiones de las imágenes', () => {
  assert.equal(tipoReal(png(10, 20)), 'png');
  assert.equal(tipoReal(webp(10, 20)), 'webp');
  assert.equal(tipoReal(Buffer.from(SVG_BIEN)), 'svg');
  assert.equal(tipoReal(Buffer.from('hola')), null);
  assert.deepEqual(dimensiones(png(300, 200)), { ancho: 300, alto: 200 });
  assert.deepEqual(dimensiones(webp(512, 384)), { ancho: 512, alto: 384 });
});

test('cada carpeta de la guía tiene su medida exacta y su formato', () => {
  assert.deepEqual([reglaPara('marca/portada.webp').ancho, reglaPara('marca/portada.webp').alto], [1600, 900]);
  assert.deepEqual(reglaPara('marca/icono-512.png').formatos, ['png']);
  assert.equal(reglaPara('tablero/centro/ciudad.webp').ancho, 1024);
  assert.deepEqual([reglaPara('fichas/piezas/rata.webp').ancho, reglaPara('fichas/piezas/rata.webp').alto], [256, 256]);
  assert.deepEqual([reglaPara('tarjetas/dorsos/fortuna.webp').ancho, reglaPara('tarjetas/dorsos/fortuna.webp').alto], [384, 512]);
  assert.deepEqual(reglaPara('tablero/barrios/feria.svg').formatos, ['svg']);
  assert.equal(reglaPara('otra-carpeta/cosa.webp'), undefined);
});

test('docs/VISUALES.md pide 141 imágenes y cada una cabe en una regla con su formato', () => {
  const esperados = imagenesEsperadas(readFileSync(new URL('../docs/VISUALES.md', import.meta.url), 'utf8'));
  assert.equal(esperados.length, 141);
  for (const ruta of esperados) {
    const regla = reglaPara(ruta);
    assert.ok(regla, `${ruta}: no tiene regla en tools/limites-imagenes.json`);
    assert.ok(regla.formatos.includes(ruta.split('.').pop()), `${ruta}: su formato no es el de su carpeta`);
  }
  assert.deepEqual(imagenesEsperadas('Ver `fichas/piezas/rata.webp` y `fichas/piezas/rata.webp`, no `otra/cosa.webp`'), ['fichas/piezas/rata.webp']);
});

test('los iconos SVG siguen la construcción común', () => {
  assert.deepEqual(revisarSvg(SVG_BIEN), []);
  const mal = revisarSvg('<svg viewBox="0 0 24 24" stroke="#000" stroke-width="2"><text>A</text><path style="fill:red" stroke-width="3" fill="red"/></svg>');
  const texto = mal.join('\n');
  assert.match(texto, /le falta xmlns/);
  assert.match(texto, /viewBox="0 0 64 64"/);
  assert.match(texto, /stroke="currentColor"/);
  assert.match(texto, /no permitidos: <text>/);
  assert.match(texto, /colores fijos/);
  assert.match(texto, /colores no permitidos \(#000, red\)/);
  assert.match(texto, /grosor distinto de 5 \(2, 3\)/);
  assert.match(texto, /estilos en línea/);
  assert.match(revisarSvg(`${APERTURA}<image href="x.png"/></svg>`).join('\n'), /enlaza a otros archivos/);
});

test('los créditos se leen de la primera columna y el comodín no cruza carpetas', () => {
  assert.deepEqual(patronesDeCreditos(CREDITOS), ['fichas/piezas/*.webp', 'botones/acciones/*.svg', 'marca/portada.webp']);
  assert.ok(cubre('fichas/piezas/*.webp', 'fichas/piezas/rata.webp'));
  assert.ok(!cubre('fichas/*.webp', 'fichas/piezas/rata.webp'));
  assert.ok(cubre('marca/portada.webp', 'marca/portada.webp'));
});

test('la revisión acepta lo correcto y explica lo que no cumple', () => {
  const bien = revisarImagenes([
    { ruta: 'fichas/piezas/rata.webp', bytes: webp(256, 256) },
    { ruta: 'botones/acciones/comprar.svg', bytes: Buffer.from(SVG_BIEN) },
    { ruta: 'marca/portada.webp', bytes: webp(1600, 900) },
  ], CREDITOS, { esperados: ESPERADOS });
  assert.deepEqual(bien, { problemas: [], generales: [] });

  const { problemas, generales } = revisarImagenes([
    { ruta: 'fichas/piezas/toro.webp', bytes: png(256, 256) }, // es PNG con nombre .webp
    { ruta: 'fichas/piezas/oso.png', bytes: png(256, 256) }, // PNG donde va WebP
    { ruta: 'fichas/piezas/rata.webp', bytes: webp(512, 512) }, // no mide lo exacto
    { ruta: 'fichas/piezas/hormiga.webp', bytes: webp(256, 256, 200 * 1024) }, // pesa demasiado y no está en la lista
    { ruta: 'fichas/piezas/Cisne_Negro.webp', bytes: webp(256, 256) }, // nombre no válido
    { ruta: 'tarjetas/dorsos/fortuna.webp', bytes: webp(384, 512) }, // sin créditos
    { ruta: 'otra-carpeta/cosa.webp', bytes: webp(256, 256) }, // carpeta no prevista
  ], `${CREDITOS}| \`fichas/piezas/oso.png\`, \`otra-carpeta/cosa.webp\` | (completar) |\n`, { esperados: ESPERADOS });
  const motivos = Object.fromEntries(problemas.map(p => [p.ruta, p.motivos.join('; ')]));
  assert.match(motivos['fichas/piezas/toro.webp'], /es PNG pero se llama \.webp/);
  assert.match(motivos['fichas/piezas/oso.png'], /va en \.webp/);
  assert.match(motivos['fichas/piezas/rata.webp'], /mide 512×512 px \(debe medir 256×256\)/);
  assert.match(motivos['fichas/piezas/hormiga.webp'], /pesa 200 KB \(máximo 60\)/);
  assert.match(motivos['fichas/piezas/hormiga.webp'], /no está en la lista de docs\/VISUALES\.md/);
  assert.match(motivos['fichas/piezas/Cisne_Negro.webp'], /minúsculas, sin tildes/);
  assert.match(motivos['tarjetas/dorsos/fortuna.webp'], /no está anotada en CREDITOS\.md/);
  assert.match(motivos['otra-carpeta/cosa.webp'], /carpeta que no está en docs\/VISUALES\.md/);
  assert.equal(generales.length, 1);
});

test('las imágenes de public/visuales/ cumplen las reglas y tienen sus créditos', () => {
  const { problemas, generales, esperados } = revisarCarpeta();
  assert.deepEqual(problemas.map(p => `${p.ruta}: ${p.motivos.join('; ')}`), []);
  assert.deepEqual(generales, []);
  assert.equal(esperados.length, 141);
});

test('la hoja de contactos muestra las imágenes hechas y marca las que faltan', () => {
  const html = construirHoja(['fichas/piezas/rata.webp', 'tablero/barrios/feria.svg', 'tablero/barrios/talleres.svg'], new Map([
    ['fichas/piezas/rata.webp', { svg: undefined, valido: true }],
    ['tablero/barrios/feria.svg', { svg: SVG_BIEN, valido: true }],
  ]));
  assert.match(html, /Hechas 2 de 3/);
  assert.match(html, /<img src="\.\.\/public\/visuales\/fichas\/piezas\/rata\.webp" style="width:48px"/);
  assert.match(html, /<svg width="24" height="24" xmlns/);
  assert.match(html, /falta<\/div><figcaption>talleres\.svg/);
  assert.ok(LIMITES.reglas.length > 10);
});
