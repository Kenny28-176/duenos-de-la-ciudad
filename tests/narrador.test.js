// El narrador (src/ui/narrador.js): cada evento que emite el motor en partidas de verdad tiene su frase, en español y en
// inglés, sin marcadores sueltos ni claves que falten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';
import { unirDiccionarios } from '../src/i18n/traducir.js';
import { EVENTOS_SIN_FRASE, crearNarrador } from '../src/ui/narrador.js';

const motor = crearMotor(await cargarDatos());

async function diccionario(idioma) {
  const partes = [];
  for (const parte of ['juego', 'narrador', 'errores', 'interfaz']) {
    partes.push(JSON.parse(await readFile(new URL(`../src/i18n/${idioma}/${parte}.json`, import.meta.url), 'utf8')));
  }
  return unirDiccionarios(...partes);
}
const es = await diccionario('es');
const en = await diccionario('en');
const narradores = {
  es: crearNarrador({ dic: es, idioma: 'es' }),
  en: crearNarrador({ dic: en, base: es, idioma: 'en' }),
};

// Los eventos de varias partidas, con el estado de cada momento. Hay semillas con 2 a 8 jugadores y una sala sin
// habilidades, para que salgan casi todos los tipos de evento.
const eventos = [];
for (let n = 2; n <= 8; n++) {
  for (const semilla of [11, 12, 13]) {
    simularPartida(motor, {
      semilla: semilla * 100 + n,
      fichas: fichasParaPartida(motor, semilla, n),
      alEvento: (e, s) => eventos.push({ e, s: structuredClone(s) }),
    });
  }
}

test('cada evento de las partidas tiene una frase, salvo los que se ven de otra forma', () => {
  const sinFrase = new Set();
  for (const idioma of ['es', 'en']) {
    for (const { e, s } of eventos) {
      const frase = narradores[idioma].frase(e, s);
      if (frase === null) {
        sinFrase.add(e.type);
        continue;
      }
      const donde = `${idioma}: ${e.type} → «${frase}»`;
      assert.ok(frase.trim().length > 0, donde);
      assert.ok(!/[{}]/.test(frase), `marcador sin sustituir (${donde})`);
      assert.ok(!frase.includes('evento.') && !frase.includes('casilla.') && !frase.includes('barrio.'), `clave sin traducir (${donde})`);
      assert.ok(!/ {2,}| [.,:]/.test(frase), `hueco de un dato que falta (${donde})`);
    }
  }
  assert.deepEqual([...sinFrase].sort(), [...EVENTOS_SIN_FRASE].sort());
});

test('en las partidas simuladas salen casi todos los tipos de evento (así la prueba de arriba sirve)', () => {
  const tipos = new Set(eventos.map(({ e }) => e.type));
  assert.ok(tipos.size >= 28, `solo ${tipos.size} tipos: ${[...tipos].join(', ')}`);
  for (const imprescindible of ['dados', 'mover', 'compra', 'alquiler', 'construir', 'subastaGanada', 'carta', 'fin']) {
    assert.ok(tipos.has(imprescindible), imprescindible);
  }
});

test('las frases usan el nombre del jugador, el de la casilla y el dinero con su formato', () => {
  const s = { jugadores: { j1: { nombre: 'Ana' }, j2: { nombre: 'Beto' } } };
  const compra = { type: 'compra', id: 'j1', casilla: 1, precio: 1250 };
  assert.match(narradores.es.frase(compra, s), /Ana.*Calle del Hierro.*1\.250 \$/);
  assert.match(narradores.en.frase(compra, s), /Ana.*Iron Street.*\$1,250/);
  const deuda = { type: 'deuda', id: 'j1', acreedor: 'banco', cantidad: 80, motivo: 'impuesto' };
  assert.match(narradores.es.frase(deuda, s), /el banco/);
  assert.match(narradores.en.frase(deuda, s), /the bank/);
});

test('con las mismas variantes de principio a fin, la misma partida se cuenta igual', () => {
  const contar = () => {
    const narrador = crearNarrador({ dic: es, idioma: 'es' });
    return eventos.slice(0, 400).map(({ e, s }) => narrador.frase(e, s));
  };
  assert.deepEqual(contar(), contar());
});

test('quien llama puede elegir cómo se nombra a los jugadores', () => {
  const narrador = crearNarrador({ dic: es, idioma: 'es', nombreJugador: (s, id) => `jugador ${id}` });
  assert.match(narrador.frase({ type: 'salida', id: 'j3' }, { jugadores: {} }), /jugador j3/);
});
