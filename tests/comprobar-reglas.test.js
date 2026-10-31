// La herramienta que comprueba las reglas contra el Firebase de verdad (tools/comprobar-reglas.js), probada contra la imitación de
// Firebase: así, el día que se use con el proyecto real, se sabe que lo que falle es de Firebase o de las reglas, no de la herramienta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comprobarReglas } from '../tools/comprobar-reglas.js';
import { crearFirebaseFalso } from '../tools/firebase-falso.js';
import { FuenteDeEventos } from '../tools/fuente-de-eventos.js';

test('contra la imitación de Firebase, todas las comprobaciones de las reglas salen como deben', async () => {
  const falso = crearFirebaseFalso();
  await falso.arrancar();
  try {
    const { comprobaciones, codigo } = await comprobarReglas({ config: falso.config(), crearFuente: url => new FuenteDeEventos(url, { reintento: 30 }) });
    const mal = comprobaciones.filter(c => !c.ok).map(c => `${c.que}: ${c.resultado}`);
    assert.deepEqual(mal, []);
    assert.ok(comprobaciones.length >= 25);
    assert.ok(comprobaciones.some(c => c.esperado === 'rechazado') && comprobaciones.some(c => c.esperado === 'permitido'));
    assert.equal(falso.datos()?.salas?.[codigo], undefined, 'no deja la sala de prueba');
  } finally {
    await falso.cerrar();
  }
});
