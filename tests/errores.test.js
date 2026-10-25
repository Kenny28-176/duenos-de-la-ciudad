// Los errores del motor se pueden traducir: cada código (y cada variante) que emite el motor tiene su texto en español y en
// inglés, y las cifras y nombres salen de los datos del error, no del mensaje.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { unirDiccionarios } from '../src/i18n/traducir.js';
import { textoDeError } from '../src/ui/errores.js';

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
const texto = (error, idioma = 'es') => textoDeError(error, idioma === 'es' ? { dic: es, idioma } : { dic: en, base: es, idioma });

// Todos los códigos y variantes que aparecen en el código del motor.
async function erroresDelMotor() {
  const codigos = new Map();
  for (const archivo of await readdir(new URL('../src/engine/', import.meta.url))) {
    if (!archivo.endsWith('.js')) continue;
    const fuente = await readFile(new URL(`../src/engine/${archivo}`, import.meta.url), 'utf8');
    for (const m of fuente.matchAll(/\b(?:no|err)\((?:estado, )?'([a-z_]+)'/g)) {
      if (!codigos.has(m[1])) codigos.set(m[1], new Set());
      // Las variantes van en la misma llamada, pocas líneas más abajo.
      const llamada = fuente.slice(m.index, m.index + 330).split(/\n\s*\n|;\n/)[0];
      for (const v of llamada.matchAll(/variante: '([a-z_]+)'/g)) codigos.get(m[1]).add(v[1]);
      if (/variante: j\.hab\.enfriamiento === 1/.test(llamada)) ['uno', 'otros'].forEach(v => codigos.get(m[1]).add(v));
      if (/variante: s\.fase === 'sala'/.test(llamada)) ['sala', 'fin'].forEach(v => codigos.get(m[1]).add(v));
    }
  }
  return codigos;
}
const codigos = await erroresDelMotor();

test('el motor tiene unos 60 códigos de error y los encuentra la prueba', () => {
  assert.ok(codigos.size >= 55, `solo ${codigos.size} códigos`);
  for (const c of ['sin_dinero', 'fase', 'no_es_tu_turno', 'puja_baja', 'fuera_de_juego', 'enfriamiento']) assert.ok(codigos.has(c), c);
  // Las variantes también se encuentran (si no, la prueba de abajo no vigilaría nada).
  assert.deepEqual([...codigos.get('fase')].sort(), ['comprar', 'terminar', 'tirar']);
  assert.deepEqual([...codigos.get('sin_dinero')].sort(), ['puja', 'trato']);
  assert.deepEqual([...codigos.get('enfriamiento')].sort(), ['otros', 'uno']);
  assert.ok([...codigos.values()].reduce((n, v) => n + v.size, 0) >= 30, 'hay unas 30 variantes en total');
});

test('cada código y cada variante del motor tiene su texto en español y en inglés', () => {
  const faltan = [];
  for (const [codigo, variantes] of codigos) {
    for (const [nombre, dic] of [['es', es], ['en', en]]) {
      const claves = [...variantes].map(v => `error.${codigo}.${v}`);
      if (!variantes.size) claves.push(`error.${codigo}`);
      // Un código con variantes necesita al menos todas ellas; sin variantes, su clave sola.
      for (const clave of claves) if (dic[clave] === undefined) faltan.push(`${nombre}: ${clave}`);
    }
  }
  assert.deepEqual(faltan, []);
});

test('el español y el inglés tienen las mismas claves de error y los mismos marcadores', () => {
  const claves = d => Object.keys(d).filter(k => k.startsWith('error.')).sort();
  assert.deepEqual(claves(en), claves(es));
  const marcadores = s => [...s.matchAll(/\{(\w+)(?::\w+)?\}/g)].map(m => m[1]).sort();
  for (const k of claves(es)) assert.deepEqual(marcadores(en[k]), marcadores(es[k]), k);
  // Y no sobra ninguna: todas las claves corresponden a un código del motor.
  for (const k of claves(es)) assert.ok(codigos.has(k.split('.')[1]), `${k} no es un error del motor`);
});

// Un error de verdad del motor, con una partida montada a mano.
function partida(fichas = ['rata', 'toro'], opciones = {}) {
  let s = motor.nuevaPartida({ semilla: 5 });
  const hacer = a => {
    const r = motor.paso(s, a);
    assert.equal(r.error, null, r.error?.mensaje);
    s = r.state;
  };
  fichas.forEach((f, k) => hacer({ type: 'unirse', id: `j${k + 1}`, nombre: `Jugador ${k + 1}`, ficha: f }));
  hacer({ type: 'configurar', opciones: { dadosDePrueba: true, ...opciones } });
  hacer({ type: 'empezar' });
  s.orden = fichas.map((_, k) => `j${k + 1}`);
  s.turno.id = 'j1';
  return s;
}

test('los errores del motor llevan sus datos y se traducen con ellos', () => {
  const s = partida(['rata', 'toro'], { habilidades: true });
  const falla = (accion, estado = s) => {
    const r = motor.paso(estado, accion);
    assert.ok(r.error, `${accion.type} debía fallar`);
    return r.error;
  };

  // Una cifra: la fianza.
  const preso = structuredClone(s);
  Object.assign(preso.jugadores.j1, { casilla: 10, calabozo: { intentos: 0 }, dinero: 10 });
  const sinFianza = falla({ type: 'pagarFianza', id: 'j1' }, preso);
  assert.deepEqual([sinFianza.codigo, sinFianza.datos], ['sin_dinero', { coste: motor.ctx.eco.fianza }]);
  assert.match(texto(sinFianza), /hacen falta 80 \$/);
  assert.match(texto(sinFianza, 'en'), /you need \$80/);

  // Una variante con una cifra: el préstamo de la Taza.
  const taza = partida(['taza', 'rata'], { habilidades: true });
  const prestamo = falla({ type: 'usarHabilidad', id: 'j1', cantidad: 5 }, taza);
  assert.equal(prestamo.datos.variante, 'prestamo');
  assert.match(texto(prestamo), /entre 10 y 600 \$/);
  assert.match(texto(prestamo, 'en'), /\$10 and \$600/);

  // El plural del enfriamiento: faltan varios turnos, o solo uno.
  const enfria = structuredClone(taza);
  enfria.jugadores.j1.hab.enfriamiento = 3;
  assert.match(texto(falla({ type: 'usarHabilidad', id: 'j1', cantidad: 100 }, enfria)), /faltan 3 turnos/);
  enfria.jugadores.j1.hab.enfriamiento = 1;
  assert.match(texto(falla({ type: 'usarHabilidad', id: 'j1', cantidad: 100 }, enfria), 'en'), /one turn to go/);

  // Una casilla: los tratos nombran la propiedad por su número y se traduce.
  const trato = falla({ type: 'proponerTrato', id: 'j1', para: 'j2', ofrece: { propiedades: [1] }, pide: {} });
  assert.deepEqual([trato.codigo, trato.datos], ['propiedad', { casilla: 1, jugador: 'Jugador 1' }]);
  assert.equal(texto(trato), 'Calle del Hierro no es de Jugador 1.');
  assert.equal(texto(trato, 'en'), 'Iron Street does not belong to Jugador 1.');

  // Sin datos: un código simple.
  const turno = falla({ type: 'tirar', id: 'j2', dados: [1, 2] });
  assert.equal(texto(turno), 'No es tu turno.');
  assert.equal(texto(turno, 'en'), 'It is not your turn.');
});

test('si falta el texto de un error, se usa el mensaje en español del motor', () => {
  assert.equal(texto({ codigo: 'inventado', mensaje: 'Un mensaje.', datos: {} }, 'en'), 'Un mensaje.');
  assert.equal(texto({ codigo: 'inventado', datos: {} }), 'inventado');
  // Una variante que no existe cae en el texto general del código.
  assert.equal(texto({ codigo: 'fase', mensaje: 'x', datos: { variante: 'rara' } }), 'Ahora no se puede.');
});
