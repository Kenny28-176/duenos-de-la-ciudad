// Los movimientos de dinero de cada jugador (anfitrion.js): el tablero anota cada «dinero» que el motor emite y publica en la vista de cada
// celular (solo la suya: solo la lee su dueño) los últimos, con su motivo, para que el celular enseñe de dónde viene y a dónde va su dinero.
// Se guardan por número, no por posición, para que cada movimiento nuevo escriba una sola entrada en la base (y borre la más vieja).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { codificar, diferencias } from '../src/net/codec.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';
import { MAX_MOVIMIENTOS } from '../src/net/protocolo.js';
import { jugarPorLaRed, paso } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());

const memoria = () => {
  const base = crearBaseDeDatos();
  return { conectar: uid => base.conectar(uid), asentar: () => base.reposo() };
};

const movimientosDe = celular => Object.entries(celular.datos().vista.movimientos ?? {}).map(([n, m]) => ({ n: Number(n), ...m }));
const efecto = (m, id) => (m.a === id ? m.cantidad : 0) - (m.de === id ? m.cantidad : 0);

test('cada celular recibe solo sus movimientos de dinero, y la suma de lo que ve cuadra con lo que tiene', async () => {
  const { conectar, asentar } = memoria();
  const sala = await jugarPorLaRed({ motor, conectar, asentar, jugadores: 3, semilla: 4, maxPasos: 6, meta: 5000 });
  try {
    for (const celular of sala.celulares) {
      const { estado, miId } = celular.datos();
      const movimientos = movimientosDe(celular);
      assert.ok(movimientos.length >= 1 && movimientos.length < MAX_MOVIMIENTOS, `${miId}: ${movimientos.length} movimientos (la prueba es corta: no se recorta nada)`);
      assert.ok(movimientos.some(m => m.motivo === 'inicial' && m.a === miId && m.de === 'banco'), 'el dinero inicial es el primero');
      for (const m of movimientos) {
        assert.ok(m.n >= 1, 'la numeración empieza en 1: así la lista nunca se confunde con una lista de Firebase');
        assert.ok(m.de === miId || m.a === miId, `${miId} solo ve lo que le toca`);
        assert.ok(m.cantidad > 0 && typeof m.motivo === 'string' && m.motivo.length);
      }
      assert.equal(movimientos.reduce((suma, m) => suma + efecto(m, miId), 0), estado.jugadores[miId].dinero, `${miId}: lo que ve suma lo que tiene`);
    }
    // Un movimiento entre dos jugadores lo ven los dos, con el mismo número.
    const [uno, dos] = sala.celulares.map(movimientosDe);
    const compartidos = uno.filter(m => dos.some(o => o.n === m.n));
    for (const m of compartidos) assert.deepEqual(dos.find(o => o.n === m.n), m);
  } finally {
    await sala.cerrar();
  }
});

test('de cada jugador solo se guardan los últimos movimientos, con números que crecen', async () => {
  const { conectar, asentar } = memoria();
  const sala = await jugarPorLaRed({ motor, conectar, asentar, jugadores: 3, semilla: 9, maxPasos: 150, meta: null });
  try {
    let llenos = 0;
    for (const celular of sala.celulares) {
      const numeros = movimientosDe(celular).map(m => m.n);
      assert.ok(numeros.length <= MAX_MOVIMIENTOS);
      assert.deepEqual(numeros, [...numeros].sort((a, b) => a - b), 'por número');
      assert.equal(new Set(numeros).size, numeros.length);
      assert.equal(Array.isArray(celular.datos().vista.movimientos), false, 'un mapa por número, no una lista');
      if (numeros.length === MAX_MOVIMIENTOS) llenos++;
    }
    assert.ok(llenos >= 1, 'en 150 pasos alguien llegó al máximo');
    assert.ok(sala.celulares.some(c => movimientosDe(c)[0].n > 1), 'los más viejos se fueron borrando');
  } finally {
    await sala.cerrar();
  }
});

test('al jugar otra vez los movimientos empiezan de cero, sin repetir números', async () => {
  const { conectar, asentar } = memoria();
  const sala = await jugarPorLaRed({ motor, conectar, asentar, jugadores: 3, semilla: 8, meta: 1500 });
  const { anfitrion, celulares } = sala;
  try {
    assert.equal(anfitrion.estado().fase, 'fin');
    const mayor = Math.max(...celulares.flatMap(c => movimientosDe(c).map(m => m.n)));
    assert.ok(mayor > 3);
    anfitrion.accionPropia({ type: 'revancha' });
    await paso(sala, { asentar });
    for (const c of celulares) assert.deepEqual(movimientosDe(c), [], 'la sala nueva no arrastra lo de la partida anterior');

    anfitrion.accionPropia({ type: 'empezar' });
    await paso(sala, { asentar });
    await paso(sala, { asentar });
    for (const c of celulares) {
      const nuevos = movimientosDe(c);
      assert.ok(nuevos.length >= 1 && nuevos.every(m => m.n > mayor), 'los números siguen subiendo');
      assert.equal(nuevos.reduce((suma, m) => suma + efecto(m, c.datos().miId), 0), c.datos().estado.jugadores[c.datos().miId].dinero);
    }
  } finally {
    await sala.cerrar();
  }
});

test('un movimiento nuevo escribe solo su entrada y borra la más vieja, no reescribe toda la lista', () => {
  const lleno = Object.fromEntries(Array.from({ length: MAX_MOVIMIENTOS }, (_, k) => [k + 1, { de: 'j1', a: 'banco', cantidad: 10 + k, motivo: 'impuesto' }]));
  const siguiente = { ...lleno, [MAX_MOVIMIENTOS + 1]: { de: 'j1', a: 'j2', cantidad: 50, motivo: 'alquiler' } };
  delete siguiente[1];
  const cambios = diferencias(codificar({ movimientos: lleno }), codificar({ movimientos: siguiente }), 'vista');
  const rutas = Object.keys(cambios);
  assert.ok(rutas.length <= 5, `${rutas.length} escrituras: ${rutas.join(', ')}`);
  assert.equal(cambios['vista/movimientos/1'], null, 'la más vieja se borra de una vez');
  assert.ok(rutas.filter(r => r.startsWith(`vista/movimientos/${MAX_MOVIMIENTOS + 1}`)).length >= 1, 'y la nueva se escribe');
  assert.ok(!rutas.some(r => /movimientos\/([2-9]|1[0-2])(\/|$)/.test(r)), 'las demás no se tocan');
});
