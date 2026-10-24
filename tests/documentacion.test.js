// La documentación no tiene enlaces rotos: cada enlace relativo apunta a un archivo que existe (así, renombrar o mover
// un documento no deja enlaces a medias).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DOCUMENTOS = [
  'README.md', 'README.en.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'AVISO_LEGAL.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'CHANGELOG.md',
  ...readdirSync(join(RAIZ, 'docs')).filter(f => f.endsWith('.md')).map(f => `docs/${f}`),
];

test('los enlaces relativos de la documentación apuntan a archivos que existen', () => {
  const rotos = [];
  for (const doc of DOCUMENTOS) {
    const texto = readFileSync(join(RAIZ, doc), 'utf8');
    for (const [, destino] of texto.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/i.test(destino)) continue;
      const ruta = decodeURIComponent(destino.split('#')[0]);
      if (!existsSync(join(RAIZ, dirname(doc), ruta))) rotos.push(`${doc}: ${destino}`);
    }
  }
  assert.deepEqual(rotos, []);
});
