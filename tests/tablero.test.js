// Las piezas del tablero que no necesitan navegador: la cola de animaciones y la partida de demostración entre bots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearCola } from '../src/ui/cola.js';
import { crearDemo } from '../src/ui/tablero/demo.js';

const motor = crearMotor(await cargarDatos());
const espera = ms => new Promise(listo => setTimeout(listo, ms));

test('la cola reproduce los eventos en orden, aunque lleguen mientras otros se animan', async () => {
  const registro = [];
  const animar = ms => async e => {
    registro.push(`empieza ${e.n}`);
    await espera(ms);
    registro.push(`acaba ${e.n}`);
  };
  const cola = crearCola({ lento: animar(20), rapido: animar(1) });
  cola.reproducir([{ type: 'lento', n: 1 }, { type: 'sinAnimacion', n: 2 }, { type: 'rapido', n: 3 }]);
  const ultimo = cola.reproducir([{ type: 'rapido', n: 4 }]);
  assert.equal(cola.ocupada(), true);
  await ultimo;
  // Ninguna animación empieza antes de que acabe la anterior; la del evento sin animador no existe.
  assert.deepEqual(registro, ['empieza 1', 'acaba 1', 'empieza 3', 'acaba 3', 'empieza 4', 'acaba 4']);
  assert.equal(cola.ocupada(), false);
});

test('si una animación falla, la cola avisa y sigue', async () => {
  const fallos = [];
  const vistos = [];
  const cola = crearCola({
    roto: async () => {
      throw new Error('sin imagen');
    },
    bien: async e => vistos.push(e.n),
  }, { alFallar: (error, e) => fallos.push([error.message, e.type]) });
  await cola.reproducir([{ type: 'roto' }, { type: 'bien', n: 1 }]);
  assert.deepEqual(fallos, [['sin imagen', 'roto']]);
  assert.deepEqual(vistos, [1]);
});

test('la demostración juega una partida entera entre bots, paso a paso', () => {
  const demo = crearDemo(motor, { semilla: 11, fichas: ['rata', 'toro', 'oso', 'burbuja'] });
  const primero = demo.paso();
  assert.equal(primero.accion.type, 'empezar');
  assert.ok(primero.eventos.some(e => e.type === 'empieza'));
  let pasos = 1;
  while (demo.paso()) {
    pasos++;
    assert.ok(pasos < 60000, 'la partida no termina');
  }
  assert.equal(demo.estado().fase, 'fin');
  assert.ok(demo.estado().ganador);
  assert.equal(demo.paso(), null);
});

test('con la misma semilla, la demostración repite la misma partida', () => {
  const jugar = () => {
    const demo = crearDemo(motor, { semilla: 5, fichas: ['hormiga', 'tiburon', 'taza'] });
    const tipos = [];
    for (let k = 0; k < 300; k++) tipos.push(demo.paso()?.accion.type);
    return { tipos, estado: demo.estado() };
  };
  assert.deepEqual(jugar(), jugar());
});
