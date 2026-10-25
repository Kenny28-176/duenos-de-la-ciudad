// El transporte HTTP (src/net/http.js) y el relé del servidor local (tools/red-local.js): el buzón por el que el tablero y los
// celulares se hablan por la wifi de casa sin Firebase. Se comporta igual que la base en memoria, y se puede jugar una
// partida entera por él.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearTransporteHttp } from '../src/net/http.js';
import { crearServidor } from '../tools/serve.js';
import { comprobarEspejos, esperarHasta, jugarPorLaRed } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());

// Un servidor local con su relé y una forma de conectar clientes; al acabar, se cierra todo (las escuchas son peticiones largas).
async function conServidor(prueba) {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const transportes = [];
  const conectar = (uid, opciones = {}) => {
    const t = crearTransporteHttp({ uid, base, esperaReintento: 30, ...opciones });
    transportes.push(t);
    return t;
  };
  try {
    await prueba({ conectar, servidor });
  } finally {
    transportes.forEach(t => t.cerrar());
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
}

test('el transporte HTTP guarda, lee, borra y empuja como la base en memoria', async () => {
  await conServidor(async ({ conectar }) => {
    const a = conectar('a');
    const b = conectar('b');
    await a.set('sala/jugadores/j1', { dinero: 100, lista: ['x', 'y'], vacia: [] });
    assert.deepEqual(await b.get('sala/jugadores/j1'), { dinero: 100, lista: { 0: 'x', 1: 'y' } }, 'queda como en Firebase');
    await b.update({ 'sala/jugadores/j1/dinero': 150, 'sala/otra': 7 });
    assert.deepEqual(await a.get('sala'), { jugadores: { j1: { dinero: 150, lista: { 0: 'x', 1: 'y' } } }, otra: 7 });
    await a.remove('sala/otra');
    assert.equal(await b.get('sala/otra'), null);
    const clave = await b.empujar('cola', { n: 1 });
    assert.match(clave, /^p\d+$/);
    assert.deepEqual(await a.get(`cola/${clave}`), { n: 1 });
  });
});

test('escuchar avisa con el valor de ahora y de cada cambio; escucharHijos, de cada hijo nuevo', async () => {
  await conServidor(async ({ conectar }) => {
    const a = conectar('a');
    const b = conectar('b');
    await a.set('x/valor', 1);
    const valores = [];
    const hijos = [];
    a.escuchar('x/valor', v => valores.push(v));
    a.escucharHijos('x/cola', (clave, v) => hijos.push(v.n));
    await esperarHasta(() => valores.length === 1, 3000, 'no llegó el valor inicial');
    assert.deepEqual(valores, [1]);
    await b.set('x/valor', 2);
    await b.empujar('x/cola', { n: 1 });
    await b.empujar('x/cola', { n: 2 });
    await esperarHasta(() => valores.length === 2 && hijos.length === 2, 3000, 'no llegaron los cambios');
    assert.deepEqual([valores, hijos], [[1, 2], [1, 2]]);
  });
});

test('si se corta la conexión, el cliente vuelve a conectar solo y recibe lo que cambió mientras tanto', async () => {
  await conServidor(async ({ conectar, servidor }) => {
    const a = conectar('a');
    const b = conectar('b');
    const valores = [];
    a.escuchar('n', v => valores.push(v));
    await b.set('n', 1);
    await esperarHasta(() => valores.at(-1) === 1, 3000, 'no llegó el primero');
    servidor.closeAllConnections(); // el wifi se cae un momento
    await b.set('n', 2);
    await esperarHasta(() => valores.at(-1) === 2, 5000, 'no se recuperó después del corte');
  });
});

test('una operación que falla da un error claro', async () => {
  await conServidor(async ({ conectar, servidor }) => {
    const a = conectar('a');
    const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}/red/op`, { method: 'POST', body: JSON.stringify({ uid: 'a', op: 'volar' }) });
    assert.equal(respuesta.status, 400);
    assert.match((await respuesta.json()).error, /operación desconocida/);
    await assert.rejects(a.set('', {}).then(() => fetch(`http://127.0.0.1:${servidor.address().port}/red/op`, { method: 'POST', body: '{no es json' }).then(r => r.json()).then(d => { throw new Error(d.error); })));
  });
});

test('una partida por HTTP: un tablero y cuatro celulares, y todos acaban viendo lo mismo', async () => {
  await conServidor(async ({ conectar }) => {
    const sala = await jugarPorLaRed({ motor, conectar, maxPasos: 120, semilla: 6 });
    assert.equal(sala.anfitrion.estado().fase, 'juego');
    assert.ok(sala.mandadas >= 90, `${sala.mandadas} acciones mandadas`);
    // Todos acaban de recibir la última publicación.
    await esperarHasta(() => sala.celulares.every(c => c.datos().n >= sala.anfitrion.publicaciones() && c.datos().alDia), 5000, 'no llegó la última publicación');
    comprobarEspejos(sala);
    await sala.cerrar();
  });
});

// Una conexión larga que parece abierta pero ya no trae nada (un celular al que se le apagó la pantalla): se cuenta cada intento.
function conexionMuda() {
  const estado = { intentos: 0, abiertas: 0 };
  const peticion = async (url, { signal }) => {
    estado.intentos++;
    estado.abiertas++;
    signal.addEventListener('abort', () => { estado.abiertas--; });
    return {
      body: {
        getReader: () => ({
          read: () => new Promise((_, ko) => signal.addEventListener('abort', () => ko(new DOMException('abortado', 'AbortError')))),
        }),
      },
    };
  };
  return { estado, peticion };
}

test('si la conexión larga se queda en silencio, el transporte la da por muerta y abre otra', async () => {
  const { estado, peticion } = conexionMuda();
  const transporte = crearTransporteHttp({ uid: 'celular', peticion, esperaReintento: 5, silencioMaximo: 60, revisarCada: 15 });
  transporte.escuchar('salas/BCDF/estado', () => {});
  await esperarHasta(() => estado.intentos >= 3, 3000, 'no volvió a conectar tras el silencio');
  assert.ok(estado.abiertas <= 1, 'no se acumulan conexiones abiertas');
  transporte.cerrar();
  const intentos = estado.intentos;
  await new Promise(listo => setTimeout(listo, 150));
  assert.equal(estado.intentos, intentos, 'cerrado el transporte, no vuelve a conectar');
  assert.equal(estado.abiertas, 0);
});

test('reconectar() corta las conexiones largas y las abre de nuevo', async () => {
  const { estado, peticion } = conexionMuda();
  const transporte = crearTransporteHttp({ uid: 'celular', peticion, esperaReintento: 5, silencioMaximo: 1e9 });
  transporte.escuchar('a', () => {});
  transporte.escucharHijos('b', () => {});
  await esperarHasta(() => estado.intentos === 2, 2000, 'no abrió las dos conexiones');
  transporte.reconectar();
  await esperarHasta(() => estado.intentos === 4, 2000, 'no abrió otras dos al reconectar');
  assert.equal(estado.abiertas, 2);
  transporte.cerrar();
});

test('el servidor local solo sirve la web: ni el repositorio, ni el plan, ni el material de referencia', async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    const estado = async ruta => (await fetch(`${base}${ruta}`)).status;
    // Lo que necesita la web.
    for (const ruta of ['/', '/index.html', '/public/tablero.html', '/public/jugador.html', '/src/engine/index.js', '/src/data/tablero.json', '/public/visuales/CREDITOS.md']) {
      assert.equal(await estado(ruta), 200, `${ruta} se sirve`);
    }
    // Lo que no debe salir de la laptop (el servidor escucha en toda la wifi).
    for (const ruta of ['/PLAN.md', '/CLAUDE.md', '/package.json', '/trabajoParalelo.md', '/Documentos/', '/Documentos/x.pdf', '/.git/config', '/.gitignore', '/tests/red-http.test.js', '/tools/serve.js', '/docs/DISENO.md', '/visuales-originales/x.png']) {
      assert.equal(await estado(ruta), 404, `${ruta} no se sirve`);
    }
    // Y no se sale de la carpeta con «..» (ni escrito de otra manera).
    for (const ruta of ['/public/../PLAN.md', '/public/%2e%2e/PLAN.md', '/src/..%2fPLAN.md', '/public/..%5cPLAN.md']) {
      assert.notEqual(await estado(ruta), 200, `${ruta} no se sirve`);
    }
  } finally {
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
});
