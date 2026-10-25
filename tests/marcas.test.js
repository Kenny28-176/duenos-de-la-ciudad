// Red de seguridad legal: ningún archivo del repositorio (ni su nombre) menciona marcas ni elementos conocidos de
// juegos comerciales del mismo género: sus nombres, personajes, calles, mazos o frases célebres. Ver «Reglas de
// contenido» en CLAUDE.md.
//
// La lista va codificada en base64 para que este archivo no se detecte a sí mismo y para no escribir esas palabras en
// claro en el repositorio. Cada entrada es un trozo de texto que no puede aparecer, sin distinguir mayúsculas ni
// tildes. Para añadir una:  node -e "console.log(Buffer.from('texto').toString('base64'))"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

const PROHIBIDAS = [
  'bW9ub3BvbA==',
  'b3BvbHk=',
  'b3BvbGlv',
  'aGFzYnJv',
  'cGFya2VyIGJyb3RoZXJz',
  'cGVubnliYWdz',
  'cmljaCB1bmNsZQ==',
  'Ym9hcmR3YWxr',
  'cGFyayBwbGFjZQ==',
  'bWFydmluIGdhcmRlbnM=',
  'dmVudG5vcg==',
  'aWxsaW5vaXMgYXZlbnVl',
  'Y2hhcmxlcyBwbGFjZQ==',
  'cmVhZGluZyByYWlscm9hZA==',
  'Y29tbXVuaXR5IGNoZXN0',
  'Y2FqYSBkZSBjb211bmlkYWQ=',
  'ZnJlZSBwYXJraW5n',
  'cGFya2luZyBncmF0dWl0bw==',
  'Z28gdG8gamFpbA==',
  'dmUgYSBsYSBjYXJjZWw=',
  'b3V0IG9mIGphaWwgZnJlZQ==',
  'bGlicmUgZGUgbGEgY2FyY2Vs',
  'anVzdCB2aXNpdGluZw==',
  'Zm9ydHVuZSBzdHJlZXQ=',
  'aXRhZGFraQ==',
  'Ym9vbSBzdHJlZXQ=',
  'cGFzZW8gZGVsIHByYWRv',
  'cm9uZGEgZGUgdmFsZW5jaWE=',
  'bGF2YXBpZXM=',
  'YnJhd2wgc3RhcnM=',
  'c3VwZXJjZWxs',
  'cGF5ZGF5',
  'cGF5IGRheQ==',
  'eW91ciBiaXJ0aGRheQ==',
  'YWR2YW5jZSB0byBzdGFydA==',
  'YWR2YW5jZSB0byB0aGUgbmVhcmVzdA==',
  'bG9ja3VwIGZyZWU=',
  'bG9ja3VwIGZvciBmcmVl',
  'ZGlyZWN0bHkgdG8gdGhlIGxvY2t1cA==',
  'Z3JhdGlzIGRlbCBjYWxhYm96bw==',
  'bGlicmUgZGVsIGNhbGFib3pv',
];

// Archivos que no son texto (solo se revisa su nombre) y carpetas que no son del proyecto.
const BINARIO = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf|mp3|ogg|wav|pdf|zip)$/i;
const AJENAS = ['node_modules/', '_sitio/', 'public/vendor/'];

const normalizar = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const palabras = PROHIBIDAS.map(p => normalizar(Buffer.from(p, 'base64').toString('utf8')));
const encontrar = texto => palabras.filter(p => normalizar(texto).includes(p));

// Los archivos del repositorio: los que sigue git y los nuevos que no están ignorados (ver .gitignore).
function archivosDelRepositorio() {
  try {
    const salida = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: RAIZ });
    return salida.toString('utf8').split('\0').filter(Boolean);
  } catch {
    // Sin git (por ejemplo, un .zip descargado): se recorre la carpeta saltando lo que nunca se publica.
    const recorrer = dir => readdirSync(dir).flatMap(nombre => {
      const ruta = join(dir, nombre);
      const rel = relative(RAIZ, ruta).replaceAll('\\', '/');
      if (['.git', 'node_modules', '_sitio', 'Documentos', 'PLAN.md'].includes(rel)) return [];
      return statSync(ruta).isDirectory() ? recorrer(ruta) : [rel];
    });
    return recorrer(RAIZ);
  }
}

test('la lista de palabras prohibidas se lee bien y detecta lo que debe', () => {
  assert.ok(palabras.length > 10);
  assert.ok(palabras.every(p => p.length >= 4 && p === p.trim()));
  assert.deepEqual(encontrar(`Un texto cualquiera con ${palabras[3].toUpperCase()} en medio`), [palabras[3]]);
  assert.deepEqual(encontrar('La Calle del Hierro está en Los Talleres'), []);
});

test('ningún archivo del repositorio, ni su nombre, menciona marcas o elementos de juegos comerciales del género', () => {
  const mal = [];
  for (const archivo of archivosDelRepositorio()) {
    if (AJENAS.some(carpeta => archivo.startsWith(carpeta))) continue;
    for (const p of encontrar(archivo)) mal.push(`${archivo} (en el nombre): «${p}»`);
    if (BINARIO.test(archivo)) continue;
    let texto;
    try { texto = readFileSync(join(RAIZ, archivo), 'utf8'); } catch { continue; } // borrado pero aún en el índice
    for (const p of encontrar(texto)) mal.push(`${archivo}: «${p}»`);
  }
  assert.deepEqual(mal, []);
});
