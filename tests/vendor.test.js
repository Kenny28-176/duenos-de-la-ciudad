// Comprueba la integridad de las bibliotecas y tipografías locales de public/vendor/:
//   - cada archivo listado en vendor.json existe y su huella SHA-256 coincide;
//   - no hay archivos sobrantes ni huérfanos en public/vendor/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR_DIR = join(RAIZ, 'public', 'vendor');
const VENDOR_JSON_PATH = join(VENDOR_DIR, 'vendor.json');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function listarArchivos(dir) {
  const archivos = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      archivos.push(...listarArchivos(ruta));
    } else {
      archivos.push(ruta);
    }
  }
  return archivos;
}

test('cada archivo de vendor.json existe y su SHA-256 coincide', () => {
  assert.ok(existsSync(VENDOR_JSON_PATH), 'debe existir public/vendor/vendor.json');
  const data = JSON.parse(readFileSync(VENDOR_JSON_PATH, 'utf8'));

  assert.ok(data.generado, 'debe tener campo "generado"');
  assert.ok(data.librerias, 'debe tener objeto "librerias"');

  for (const [id, lib] of Object.entries(data.librerias)) {
    assert.ok(lib.nombre, `librería ${id} debe tener nombre`);
    assert.ok(lib.version, `librería ${id} debe tener versión`);
    assert.ok(lib.licencia, `librería ${id} debe tener licencia`);
    assert.ok(Array.isArray(lib.archivos) && lib.archivos.length > 0, `librería ${id} debe tener archivos`);

    for (const arch of lib.archivos) {
      const ruta = join(VENDOR_DIR, arch.destino);
      assert.ok(existsSync(ruta), `archivo no existe: ${arch.destino}`);
      const bytes = readFileSync(ruta);
      assert.equal(bytes.length, arch.bytes, `tamaño incorrecto en ${arch.destino}`);
      const hash = sha256(bytes);
      assert.equal(hash, arch.sha256, `SHA-256 no coincide en ${arch.destino}`);
      assert.ok(bytes.length <= 200 * 1024, `el archivo ${arch.destino} no debe exceder 200 KB`);
    }
  }
});

test('en public/vendor/ no hay ningún archivo que no esté en vendor.json (salvo LEEME.md y vendor.json)', () => {
  const data = JSON.parse(readFileSync(VENDOR_JSON_PATH, 'utf8'));
  const esperados = new Set();

  for (const lib of Object.values(data.librerias)) {
    for (const arch of lib.archivos) {
      esperados.add(arch.destino.replaceAll('\\', '/'));
    }
  }

  const ignorables = new Set(['vendor.json', 'LEEME.md']);
  const encontrados = listarArchivos(VENDOR_DIR).map(f => relative(VENDOR_DIR, f).replaceAll('\\', '/'));

  for (const f of encontrados) {
    if (ignorables.has(f)) continue;
    assert.ok(esperados.has(f), `archivo no registrado en vendor.json: ${f}`);
  }

  assert.equal(encontrados.length, esperados.size + ignorables.size, 'la cantidad total de archivos debe coincidir');
});
