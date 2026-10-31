// El reloj del límite de tiempo (src/ui/tablero/reloj.js): una cuenta pura, sin temporizadores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearReloj } from '../src/ui/tablero/reloj.js';

test('sin límite, el reloj no vence nunca ni dice cuánto queda', () => {
  const reloj = crearReloj();
  reloj.avanzar(99 * 3600 * 1000);
  assert.deepEqual([reloj.vencido(), reloj.restanteMs(), reloj.minutosQueQuedan()], [false, null, null]);
});

test('con límite, cuenta los minutos que quedan hacia arriba y vence al llegar a cero', () => {
  const reloj = crearReloj({ limiteMinutos: 45 });
  assert.equal(reloj.minutosQueQuedan(), 45);
  reloj.avanzar(1000);
  assert.equal(reloj.minutosQueQuedan(), 45, 'con 44 min 59 s por delante, quedan 45');
  reloj.avanzar(44 * 60000 - 1000);
  assert.equal(reloj.minutosQueQuedan(), 1);
  assert.equal(reloj.vencido(), false);
  reloj.avanzar(59999);
  assert.deepEqual([reloj.minutosQueQuedan(), reloj.vencido()], [1, false]);
  reloj.avanzar(1);
  assert.deepEqual([reloj.minutosQueQuedan(), reloj.vencido(), reloj.restanteMs()], [0, true, 0]);
  reloj.avanzar(60000);
  assert.deepEqual([reloj.minutosQueQuedan(), reloj.restanteMs()], [0, 0], 'no baja de cero');
});

test('se puede retomar donde se dejó, y el factor acelera la cuenta (para las pruebas)', () => {
  const retomado = crearReloj({ limiteMinutos: 60, jugadoMs: 50 * 60000 });
  assert.equal(retomado.minutosQueQuedan(), 10);
  const rapido = crearReloj({ limiteMinutos: 1, factor: 600 });
  rapido.avanzar(100);
  assert.equal(rapido.vencido(), true, '100 ms × 600 = 60 s');
  const sin = crearReloj({ limiteMinutos: 1 });
  sin.avanzar(-500);
  assert.equal(sin.jugado(), 0, 'el tiempo no va hacia atrás');
});
