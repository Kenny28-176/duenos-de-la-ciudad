// Las reglas de seguridad de Firebase (database.rules.json), con el evaluador de tools/reglas-firebase.js: lo que el tablero y los
// celulares hacen de verdad tiene que estar permitido, y lo que no les toca, prohibido. (tools/comprobar-reglas.js prueba lo mismo
// contra el proyecto de Firebase de verdad.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerReglas, puedeLeer, revisarEscritura } from '../tools/reglas-firebase.js';
import { ACCIONES_DE_CELULAR } from '../src/net/protocolo.js';

const reglas = leerReglas();
const TABLERO = { uid: 'uidDelTablero', provider: 'anonymous' };
const ANA = { uid: 'uidDeAna', provider: 'anonymous' };
const LUIS = { uid: 'uidDeLuis', provider: 'anonymous' };

// Una sala con su meta, algo de estado, la vista de Ana y una acción suya pendiente.
const conSala = () => ({
  salas: {
    BCDF: {
      meta: { anfitrion: TABLERO.uid, creada: 1, version: 1 },
      estado: { fase: 'juego', publicacion: 3 },
      vistas: { [ANA.uid]: { id: 'j1', n: 3 } },
      acciones: { k1: { uid: ANA.uid, accion: { type: 'tirar' } } },
    },
  },
});

// Escribe como lo haría Firebase (set en una ruta, o varias a la vez) y dice si las reglas lo dejan: null o el motivo.
function escribir(antes, cambios, auth) {
  const despues = JSON.parse(JSON.stringify(antes ?? {}));
  const poner = (ruta, valor) => {
    const partes = ruta.split('/');
    let nodo = despues;
    for (const clave of partes.slice(0, -1)) nodo = nodo[clave] ??= {};
    if (valor === null) delete nodo[partes.at(-1)];
    else nodo[partes.at(-1)] = valor;
  };
  for (const [ruta, valor] of Object.entries(cambios)) poner(ruta, valor);
  for (const ruta of Object.keys(cambios)) {
    const motivo = revisarEscritura(reglas, antes, despues, ruta, auth);
    if (motivo) return motivo;
  }
  return null;
}

test('leer: la meta y el estado, todo el mundo; la vista, solo su dueño; las acciones, solo el tablero; la sala entera, nadie', () => {
  const db = conSala();
  for (const auth of [null, ANA, TABLERO]) {
    assert.ok(puedeLeer(reglas, db, 'salas/BCDF/meta', auth));
    assert.ok(puedeLeer(reglas, db, 'salas/BCDF/estado', auth));
    assert.ok(puedeLeer(reglas, db, 'salas/BCDF/estado/fase', auth), 'y lo que hay dentro');
  }
  assert.ok(puedeLeer(reglas, db, `salas/BCDF/vistas/${ANA.uid}`, ANA));
  assert.ok(!puedeLeer(reglas, db, `salas/BCDF/vistas/${ANA.uid}`, LUIS), 'la vista de Ana no la ve Luis');
  assert.ok(!puedeLeer(reglas, db, `salas/BCDF/vistas/${ANA.uid}`, null));
  assert.ok(!puedeLeer(reglas, db, 'salas/BCDF/vistas', TABLERO), 'ni el tablero lee todas las vistas');
  assert.ok(puedeLeer(reglas, db, 'salas/BCDF/acciones', TABLERO));
  assert.ok(!puedeLeer(reglas, db, 'salas/BCDF/acciones', ANA), 'las acciones de los demás no se leen');
  for (const ruta of ['', 'salas', 'salas/BCDF']) assert.ok(!puedeLeer(reglas, db, ruta, TABLERO), `«${ruta}» no se lee`);
  // Una sala que no existe también se puede mirar (así el tablero busca un código libre).
  assert.ok(puedeLeer(reglas, null, 'salas/XZTV/meta', TABLERO));
});

test('el tablero abre la sala, publica por partes, borra las acciones y cierra la sala', () => {
  assert.equal(escribir(null, { 'salas/BCDF/meta': { anfitrion: TABLERO.uid, creada: 1, version: 1 } }, TABLERO), null, 'abrir');
  const db = conSala();
  assert.equal(escribir(db, {
    'salas/BCDF/estado/publicacion': 4, 'salas/BCDF/estado/jugadores/j1/dinero': 1750,
    [`salas/BCDF/vistas/${ANA.uid}/n`]: 4, [`salas/BCDF/vistas/${LUIS.uid}`]: { id: 'j2', n: 4 },
  }, TABLERO), null, 'publicar');
  assert.equal(escribir(db, { 'salas/BCDF/acciones/k1': null }, TABLERO), null, 'borrar una acción atendida');
  assert.equal(escribir(db, { 'salas/BCDF/meta': { anfitrion: TABLERO.uid, creada: 2, version: 1 } }, TABLERO), null, 'reabrir tras recargar');
  assert.equal(escribir(db, { 'salas/BCDF': null }, TABLERO), null, 'cerrar la sala');
});

test('un celular solo puede pedir acciones con su propio uid, en una sala que existe', () => {
  const db = conSala();
  const pedir = (auth, mensaje, clave = 'k2') => escribir(db, { [`salas/BCDF/acciones/${clave}`]: mensaje }, auth);
  assert.equal(pedir(ANA, { uid: ANA.uid, accion: { type: 'unirse', nombre: 'Ana', ficha: 'toro' } }), null);
  assert.equal(pedir(ANA, { uid: ANA.uid, accion: { type: 'tirar' } }, 'k1'), null, 'repetir la suya (un reintento) vale');
  assert.equal(pedir(LUIS, { uid: LUIS.uid, accion: { type: 'tirar' } }, 'k1'), 'permiso', 'pisar la de otro, no');
  assert.equal(pedir(LUIS, { uid: ANA.uid, accion: { type: 'tirar' } }), 'permiso', 'hacerse pasar por otro, no');
  assert.equal(pedir(null, { uid: ANA.uid, accion: { type: 'tirar' } }), 'permiso', 'sin sesión, no');
  assert.equal(pedir(LUIS, null, 'k1'), 'permiso', 'borrar la de otro, no');
  assert.equal(escribir(conSala(), { 'salas/XZTV/acciones/k1': { uid: ANA.uid, accion: { type: 'tirar' } } }, ANA), 'permiso', 'en una sala que no existe, no');
});

test('las acciones que mandan los celulares pasan la validación, con todos sus campos', () => {
  const db = conSala();
  const valida = accion => escribir(db, { 'salas/BCDF/acciones/k9': { uid: ANA.uid, accion } }, ANA);
  // Lo que mandan las pantallas del celular (src/ui/jugador/): una de cada.
  const ejemplos = [
    { type: 'unirse', nombre: 'Ana María de los Ángeles' }, { type: 'elegirFicha', ficha: 'vaca-lechera' }, { type: 'salir' },
    { type: 'tirar' }, { type: 'comprar' }, { type: 'noComprar' }, { type: 'pagarFianza' }, { type: 'usarSalvoconducto' },
    { type: 'terminarTurno' }, { type: 'declararBancarrota' }, { type: 'retirarse' },
    { type: 'usarHabilidad' }, { type: 'usarHabilidad', barrio: 'distrito-financiero' }, { type: 'usarHabilidad', casilla: 12 },
    { type: 'usarHabilidad', objetivo: 'j3' }, { type: 'usarHabilidad', cantidad: 150 },
    { type: 'construir', casilla: 3 }, { type: 'venderEdificio', casilla: 3 }, { type: 'hipotecar', casilla: 5 }, { type: 'deshipotecar', casilla: 5 },
    { type: 'comprarAcciones', barrio: 'altos-del-mirador', cantidad: 2 }, { type: 'venderAcciones', barrio: 'altos-del-mirador', cantidad: 1 },
    { type: 'pujar', cantidad: 260 }, { type: 'aceptarTrato', trato: 't12' }, { type: 'rechazarTrato', trato: 't12' },
    // Un trato llega con las listas convertidas en objetos con índices (así las guarda Firebase).
    { type: 'proponerTrato', para: 'j2', ofrece: { dinero: 300, propiedades: { 0: 12, 1: 14 }, salvoconductos: 1 }, pide: { acciones: { 'altos-del-mirador': 2 } } },
  ];
  for (const accion of ejemplos) assert.equal(valida(accion), null, JSON.stringify(accion));
  // Que ningún tipo de acción de celular se quede sin probar.
  assert.deepEqual(new Set(ejemplos.map(a => a.type)), ACCIONES_DE_CELULAR);

  for (const [accion, por] of [
    [{ nombre: 'Ana' }, 'sin tipo'],
    [{ type: 'tirar', dinero: 5000 }, 'un campo que no existe'],
    [{ type: 'unirse', nombre: 'x'.repeat(25) }, 'un nombre de más de 24 letras'],
    [{ type: 'pujar', cantidad: '260' }, 'una cantidad que no es un número'],
    [{ type: 'construir', casilla: { a: 1 } }, 'una casilla que no es un número'],
    [{ type: 'proponerTrato', para: 'j2', ofrece: { regalo: 1 } }, 'algo raro en un trato'],
    [{ type: 'x'.repeat(30) }, 'un tipo larguísimo'],
  ]) assert.equal(valida(accion), 'validacion', por);
  assert.equal(escribir(db, { 'salas/BCDF/acciones/k9': { uid: ANA.uid, accion: { type: 'tirar' }, extra: 1 } }, ANA), 'validacion', 'campos de más en el mensaje');
});

test('nadie más que el tablero escribe la meta, el estado o las vistas, ni cierra la sala', () => {
  const db = conSala();
  for (const [cambios, que] of [
    [{ 'salas/BCDF/estado/jugadores/j1/dinero': 1e6 }, 'el estado'],
    [{ 'salas/BCDF/estado': null }, 'borrar el estado'],
    [{ [`salas/BCDF/vistas/${ANA.uid}/puede/tirar`]: true }, 'su propia vista'],
    [{ 'salas/BCDF/meta': { anfitrion: ANA.uid, creada: 1, version: 1 } }, 'quedarse con la sala'],
    [{ 'salas/BCDF': null }, 'cerrar la sala'],
    [{ 'salas/BCDF/otra': 1 }, 'algo fuera de lo previsto'],
    [{ basura: 1 }, 'algo fuera de las salas'],
  ]) assert.equal(escribir(db, cambios, ANA), 'permiso', que);
  // El tablero tampoco puede escribir donde no toca, ni con un código que no es de sala.
  assert.equal(escribir(db, { 'salas/BCDF/otra': 1 }, TABLERO), 'permiso');
  assert.equal(escribir(null, { 'salas/ABCD/meta': { anfitrion: TABLERO.uid, creada: 1, version: 1 } }, TABLERO), 'validacion', 'con vocales no es un código');
  assert.equal(escribir(null, { 'salas/BCDF/meta': { anfitrion: TABLERO.uid, creada: 1 } }, TABLERO), 'validacion', 'una meta a medias');
  assert.equal(escribir(null, { 'salas/BCDF/meta': { anfitrion: TABLERO.uid, creada: 1, version: 1, otra: 2 } }, TABLERO), 'validacion', 'una meta con más campos');
  assert.equal(escribir(null, { 'salas/BCDF/meta': { anfitrion: ANA.uid, creada: 1, version: 1 } }, TABLERO), 'permiso', 'abrir una sala a nombre de otro');
});
