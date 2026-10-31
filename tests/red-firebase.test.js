// El transporte con Firebase (src/net/firebase.js) contra la imitación de Firebase (tools/firebase-falso.js), que aplica las reglas
// de database.rules.json: la sesión anónima, escribir y leer por partes, escuchar con los eventos del servidor, los cortes de red,
// los tokens que caducan y una partida entera entre un tablero y cuatro celulares.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearAnfitrion } from '../src/net/anfitrion.js';
import { aplicarEvento, creadorDeClaves, crearTransporteFirebase, normalizar } from '../src/net/firebase.js';
import { comoLoDevuelveFirebase, crearFirebaseFalso } from '../tools/firebase-falso.js';
import { FuenteDeEventos } from '../tools/fuente-de-eventos.js';
import { comprobarEspejos, esperarHasta, jugarPorLaRed } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());

const almacenFalso = () => {
  const datos = new Map();
  return { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)), datos };
};

// Una imitación de Firebase y una forma de conectar transportes a ella; al acabar, se cierra todo.
async function conFirebase(prueba, opciones = {}) {
  const falso = crearFirebaseFalso(opciones);
  await falso.arrancar();
  const transportes = [];
  const conectar = async (nombre = 'x', extra = {}) => {
    const t = await crearTransporteFirebase({
      config: falso.config(), clave: `prueba:${nombre}`, almacen: almacenFalso(),
      crearFuente: url => new FuenteDeEventos(url, { reintento: 30 }), esperaReintento: 20, agrupar: 1, ...extra,
    });
    transportes.push(t);
    return t;
  };
  try {
    await prueba({ falso, conectar });
  } finally {
    transportes.forEach(t => t.cerrar());
    await falso.cerrar();
  }
}

// El tablero abre la sala BCDF (escribe su meta) y un celular entra.
async function salaAbierta(conectar) {
  const tablero = await conectar('tablero');
  const celular = await conectar('celular');
  await tablero.set('salas/BCDF/meta', { anfitrion: tablero.uid, creada: 1, version: 1 });
  return { tablero, celular };
}

test('lo que llega de Firebase queda como en la base en memoria: sin listas ni huecos null', () => {
  assert.deepEqual(normalizar([null, { a: 1 }, { b: [2, 3] }]), { 1: { a: 1 }, 2: { b: { 0: 2, 1: 3 } } });
  assert.deepEqual(normalizar({ x: null, y: {}, z: [null], w: 0, v: false, u: '' }), { w: 0, v: false, u: '' });
  assert.equal(normalizar({}), null);
  // La imitación devuelve como Firebase: los objetos con claves numéricas casi seguidas, como listas.
  assert.deepEqual(comoLoDevuelveFirebase({ 1: 'a', 2: 'b' }), [null, 'a', 'b']);
  assert.deepEqual(comoLoDevuelveFirebase({ 0: 'a', 1: 'b' }), ['a', 'b']);
  assert.deepEqual(comoLoDevuelveFirebase({ 17: 'a', 18: 'b' }), { 17: 'a', 18: 'b' }, 'con muchos huecos sigue siendo un objeto');
  assert.deepEqual(comoLoDevuelveFirebase({ j1: { 0: 5 } }), { j1: [5] });
  // Y normalizar deshace lo que hace Firebase.
  for (const original of [{ 1: 'a', 2: 'b' }, { 0: 'a', 1: 'b' }, { m: { 3: { de: 'j1' }, 4: { de: 'j2' } } }]) {
    assert.deepEqual(normalizar(comoLoDevuelveFirebase(original)), original);
  }
});

test('los eventos put y patch se aplican a la copia de una escucha', () => {
  const caja = { v: null };
  aplicarEvento(caja, 'put', { path: '/', data: { a: { b: 1, c: [7, 8] }, d: 2 } });
  assert.deepEqual(caja.v, { a: { b: 1, c: { 0: 7, 1: 8 } }, d: 2 });
  aplicarEvento(caja, 'put', { path: '/a/b', data: 5 });
  aplicarEvento(caja, 'patch', { path: '/', data: { d: null, 'a/c/1': 9, 'e/f': { g: true } } });
  assert.deepEqual(caja.v, { a: { b: 5, c: { 0: 7, 1: 9 } }, e: { f: { g: true } } });
  aplicarEvento(caja, 'patch', { path: '/a', data: { b: null, c: null } });
  assert.deepEqual(caja.v, { e: { f: { g: true } } }, 'lo que se queda vacío desaparece');
  aplicarEvento(caja, 'put', { path: '/e/f/g', data: null });
  assert.equal(caja.v, null);
  aplicarEvento(caja, 'put', { path: '/x/y', data: 3 });
  assert.deepEqual(caja.v, { x: { y: 3 } });
});

test('las claves nuevas se ordenan por orden de creación, también en el mismo milisegundo', () => {
  let ahora = 1_700_000_000_000;
  const nueva = creadorDeClaves({ reloj: () => ahora });
  const claves = [nueva(), nueva(), nueva()];
  ahora += 1;
  claves.push(nueva());
  ahora += 86_400_000;
  claves.push(nueva());
  assert.ok(claves.every(k => /^[-0-9A-Za-z_]{20}$/.test(k)), claves.join(' '));
  assert.deepEqual([...claves].sort(), claves);
  assert.equal(new Set(claves).size, claves.length);
});

test('el inicio de sesión anónimo da un uid, y el navegador lo recuerda al recargar la página', async () => {
  await conFirebase(async ({ falso, conectar }) => {
    const almacen = almacenFalso();
    const primero = await conectar('tablero', { almacen, clave: 'duenos:firebase-tablero' });
    assert.match(primero.uid, /^[A-Za-z0-9]{28}$/);
    assert.match(almacen.datos.get('duenos:firebase-tablero'), /renovacion/);
    const otraVez = await conectar('tablero', { almacen, clave: 'duenos:firebase-tablero' });
    assert.equal(otraVez.uid, primero.uid, 'misma sesión al recargar');
    assert.notEqual((await conectar('celular')).uid, primero.uid, 'otro dispositivo, otro uid');
    // Si la cuenta ya no vale, se crea otra (y el dispositivo pasa a ser alguien nuevo).
    falso.olvidarCuentas();
    const nuevo = await conectar('tablero', { almacen, clave: 'duenos:firebase-tablero' });
    assert.notEqual(nuevo.uid, primero.uid);
    // Si lo que falla es la red, no se crea otra cuenta: se avisa del error y se conserva la sesión guardada.
    const sinRed = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(crearTransporteFirebase({ config: falso.config(), almacen, clave: 'duenos:firebase-tablero', peticion: sinRed }), /fetch failed/);
    assert.match(almacen.datos.get('duenos:firebase-tablero'), new RegExp(nuevo.uid));
  });
});

test('guarda, lee, borra y empuja como la base en memoria, y las reglas se cumplen', async () => {
  await conFirebase(async ({ falso, conectar }) => {
    const { tablero, celular } = await salaAbierta(conectar);
    await tablero.update({
      'salas/BCDF/estado/jugadores/j1': { dinero: 1500, lista: ['x', 'y'], vacia: [] },
      'salas/BCDF/estado/publicacion': 1,
      [`salas/BCDF/vistas/${celular.uid}`]: { id: 'j1', n: 1, movimientos: { 1: { cantidad: 5 }, 2: { cantidad: 7 } } },
    });
    assert.deepEqual(await celular.get('salas/BCDF/estado'), { jugadores: { j1: { dinero: 1500, lista: { 0: 'x', 1: 'y' } } }, publicacion: 1 }, 'queda como en Firebase');
    // Firebase devolvería los movimientos 1 y 2 como una lista con un hueco: llegan como el objeto que eran.
    assert.deepEqual(await celular.get(`salas/BCDF/vistas/${celular.uid}/movimientos`), { 1: { cantidad: 5 }, 2: { cantidad: 7 } });
    await tablero.update({ 'salas/BCDF/estado/jugadores/j1/dinero': 1750, 'salas/BCDF/estado/publicacion': 2 });
    assert.equal(await celular.get('salas/BCDF/estado/jugadores/j1/dinero'), 1750);
    await tablero.remove('salas/BCDF/estado/publicacion');
    assert.equal(await celular.get('salas/BCDF/estado/publicacion'), null);
    await tablero.update({});

    const k1 = await celular.empujar('salas/BCDF/acciones', { uid: celular.uid, accion: { type: 'tirar' } });
    const k2 = await celular.empujar('salas/BCDF/acciones', { uid: celular.uid, accion: { type: 'comprar' } });
    assert.ok(k1 < k2, 'las claves van en orden');
    assert.deepEqual(await tablero.get(`salas/BCDF/acciones/${k2}`), { uid: celular.uid, accion: { type: 'comprar' } });
    const escrituras = falso.registro.filter(p => p.metodo !== 'GET');
    assert.ok(escrituras.length >= 6 && escrituras.every(p => p.estado === 200), JSON.stringify(escrituras));

    // Lo que no le toca a un celular, Firebase lo rechaza (y el transporte lo dice).
    await assert.rejects(celular.set('salas/BCDF/estado/jugadores/j1/dinero', 1e6), /Permission denied/);
    await assert.rejects(celular.get('salas/BCDF/acciones'), /Permission denied/);
    await assert.rejects(celular.empujar('salas/BCDF/acciones', { uid: 'otro', accion: { type: 'tirar' } }), /Permission denied/);
    await assert.rejects(celular.empujar('salas/BCDF/acciones', { uid: celular.uid, accion: { type: 'tirar', dinero: 5 } }), /Permission denied/);
    assert.equal(await celular.get('salas/BCDF/estado/jugadores/j1/dinero'), 1750, 'el dinero sigue igual');
    // Un error no atasca la fila de escrituras: lo siguiente sale.
    await tablero.set('salas/BCDF/estado/publicacion', 3);
    assert.equal(await celular.get('salas/BCDF/estado/publicacion'), 3);
    // Y el tablero cierra la sala.
    await tablero.remove('salas/BCDF');
    assert.equal(await celular.get('salas/BCDF/meta'), null);
  });
});

test('escuchar avisa con el valor de ahora y de cada cambio (un update de varias rutas, de una vez); escucharHijos, de cada hijo nuevo', async () => {
  await conFirebase(async ({ conectar }) => {
    const { tablero, celular } = await salaAbierta(conectar);
    const valores = [];
    const hijos = [];
    celular.escuchar('salas/BCDF/estado', v => valores.push(v));
    tablero.escucharHijos('salas/BCDF/acciones', (clave, v) => hijos.push([clave, v.accion.type]));
    await esperarHasta(() => valores.length === 1, 3000, 'no llegó el valor inicial');
    assert.deepEqual(valores, [null], 'sin nada, llega null');
    await tablero.update({ 'salas/BCDF/estado/fase': 'sala', 'salas/BCDF/estado/publicacion': 1 });
    await esperarHasta(() => valores.length === 2, 3000, 'no llegó la publicación');
    await tablero.update({ 'salas/BCDF/estado/jugadores/j1/dinero': 1500, 'salas/BCDF/estado/jugadores/j2/dinero': 1400, 'salas/BCDF/estado/publicacion': 2 });
    await esperarHasta(() => valores.length === 3, 3000, 'no llegó la segunda publicación');
    assert.deepEqual(valores.at(-1), { fase: 'sala', publicacion: 2, jugadores: { j1: { dinero: 1500 }, j2: { dinero: 1400 } } });
    await new Promise(listo => setTimeout(listo, 60));
    assert.equal(valores.length, 3, 'cada publicación llega una sola vez, entera');

    const k1 = await celular.empujar('salas/BCDF/acciones', { uid: celular.uid, accion: { type: 'unirse', nombre: 'Ana' } });
    const k2 = await celular.empujar('salas/BCDF/acciones', { uid: celular.uid, accion: { type: 'elegirFicha', ficha: 'toro' } });
    await esperarHasta(() => hijos.length === 2, 3000, 'no llegaron las acciones');
    assert.deepEqual(hijos, [[k1, 'unirse'], [k2, 'elegirFicha']]);
    await tablero.remove(`salas/BCDF/acciones/${k1}`);
    await tablero.remove(`salas/BCDF/acciones/${k2}`);
    await new Promise(listo => setTimeout(listo, 60));
    assert.equal(hijos.length, 2, 'borrar no avisa');

    // Al cerrar la sala, el celular ve que ya no hay nada.
    await tablero.remove('salas/BCDF');
    await esperarHasta(() => valores.at(-1) === null, 3000, 'no se enteró del cierre');
  });
});

test('si se corta la conexión, vuelve sola, trae lo que cambió y avisa de que estuvo sin conexión', async () => {
  await conFirebase(async ({ falso, conectar }) => {
    const { tablero, celular } = await salaAbierta(conectar);
    const valores = [];
    const conexion = [];
    celular.alCambiarConexion(v => conexion.push(v));
    celular.escuchar('salas/BCDF/estado/publicacion', v => valores.push(v));
    celular.escuchar('salas/BCDF/meta', () => {});
    await esperarHasta(() => celular.enLinea(), 3000, 'no llegó a estar en línea');
    await tablero.set('salas/BCDF/estado/publicacion', 1);
    await esperarHasta(() => valores.at(-1) === 1, 3000, 'no llegó la primera');
    falso.cortarEscuchas(); // la wifi se cae un momento
    await esperarHasta(() => !celular.enLinea(), 3000, 'no notó el corte');
    await tablero.set('salas/BCDF/estado/publicacion', 2);
    await esperarHasta(() => valores.at(-1) === 2 && celular.enLinea(), 5000, 'no se recuperó después del corte');
    assert.deepEqual(conexion, [true, false, true]);
    // reconectar() (al volver a la página) abre otra conexión y trae lo último sin repetir lo que ya tenía.
    const antes = valores.length;
    celular.reconectar();
    await esperarHasta(() => celular.enLinea() && falso.escuchasAbiertas() === 2, 3000, 'no volvió a conectar');
    await new Promise(listo => setTimeout(listo, 60));
    assert.equal(valores.length, antes, 'el mismo valor no se repite');
  });
});

test('si el token caduca, se renueva solo: las escuchas siguen y las escrituras también', async () => {
  await conFirebase(async ({ falso, conectar }) => {
    const { tablero, celular } = await salaAbierta(conectar);
    const valores = [];
    celular.escuchar('salas/BCDF/estado/publicacion', v => valores.push(v));
    await esperarHasta(() => valores.length === 1, 3000, 'no llegó el valor inicial');
    falso.caducarTokens(); // pasa una hora: las escuchas reciben «auth_revoked»
    await tablero.set('salas/BCDF/estado/publicacion', 7); // con el token viejo: 401, se renueva y se repite
    await esperarHasta(() => valores.at(-1) === 7, 5000, 'la escucha no se recuperó con el token nuevo');
    const rechazos = falso.registro.filter(p => p.estado === 401);
    assert.ok(rechazos.length >= 1, 'hubo al menos un rechazo por el token caducado');
    assert.equal(await celular.get('salas/BCDF/estado/publicacion'), 7);
  });
});

test('una escritura que falla por la red se repite, y si la red no vuelve, el error llega a quien escribió', async () => {
  await conFirebase(async ({ falso, conectar }) => {
    let fallos = 2;
    const peticion = async (url, opciones) => {
      if (opciones?.method === 'PUT' && fallos-- > 0) throw new TypeError('fetch failed');
      return fetch(url, opciones);
    };
    const tablero = await conectar('tablero', { peticion });
    await tablero.set('salas/BCDF/meta', { anfitrion: tablero.uid, creada: 1, version: 1 });
    assert.equal((await tablero.get('salas/BCDF/meta')).anfitrion, tablero.uid, 'llegó a la tercera');
    const sinRed = await conectar('otro', { peticion: async (url, opciones) => (opciones?.method === 'PUT' ? Promise.reject(new TypeError('fetch failed')) : fetch(url, opciones)), reintentos: 2, esperaReintento: 5 });
    await assert.rejects(sinRed.set('salas/BCDF/estado/fase', 'sala'), /fetch failed/);
    assert.ok(falso.datos().salas.BCDF.meta);
  });
});

test('el tablero no atiende dos veces una acción que un celular repitió', async () => {
  await conFirebase(async ({ conectar }) => {
    const tablero = await conectar('tablero');
    const celular = await conectar('celular');
    const anfitrion = crearAnfitrion({ transporte: tablero, motor, codigo: 'BCDF', semilla: 3 });
    await anfitrion.abrir();
    const mensaje = { uid: celular.uid, accion: { type: 'unirse', nombre: 'Ana' } };
    await celular.set('salas/BCDF/acciones/-Nrepetida0000000000', mensaje);
    const primero = await anfitrion.siguientePaso();
    assert.equal(primero.accion.type, 'unirse');
    // El celular no supo si había llegado y la manda otra vez con la misma clave, cuando el tablero ya la había borrado.
    await new Promise(listo => setTimeout(listo, 80));
    await celular.set('salas/BCDF/acciones/-Nrepetida0000000000', mensaje);
    await celular.empujar('salas/BCDF/acciones', { uid: celular.uid, accion: { type: 'elegirFicha', ficha: 'toro' } });
    const segundo = await anfitrion.siguientePaso();
    assert.equal(segundo.accion.type, 'elegirFicha', 'la repetida no se atendió');
    await anfitrion.cerrar();
  });
});

test('una partida por Firebase: un tablero y cuatro celulares, con las reglas de verdad, y todos acaban viendo lo mismo', async () => {
  await conFirebase(async ({ conectar }) => {
    // jugarPorLaRed pide los transportes de uno en uno y sin esperar: se preparan antes.
    const transportes = new Map();
    for (const nombre of ['tablero', 'celular-0', 'celular-1', 'celular-2', 'celular-3']) transportes.set(nombre, await conectar(nombre));
    const sala = await jugarPorLaRed({ motor, conectar: nombre => transportes.get(nombre), maxPasos: 120, semilla: 6 });
    assert.equal(sala.anfitrion.estado().fase, 'juego');
    assert.ok(sala.mandadas >= 90, `${sala.mandadas} acciones mandadas`);
    await esperarHasta(() => sala.celulares.every(c => c.datos().n >= sala.anfitrion.publicaciones() && c.datos().alDia), 5000, 'no llegó la última publicación');
    comprobarEspejos(sala);
    await sala.cerrar();
  });
});
