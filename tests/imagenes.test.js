// Las imágenes de public/visuales/ cumplen las reglas de docs/VISUALES.md: formato real igual a la extensión y permitido
// en su carpeta, tamaño y peso máximos, y créditos anotados. Si falla, la herramienta que generó la imagen debe
// ejecutar «python tools/optimizar-imagenes.py --aplicar» y anotarla en public/visuales/CREDITOS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubre, dimensiones, patronesDeCreditos, reglaPara, revisarCarpeta, revisarImagenes, tipoReal } from '../tools/revisar-imagenes.js';

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
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"></svg>');
const CREDITOS = '| Archivos | Autoría |\n|---|---|\n| `fichas/piezas/*.webp`, `botones/acciones/*.svg` | IA |\n| `marca/portada.webp` | IA |\n';

test('lee el tipo real y las dimensiones de las imágenes', () => {
  assert.equal(tipoReal(png(10, 20)), 'png');
  assert.equal(tipoReal(webp(10, 20)), 'webp');
  assert.equal(tipoReal(svg), 'svg');
  assert.equal(tipoReal(Buffer.from('hola')), null);
  assert.deepEqual(dimensiones(png(300, 200)), { ancho: 300, alto: 200 });
  assert.deepEqual(dimensiones(webp(512, 384)), { ancho: 512, alto: 384 });
});

test('cada carpeta tiene su regla de tamaño y formato', () => {
  assert.equal(reglaPara('marca/portada.webp').lado, 1600);
  assert.deepEqual(reglaPara('marca/icono-512.png').formatos, ['png']);
  assert.equal(reglaPara('tablero/centro/ciudad.webp').lado, 1024);
  assert.equal(reglaPara('fichas/piezas/rata.webp').lado, 512);
  assert.deepEqual(reglaPara('botones/acciones/comprar.svg').formatos, ['webp', 'svg']);
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
    { ruta: 'botones/acciones/comprar.svg', bytes: svg },
    { ruta: 'marca/portada.webp', bytes: webp(1600, 900) },
  ], CREDITOS);
  assert.deepEqual(bien, { problemas: [], generales: [] });

  const { problemas, generales } = revisarImagenes([
    { ruta: 'fichas/piezas/toro.webp', bytes: png(256, 256) }, // es PNG con nombre .webp
    { ruta: 'fichas/piezas/oso.png', bytes: png(256, 256) }, // PNG donde va WebP
    { ruta: 'fichas/piezas/taza.webp', bytes: webp(1024, 1024) }, // demasiado grande
    { ruta: 'fichas/piezas/hormiga.webp', bytes: webp(256, 256, 200 * 1024) }, // pesa demasiado
    { ruta: 'tarjetas/dorsos/fortuna.webp', bytes: webp(366, 512) }, // sin créditos
  ], `${CREDITOS}| \`fichas/piezas/oso.png\` | (completar) |\n`);
  const motivos = Object.fromEntries(problemas.map(p => [p.ruta, p.motivos.join('; ')]));
  assert.match(motivos['fichas/piezas/toro.webp'], /es PNG pero se llama \.webp/);
  assert.match(motivos['fichas/piezas/oso.png'], /va en \.webp o \.svg/);
  assert.match(motivos['fichas/piezas/taza.webp'], /mide 1024×1024 px \(máximo 512\)/);
  assert.match(motivos['fichas/piezas/hormiga.webp'], /pesa 200 KB \(máximo 120\)/);
  assert.match(motivos['tarjetas/dorsos/fortuna.webp'], /no está anotada en CREDITOS\.md/);
  assert.equal(generales.length, 1);
});

test('las imágenes de public/visuales/ cumplen las reglas y tienen sus créditos', () => {
  const { problemas, generales } = revisarCarpeta();
  assert.deepEqual(problemas.map(p => `${p.ruta}: ${p.motivos.join('; ')}`), []);
  assert.deepEqual(generales, []);
});
