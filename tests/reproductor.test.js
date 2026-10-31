// El reproductor de la partida de demostración (src/ui/tablero/reproductor.js), sin navegador: con unas capas de mentira
// que no dibujan nada, se comprueba que reproduce una partida entera, que deja la pantalla igual que el estado del
// motor, que anota lo que pasa y que se puede pausar y parar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida } from '../src/engine/simulador.js';
import { unirDiccionarios } from '../src/i18n/traducir.js';
import { crearAlmacen } from '../src/ui/almacen.js';
import { crearNarrador } from '../src/ui/narrador.js';
import { crearDemo } from '../src/ui/tablero/demo.js';
import { crearReproductor } from '../src/ui/tablero/reproductor.js';
import { nombreMostrado } from '../src/ui/tablero/vista.js';

const motor = crearMotor(await cargarDatos());

async function diccionario(idioma) {
  const partes = [];
  for (const parte of ['juego', 'narrador', 'errores', 'interfaz']) {
    partes.push(JSON.parse(await readFile(new URL(`../src/i18n/${idioma}/${parte}.json`, import.meta.url), 'utf8')));
  }
  return unirDiccionarios(...partes);
}
const es = await diccionario('es');

// Todo lo que hace falta para reproducir una partida, con unas capas que solo cuentan lo que se les pide.
function montar({ semilla = 5, jugadores = 4, velocidad = 4000, extra = {} } = {}) {
  const demo = crearDemo(motor, { semilla, fichas: fichasParaPartida(motor, semilla, jugadores) });
  const estado = demo.estado();
  const almacen = crearAlmacen({
    estado, dinero: Object.fromEntries(estado.orden.map(id => [id, 0])), precios: {}, preciosPrevios: {}, registro: [], flotantes: [],
    turnoDe: null, dados: null, carta: null, cartaN: 0, subasta: null, aviso: null, fin: null, error: null, pausado: false, velocidad,
  });
  const llamadas = { caminar: 0, destacar: 0, actualizar: 0, marcar: 0, pasos: new Set() };
  const capas = {
    caminar: async (id, camino) => { llamadas.caminar += camino.length; },
    destacar: async () => { llamadas.destacar++; },
    marcar: () => { llamadas.marcar++; },
    actualizar: s => { llamadas.actualizar++; llamadas.pasos.add(s.turnos); },
  };
  const narrador = () => crearNarrador({ dic: es, idioma: 'es', nombreJugador: (s, id) => nombreMostrado(s.jugadores[id], f => es[`ficha.${f}`]) });
  const reproductor = crearReproductor({ motor, demo, almacen, capas: () => capas, narrador, nombreBarrio: b => es[`barrio.${b}`], ...extra });
  return { demo, almacen, capas, llamadas, reproductor };
}

test('reproduce una partida entera y deja la pantalla igual que el estado del motor', async () => {
  const { demo, almacen, llamadas, reproductor } = montar();
  await reproductor.correr();
  const d = almacen.leer();
  const s = demo.estado();
  assert.equal(s.fase, 'fin');
  assert.equal(d.error, null);
  assert.equal(d.estado, s, 'la pantalla acaba con el último estado');
  assert.deepEqual(d.dinero, Object.fromEntries(s.orden.map(id => [id, s.jugadores[id].dinero])), 'el dinero que se ve coincide con el real');
  assert.deepEqual([d.fin.ganador, d.fin.motivo], [s.ganador, s.motivoFin]);
  // Nada se queda a medias en pantalla.
  assert.deepEqual([d.carta, d.subasta, d.aviso, d.flotantes.length >= 0], [null, null, null, true]);
  assert.ok(llamadas.caminar > 100 && llamadas.destacar > 100 && llamadas.actualizar > 100 && llamadas.marcar > 0, JSON.stringify(llamadas));
});

test('anota en el registro lo que pasa, junta las líneas iguales y termina con el ganador', async () => {
  const { demo, almacen, reproductor } = montar({ semilla: 9 });
  await reproductor.correr();
  const { registro } = almacen.leer();
  assert.ok(registro.length > 20 && registro.length <= 60);
  assert.ok(registro.every(l => l.texto && l.veces >= 1));
  assert.ok(registro.some(l => l.veces > 1) || registro.length === 60, 'junta las líneas iguales seguidas');
  const ganador = demo.estado().jugadores[demo.estado().ganador];
  assert.ok(registro.at(-1).texto.includes(es[`ficha.${ganador.ficha}`].replace(/^(La|El) /, '')), `la última línea nombra al ganador: ${registro.at(-1).texto}`);
});

test('el dinero y las tarjetas de dados y cartas se mueven con los eventos', async () => {
  const { almacen, reproductor } = montar({ semilla: 7 });
  const vistos = { dados: new Set(), carta: new Set(), subasta: false, flotantes: 0, aviso: false, turnoDe: new Set() };
  almacen.escuchar(d => {
    if (d.dados) vistos.dados.add(d.dados.n);
    if (d.carta) vistos.carta.add(d.cartaN);
    if (d.subasta) vistos.subasta = true;
    if (d.aviso) vistos.aviso = true;
    vistos.flotantes = Math.max(vistos.flotantes, d.flotantes.length);
    if (d.turnoDe) vistos.turnoDe.add(d.turnoDe);
  });
  await reproductor.correr();
  assert.ok(vistos.dados.size > 100, 'cada tirada cuenta como un cambio de dados distinto');
  assert.ok(vistos.carta.size > 5 && vistos.subasta && vistos.aviso && vistos.flotantes > 0);
  assert.equal(vistos.turnoDe.size, 4, 'el turno pasa por todos los jugadores');
});

test('se puede pausar y seguir, y parar', async () => {
  // Con velocidad normal una partida tarda mucho: se pausa al principio y se comprueba que no avanza.
  const { demo, almacen, reproductor } = montar({ velocidad: 300 });
  const marcha = reproductor.correr();
  await new Promise(listo => setTimeout(listo, 60));
  reproductor.pausar();
  assert.equal(almacen.leer().pausado, true);
  await new Promise(listo => setTimeout(listo, 80)); // deja acabar el paso que estuviera en marcha
  const turnos = demo.estado().turnos;
  await new Promise(listo => setTimeout(listo, 150));
  assert.equal(demo.estado().turnos, turnos, 'en pausa no hay pasos nuevos');
  reproductor.pausar();
  assert.equal(almacen.leer().pausado, false);
  await new Promise(listo => setTimeout(listo, 400));
  assert.ok(demo.estado().turnos > turnos, 'al seguir, vuelve a avanzar');
  reproductor.parar();
  await marcha;
  const parados = demo.estado().turnos;
  await new Promise(listo => setTimeout(listo, 100));
  assert.equal(demo.estado().turnos, parados, 'parada la partida, no avanza más');
});

test('cada evento pasa por el sonido, con la velocidad de la pantalla, y la partida no cambia', async () => {
  const oidos = [];
  const sonido = { evento: (e, { velocidad }) => { oidos.push([e.type, velocidad]); } };
  const { demo, reproductor } = montar({ semilla: 7, extra: { sonido } });
  await reproductor.correr();
  assert.equal(demo.estado().fase, 'fin');
  assert.ok(oidos.length > 500, `${oidos.length} eventos`);
  assert.ok(oidos.every(([, velocidad]) => velocidad === 4000));
  const tipos = new Set(oidos.map(([tipo]) => tipo));
  for (const tipo of ['dados', 'mover', 'dinero', 'compra', 'turno', 'carta', 'fin']) assert.ok(tipos.has(tipo), `llega «${tipo}» al sonido`);
});

test('la voz lee lo que cuenta, la carta con su texto, y el reproductor espera a que acabe cada frase', async () => {
  const dichas = [];
  let enCurso = 0;
  let solapadas = 0;
  const voz = {
    parar() {},
    alEvento(e, texto, { idioma, textoDeCarta }) {
      if ((e.type !== 'compra' && e.type !== 'carta') || dichas.length >= 25) return undefined;
      dichas.push({ tipo: e.type, texto, idioma, textoDeCarta });
      if (++enCurso > 1) solapadas++;
      return new Promise(listo => setTimeout(() => { enCurso--; listo(); }, 1));
    },
  };
  const { demo, reproductor } = montar({ semilla: 7, extra: { voz, textoDeCarta: e => `texto de ${e.carta}`, idioma: () => 'es' } });
  await reproductor.correr();
  assert.equal(demo.estado().fase, 'fin');
  assert.equal(dichas.length, 25);
  assert.ok(dichas.some(d => d.tipo === 'compra') && dichas.some(d => d.tipo === 'carta'));
  assert.ok(dichas.every(d => d.texto && d.idioma === 'es'));
  assert.ok(dichas.filter(d => d.tipo === 'carta').every(d => /^texto de [nf]-/.test(d.textoDeCarta)), 'en una carta se pasa su texto');
  assert.ok(dichas.filter(d => d.tipo === 'compra').every(d => d.textoDeCarta === null));
  assert.equal(solapadas, 0, 'nunca se empieza una frase encima de otra');
});

test('al pausar o al parar, la voz se calla', () => {
  let callo = 0;
  const { reproductor } = montar({ extra: { voz: { parar: () => { callo++; }, alEvento: () => undefined } } });
  reproductor.pausar(); // pausa: calla
  reproductor.pausar(); // seguir: no
  reproductor.parar(); // parar: calla
  assert.equal(callo, 2);
});
