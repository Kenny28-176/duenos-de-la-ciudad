// Las claves de traducción que usa el código de las pantallas existen en los dos idiomas: si alguien escribe mal una
// («sala.empesar»), la pantalla enseñaría la clave tal cual. Solo se miran las claves escritas enteras en el código
// (t('sala.empezar')); las que se construyen (t(`ficha.${id}`)) las vigilan las pruebas de cada diccionario.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unirDiccionarios } from '../src/i18n/traducir.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

async function archivos(carpeta) {
  const salida = [];
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) salida.push(...await archivos(ruta));
    else if (entrada.name.endsWith('.js')) salida.push(ruta);
  }
  return salida;
}

async function diccionario(idioma) {
  const partes = [];
  for (const parte of ['juego', 'narrador', 'errores', 'interfaz']) {
    partes.push(JSON.parse(await readFile(join(RAIZ, `src/i18n/${idioma}/${parte}.json`), 'utf8')));
  }
  return unirDiccionarios(...partes);
}

test('todas las claves que se escriben enteras en el código de las pantallas existen en español e inglés', async () => {
  const dic = { es: await diccionario('es'), en: await diccionario('en') };
  const faltan = [];
  let usadas = 0;
  for (const archivo of await archivos(join(RAIZ, 'src/ui'))) {
    const texto = await readFile(archivo, 'utf8');
    // t('clave'...) y tn('clave', n...): tn usa clave.uno y clave.otros.
    for (const m of texto.matchAll(/\b(tn?)\(\s*'([a-z0-9_.-]+)'/g)) {
      usadas++;
      const claves = m[1] === 'tn' ? [`${m[2]}.uno`, `${m[2]}.otros`] : [m[2]];
      for (const idioma of ['es', 'en']) {
        for (const clave of claves) if (dic[idioma][clave] === undefined) faltan.push(`${idioma}: ${clave} (${archivo.slice(RAIZ.length)})`);
      }
    }
  }
  assert.ok(usadas > 40, `solo se encontraron ${usadas} usos de t()`);
  assert.deepEqual(faltan, []);
});
