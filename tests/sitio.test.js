// La web publicada: todos los archivos a los que apuntan las páginas existen y no se carga nada de servidores externos.
// La compilación copia solo lo que necesita la web (ni pruebas, ni herramientas, ni documentos de trabajo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { construirSitio, revisarSitio } from '../tools/construir-sitio.js';

test('la web no depende de servidores externos y no hay referencias rotas', () => {
  assert.deepEqual(revisarSitio(), []);
});

test('la revisión detecta las dependencias externas y las referencias rotas', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'duenos-revision-'));
  try {
    mkdirSync(join(raiz, 'public'));
    writeFileSync(join(raiz, 'index.html'), '<a href="public/index.html">Entrar</a>');
    writeFileSync(join(raiz, 'public', 'index.html'), '<script src="https://cdn.example.com/x.js"></script><img src="falta.png">');
    const problemas = revisarSitio(raiz);
    assert.equal(problemas.length, 2, problemas.join('\n'));
    assert.ok(problemas.some(p => p.includes('servidor externo')));
    assert.ok(problemas.some(p => p.includes('falta.png')));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('la compilación copia solo la web y escribe version.json', () => {
  const salida = mkdtempSync(join(tmpdir(), 'duenos-sitio-'));
  try {
    const v = construirSitio(salida);
    for (const esperado of ['index.html', 'public/index.html', 'public/en/index.html', 'public/estilos.css', 'version.json']) {
      assert.ok(existsSync(join(salida, esperado)), `falta ${esperado}`);
    }
    for (const sobra of ['tests', 'tools', 'docs', '.github', 'node_modules', 'Documentos', 'PLAN.md', 'CLAUDE.md', 'package.json']) {
      assert.ok(!existsSync(join(salida, sobra)), `no debe publicarse ${sobra}`);
    }
    assert.equal(JSON.parse(readFileSync(join(salida, 'version.json'), 'utf8')).version, v.version);
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
});
