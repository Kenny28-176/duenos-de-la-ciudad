// Los premios del final (src/ui/tablero/premios.js): las cuentas salen de los eventos del motor y los premios van a quien tiene más,
// sin empates y repartidos entre los jugadores. También en partidas enteras entre bots, y con sus textos en los dos idiomas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';
import { PREMIOS, anotar, premios } from '../src/ui/tablero/premios.js';

const motor = crearMotor(await cargarDatos());

test('las cuentas salen de los eventos: alquileres, dividendos, obras, subastas, tratos, Calabozo y dobles', () => {
  const cuentas = anotar({}, [
    { type: 'dinero', de: 'j1', a: 'j2', cantidad: 120, motivo: 'alquiler' },
    { type: 'dinero', de: 'j3', a: 'j2', cantidad: 80, motivo: 'alquiler' },
    { type: 'dinero', de: 'banco', a: 'j3', cantidad: 45, motivo: 'dividendo' },
    { type: 'dinero', de: 'banco', a: 'j1', cantidad: 200, motivo: 'sueldo' },
    { type: 'alquiler', id: 'j1', a: 'j2', casilla: 3, cantidad: 120 }, // el alquiler ya se cuenta con su dinero
    { type: 'construir', id: 'j2', casilla: 3, nivel: 1 }, { type: 'construir', id: 'j2', casilla: 3, nivel: 2 },
    { type: 'subastaGanada', id: 'j3', casilla: 5, cantidad: 140 },
    { type: 'tratoAceptado', trato: 't1', de: 'j1', para: 'j3' },
    { type: 'alCalabozo', id: 'j1', motivo: 'auditoria' },
    { type: 'dados', id: 'j1', dados: [3, 3] }, { type: 'dados', id: 'j1', dados: [2, 5] }, { type: 'dados', id: 'j2', dados: [4, 4, 1] },
  ]);
  assert.deepEqual(cuentas, {
    j1: { alquilerPagado: 120, tratos: 1, calabozo: 1, dobles: 1 },
    j2: { alquilerCobrado: 200, edificios: 2, dobles: 1 },
    j3: { alquilerPagado: 80, dividendos: 45, subastas: 1, tratos: 1 },
  });
});

test('cada premio va a quien tiene más, sin empates, y se reparten entre los jugadores antes de repetir', () => {
  const cuentas = {
    j1: { alquilerCobrado: 900, edificios: 4, dobles: 2, calabozo: 3 },
    j2: { alquilerCobrado: 300, edificios: 4, dividendos: 50, alquilerPagado: 700 },
    j3: { subastas: 2, dobles: 2 },
  };
  const todos = premios(cuentas, ['j1', 'j2', 'j3'], { maximo: 8 });
  // Los edificios y los dobles están empatados: no hay premio.
  assert.deepEqual(todos.map(p => [p.id, p.jugador]), [['casero', 'j1'], ['bolsista', 'j2'], ['subastero', 'j3'], ['inquilino', 'j2'], ['preso', 'j1']]);
  assert.deepEqual(todos[0], { id: 'casero', jugador: 'j1', cifra: 900, dinero: true });
  // Con cuatro como mucho, primero uno para cada jugador.
  assert.deepEqual(premios(cuentas, ['j1', 'j2', 'j3']).map(p => p.id), ['casero', 'bolsista', 'subastero', 'inquilino']);
  assert.deepEqual(premios(cuentas, ['j1', 'j2', 'j3'], { maximo: 2 }).map(p => p.jugador), ['j1', 'j2']);
  assert.deepEqual(premios({}, ['j1', 'j2']), [], 'sin nada que contar, no hay premios');
});

test('en partidas enteras entre bots salen premios, y sus cifras cuadran con lo que pasó', () => {
  for (const semilla of [3, 8]) {
    const cuentas = {};
    let rentas = 0;
    const r = simularPartida(motor, {
      semilla, fichas: fichasParaPartida(motor, semilla, 4),
      alEvento: e => { anotar(cuentas, [e]); if (e.type === 'dinero' && e.motivo === 'alquiler') rentas += e.cantidad; },
    });
    const lista = premios(cuentas, Object.keys(cuentas));
    assert.ok(lista.length >= 2, `semilla ${semilla}: ${JSON.stringify(lista)}`);
    const cobrado = Object.values(cuentas).reduce((suma, c) => suma + (c.alquilerCobrado ?? 0), 0);
    assert.equal(cobrado, rentas, 'todo el alquiler cobrado está contado');
    assert.ok(r.turnos > 0);
  }
});

test('cada premio tiene su nombre y su detalle en los dos idiomas', () => {
  for (const idioma of ['es', 'en']) {
    const textos = JSON.parse(readFileSync(new URL(`../src/i18n/${idioma}/interfaz.json`, import.meta.url), 'utf8'));
    assert.ok(textos['fin.premios'], `${idioma}: fin.premios`);
    for (const { id, dinero } of PREMIOS) {
      assert.ok(textos[`premio.${id}`], `${idioma}: premio.${id}`);
      if (dinero) assert.match(textos[`premio.${id}.detalle`], /\{cifra:dinero\}/, `${idioma}: premio.${id}.detalle`);
      else for (const forma of ['uno', 'otros']) assert.match(textos[`premio.${id}.detalle.${forma}`], /\{n\}/, `${idioma}: premio.${id}.detalle.${forma}`);
    }
  }
});
