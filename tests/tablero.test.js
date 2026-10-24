// Las piezas del tablero que no necesitan navegador: la cola de animaciones y la partida de demostración entre bots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearCola } from '../src/ui/cola.js';
import { crearDemo } from '../src/ui/tablero/demo.js';
import { dibujarTablero, partirNombre } from '../src/ui/tablero/dibujo.js';
import { geometriaTablero } from '../src/ui/tablero/geometria.js';

const motor = crearMotor(await cargarDatos());
const espera = ms => new Promise(listo => setTimeout(listo, ms));

test('el dibujo del tablero tiene las 40 casillas, sus imágenes y las capas para lo que cambia', () => {
  const svg = dibujarTablero(motor.ctx, geometriaTablero());
  const casillas = [...svg.matchAll(/data-casilla="(\d+)"/g)].map(m => Number(m[1]));
  assert.deepEqual(casillas, Array.from({ length: 40 }, (_, i) => i));
  for (const capa of ['capa-duenos', 'capa-edificios', 'capa-marcadores', 'capa-fichas', 'plaza']) {
    assert.ok(svg.includes(`class="${capa}"`) || svg.includes(` ${capa}"`), `falta ${capa}`);
  }
  // Cada barrio pinta su franja con su color, y todas las imágenes salen de los datos.
  for (const b of Object.values(motor.ctx.barrios)) assert.ok(svg.includes(`fill: ${b.color}`), b.id);
  for (const imagen of ['tablero/barrios/talleres.svg', 'tablero/casillas/aeropuerto.svg', 'tablero/esquinas/salida.webp']) {
    assert.ok(svg.includes(`visuales/${imagen}`), imagen);
  }
  // Los textos se escapan.
  const conRaros = dibujarTablero(motor.ctx, geometriaTablero(), { texto: { nombre: () => 'A & <B>' } });
  assert.ok(conRaros.includes('A &amp; &lt;B&gt;') && !conRaros.includes('<B>'));
});

test('en la orientación normal ningún texto queda boca abajo; hacia fuera, cada lado mira a su borde', () => {
  const giros = orientacion => [...dibujarTablero(motor.ctx, geometriaTablero(), { orientacion }).matchAll(/rotate\((-?\d+)\)/g)].map(m => Number(m[1]));
  assert.ok(!giros('derechos').includes(180));
  assert.deepEqual([...new Set(giros('hacia-fuera'))].sort((a, b) => a - b), [0, 90, 180, 270]);
  assert.throws(() => dibujarTablero(motor.ctx, geometriaTablero(), { orientacion: 'torcida' }), /Orientación desconocida/);
});

test('los nombres largos se parten en líneas sin cortar palabras', () => {
  assert.deepEqual(partirNombre('Calle de los Puestos', 12), ['Calle de los', 'Puestos']);
  assert.deepEqual(partirNombre('Aeropuerto', 12), ['Aeropuerto']);
  assert.deepEqual(partirNombre('uno dos tres cuatro cinco seis', 4, 3), ['uno', 'dos', 'tres cuatro cinco seis']);
});

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
