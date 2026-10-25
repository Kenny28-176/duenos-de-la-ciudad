// La base de la red: el codificador del estado (src/net/codec.js) y la base de datos en memoria (src/net/memoria.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { codificar, decodificar, diferencias, reconstruir, sinSecretos } from '../src/net/codec.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';

const motor = crearMotor(await cargarDatos());

// Una partida con algo de todo: dueños, edificios, efectos, una subasta y deudas.
function partidaConDeTodo() {
  let s = motor.nuevaPartida({ semilla: 3 });
  const hacer = a => {
    const r = motor.paso(s, a);
    assert.equal(r.error, null, r.error?.mensaje);
    s = r.state;
  };
  ['rata', 'toro', 'oso'].forEach((f, k) => hacer({ type: 'unirse', id: `j${k + 1}`, nombre: `Jugador ${k + 1}`, ficha: f }));
  hacer({ type: 'configurar', opciones: { dadosDePrueba: true } });
  hacer({ type: 'empezar' });
  s.props[1] = { dueno: 'j1', nivel: 2, hipotecada: false };
  s.props[3] = { dueno: 'j1', nivel: 2, hipotecada: true };
  s.jugadores.j2.acciones.talleres = 10;
  s.efectos.push({ tipo: 'rally', barrio: 'feria', factor: 1.3, hasta: 'j2' });
  s.subasta = { casilla: 4, origen: 'compra', puja: 40, lider: 'j2', activos: ['j1', 'j2'] };
  s.deudas.push({ id: 'j3', acreedor: 'banco', cantidad: 50, motivo: 'impuesto' });
  // Un trato con partes vacías (sin propiedades ni acciones): es lo que Firebase no guarda.
  s.tratos.t1 = {
    id: 't1', de: 'j1', para: 'j2',
    ofrece: { dinero: 50, propiedades: [], acciones: {}, salvoconductos: 0 },
    pide: { dinero: 0, propiedades: [1], acciones: { talleres: 5 }, salvoconductos: 1 },
  };
  s.opciones.meta = null;
  return s;
}

test('codificar quita lo que Firebase no guarda y las listas pasan a objetos con índices', () => {
  assert.equal(codificar(null), undefined);
  assert.equal(codificar({ a: null, b: {}, c: [] }), undefined, 'todo vacío no deja nada');
  assert.deepEqual(codificar({ a: 0, b: false, c: '', d: [], e: null }), { a: 0, b: false, c: '' });
  assert.deepEqual(codificar({ lista: ['x', 'y'], mapa: { k: [1] } }), { lista: { 0: 'x', 1: 'y' }, mapa: { k: { 0: 1 } } });
  // Ningún valor del árbol es null, undefined ni un objeto vacío.
  const revisar = nodo => {
    for (const v of Object.values(nodo)) {
      assert.ok(v !== null && v !== undefined);
      if (typeof v === 'object') { assert.ok(Object.keys(v).length > 0); revisar(v); }
    }
  };
  revisar(codificar(sinSecretos(partidaConDeTodo())));
});

test('los secretos (el azar y los mazos) no salen en el árbol', () => {
  const s = partidaConDeTodo();
  assert.ok(s.rng && s.mazos.noticias.length);
  const arbol = codificar(sinSecretos(s));
  assert.ok(!('rng' in arbol) && !('mazos' in arbol));
  assert.ok(!JSON.stringify(arbol).includes(s.mazos.fortuna[0]), 'ni el orden de las cartas');
});

test('decodificar devuelve el estado que se codificó (sin los secretos), con sus listas y valores vacíos', () => {
  const s = partidaConDeTodo();
  const plantilla = sinSecretos(motor.nuevaPartida({ semilla: 1 }));
  const vuelta = decodificar(codificar(sinSecretos(s)), plantilla);
  const original = sinSecretos(s);
  // Todo vuelve exactamente igual (menos los secretos): las listas, los null y lo que Firebase no guarda por estar vacío.
  assert.deepEqual(vuelta, original);
  assert.deepEqual(vuelta.subasta.activos, ['j1', 'j2']);
  assert.deepEqual(vuelta.jugadores.j2.acciones, { talleres: 10 });
  assert.equal(vuelta.props[4].dueno, null);
  // Codificar de nuevo da el mismo árbol: es un círculo cerrado.
  assert.deepEqual(codificar(vuelta), codificar(original));
});

test('una lista vacía sobrevive como lista, y una lista de un solo elemento no se confunde con un mapa', () => {
  const plantilla = { orden: [], efectos: [], tratos: {} };
  assert.deepEqual(decodificar(codificar({ orden: ['j1'], efectos: [], tratos: {} }), plantilla), { orden: ['j1'], efectos: [], tratos: {} });
  // Las casillas con dueño empiezan en la 1: nunca parecen una lista.
  assert.deepEqual(decodificar(codificar({ props: { 1: { dueno: 'j1' }, 3: { dueno: 'j2' } } }), {}).props, { 1: { dueno: 'j1' }, 3: { dueno: 'j2' } });
});

test('diferencias: solo lo que cambia, con null para lo que desaparece', () => {
  const antes = codificar({ a: { x: 1, y: 2 }, b: 5, c: { z: { w: 1 } }, d: 'igual' });
  const despues = codificar({ a: { x: 1, y: 3 }, c: null, e: { n: 1 }, d: 'igual', f: [7] });
  assert.deepEqual(diferencias(antes, despues), { 'a/y': 3, b: null, c: null, e: { n: 1 }, f: { 0: 7 } });
  assert.deepEqual(diferencias(antes, antes), {}, 'sin cambios, nada que escribir');
  assert.deepEqual(diferencias({}, { a: { b: 1 } }, 'salas/ABCD/estado'), { 'salas/ABCD/estado/a': { b: 1 } });
  assert.deepEqual(diferencias({ a: { b: 1 } }, { a: 7 }), { a: 7 }, 'un subárbol que pasa a ser un valor');
});

test('aplicar las diferencias a un árbol da el árbol nuevo (lo que hace la base de datos con update)', async () => {
  const a = codificar(sinSecretos(partidaConDeTodo()));
  const s2 = partidaConDeTodo();
  s2.jugadores.j1.dinero -= 220;
  s2.props[5] = { dueno: 'j1', nivel: 0, hipotecada: false };
  delete s2.props[3];
  s2.subasta = null;
  s2.efectos = [];
  const b = codificar(sinSecretos(s2));
  const base = crearBaseDeDatos();
  const t = base.conectar('x');
  await t.set('sala/estado', a);
  await t.update(diferencias(a, b, 'sala/estado'));
  assert.deepEqual((await t.get('sala/estado')), b);
});

test('la base en memoria guarda como Firebase: listas como objetos con índices y nada de vacíos ni null', async () => {
  const base = crearBaseDeDatos();
  const t = base.conectar('x');
  await t.set('a', { lista: ['x', 'y'], vacia: [], nulo: null, cero: 0, falso: false, mapa: {} });
  assert.deepEqual(await t.get('a'), { lista: { 0: 'x', 1: 'y' }, cero: 0, falso: false });
  await t.update({ 'a/lista': [], 'a/otra': [7] });
  assert.deepEqual(await t.get('a'), { cero: 0, falso: false, otra: { 0: 7 } });
  await t.empujar('cola', { accion: { propiedades: [1, 3], dinero: 0, acciones: [] } });
  assert.deepEqual(Object.values(await t.get('cola')), [{ accion: { propiedades: { 0: 1, 1: 3 }, dinero: 0 } }]);
});

test('una acción con listas llega de Firebase como objeto con índices y se reconstruye', () => {
  assert.deepEqual(reconstruir({ type: 'proponerTrato', ofrece: { propiedades: { 0: 1, 1: 3 }, dinero: 0 } }),
    { type: 'proponerTrato', ofrece: { propiedades: [1, 3], dinero: 0 } });
  assert.deepEqual(reconstruir({ type: 'tirar' }), { type: 'tirar' });
  assert.equal(reconstruir(undefined), undefined);
});

test('la base en memoria guarda, borra, limpia los padres vacíos y avisa de los cambios en orden', async () => {
  const base = crearBaseDeDatos();
  const t = base.conectar('uid-1');
  const vistos = [];
  const parar = t.escuchar('sala/estado/jugadores', v => vistos.push(v));
  await t.set('sala/estado/jugadores/j1', { dinero: 100 });
  await t.update({ 'sala/estado/jugadores/j1/dinero': 150, 'sala/estado/jugadores/j2': { dinero: 7 }, 'sala/otra': 1 });
  await t.set('sala/estado/jugadores/j2/dinero', null);
  await base.reposo();
  assert.deepEqual(vistos, [null, { j1: { dinero: 100 } }, { j1: { dinero: 150 }, j2: { dinero: 7 } }, { j1: { dinero: 150 } }]);
  await t.remove('sala/estado/jugadores/j1/dinero');
  await base.reposo();
  assert.equal(vistos.at(-1), null);
  assert.deepEqual(base.instantanea(), { sala: { otra: 1 } }, 'los padres vacíos desaparecen');
  parar();
  await t.set('sala/estado/jugadores/j9', 1);
  await base.reposo();
  assert.equal(vistos.length, 5, 'quien deja de escuchar no recibe más');
});

test('empujar añade hijos con claves ordenadas, y escucharHijos los entrega una vez cada uno', async () => {
  const base = crearBaseDeDatos();
  const a = base.conectar('a');
  const b = base.conectar('b');
  await b.empujar('cola', { n: 0 }); // uno que ya estaba antes de escuchar
  const llegados = [];
  a.escucharHijos('cola', (clave, valor) => llegados.push([clave, valor.n]));
  await b.empujar('cola', { n: 1 });
  await b.empujar('cola', { n: 2 });
  await base.reposo();
  assert.deepEqual(llegados.map(l => l[1]), [0, 1, 2]);
  assert.deepEqual(llegados.map(l => l[0]), [...llegados.map(l => l[0])].sort(), 'las claves salen ordenadas');
  await a.remove(`cola/${llegados[1][0]}`);
  await base.reposo();
  assert.equal(llegados.length, 3, 'borrar un hijo no lo vuelve a entregar');
});

test('con latencia, las notificaciones llegan tarde pero en orden, y reposo espera a que lleguen', async () => {
  const base = crearBaseDeDatos({ latenciaMs: 15 });
  const t = base.conectar('x');
  const vistos = [];
  t.escuchar('n', v => vistos.push(v));
  await t.set('n', 1);
  await t.set('n', 2);
  assert.deepEqual(vistos, [], 'todavía no ha llegado nada');
  await base.reposo();
  assert.deepEqual(vistos.at(-1), 2);
  assert.ok(vistos.indexOf(1) < vistos.indexOf(2) || !vistos.includes(1));
});
