// Recuperar la partida si se recarga la página del tablero (anfitrion.instantanea() y la opción «recuperar»): el estado vuelve entero,
// con el azar y los mazos que no se publican, así que la partida sigue idéntica; y los celulares, que no se enteran de nada, siguen
// jugando con las cuentas (publicaciones y acuses) donde estaban.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { decidirBot, quienActua } from '../src/engine/bots.js';
import { fichasParaPartida } from '../src/engine/simulador.js';
import { crearAnfitrion } from '../src/net/anfitrion.js';
import { crearCliente } from '../src/net/cliente.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';
import { comprobarEspejos, conLimite, esperarHasta, paso, ponerCabeza } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());
const { ctx } = motor;

// Una partida entre tres bots, llevada por el propio tablero: cada paso, la jugada de un bot y su publicación.
async function avanzar(anfitrion, pasos) {
  for (let k = 0; k < pasos && anfitrion.estado().fase === 'juego'; k++) {
    const quien = quienActua(anfitrion.estado());
    anfitrion.accionPropia(quien === null ? { type: 'cerrarSubasta' } : decidirBot(ctx, anfitrion.estado(), quien));
    await conLimite(anfitrion.siguientePaso(), 3000, 'el tablero esperó una acción que no llegó');
    await anfitrion.publicar();
  }
}

async function salaDeBots(base, semilla) {
  const anfitrion = crearAnfitrion({ transporte: base.conectar('tablero'), motor, codigo: 'BCDF', semilla });
  await anfitrion.abrir();
  const fichas = fichasParaPartida(motor, semilla, 3);
  fichas.forEach((ficha, k) => anfitrion.accionPropia({ type: 'unirse', id: `b${k + 1}`, nombre: `Bot ${k + 1}`, ficha, bot: true }));
  anfitrion.accionPropia({ type: 'configurar', opciones: { meta: 3000 } });
  anfitrion.accionPropia({ type: 'empezar' });
  for (let k = 0; k < 5; k++) await anfitrion.siguientePaso();
  await anfitrion.publicar();
  return anfitrion;
}

test('la instantánea es JSON y, restaurada, devuelve el estado entero y la partida sigue idéntica', async () => {
  const original = await salaDeBots(crearBaseDeDatos(), 17);
  await avanzar(original, 60);
  assert.equal(original.estado().fase, 'juego', 'la partida sigue en marcha al guardarla');

  // Lo que se guardaría en el navegador.
  const guardado = JSON.stringify(original.instantanea());
  const foto = JSON.parse(guardado);
  assert.ok(guardado.length < 200000, `la instantánea pesa ${guardado.length} bytes`);

  // Otro tablero (en otra base, para que no se pisen) la recupera.
  const recuperado = crearAnfitrion({ transporte: crearBaseDeDatos().conectar('tablero'), motor, codigo: 'BCDF', recuperar: foto });
  assert.deepEqual(recuperado.estado(), original.estado(), 'el estado vuelve entero, con el azar y los mazos');
  assert.equal(recuperado.version(), original.version());
  assert.equal(recuperado.publicaciones(), original.publicaciones());
  assert.notEqual(recuperado.estado(), foto.estado, 'no comparte el objeto con lo guardado');
  await recuperado.abrir();
  assert.equal(recuperado.publicaciones(), original.publicaciones() + 1, 'al abrir publica una vez más, sin volver a contar desde cero');

  // Con las mismas jugadas, los dos van por el mismo camino: lo que no se publica (el azar, los mazos) también se recuperó.
  for (let k = 0; k < 80 && original.estado().fase === 'juego'; k++) {
    await avanzar(original, 1);
    await avanzar(recuperado, 1);
    assert.deepEqual(recuperado.estado(), original.estado(), `se separan en el paso ${k + 1}`);
  }
  assert.ok(original.estado().turnos > foto.estado.turnos, 'siguieron jugando');
});

test('sin «recuperar» todo empieza de cero, y la instantánea de una sala nueva ya tiene la forma de lo que se guarda', async () => {
  const anfitrion = crearAnfitrion({ transporte: crearBaseDeDatos().conectar('tablero'), motor, codigo: 'BCDF', semilla: 3 });
  assert.equal(anfitrion.estado().fase, 'sala');
  assert.equal(anfitrion.publicaciones(), 0);
  assert.deepEqual([...anfitrion.jugadores()], []);
  const foto = JSON.parse(JSON.stringify(anfitrion.instantanea()));
  assert.deepEqual(Object.keys(foto).sort(), ['atendidas', 'estado', 'jugadores', 'numeroDeError', 'publicaciones', 'version']);
});

test('tras recargar el tablero, los celulares siguen jugando donde estaban: la sala se queda en el buzón y el tablero nuevo la retoma', async () => {
  const base = crearBaseDeDatos();
  const codigo = 'BCDF';
  // El tablero de antes: se envuelve su transporte para poder «apagarlo» sin borrar la sala, como hace una recarga de la página.
  const t = base.conectar('tablero');
  let dejarDeEscuchar = () => {};
  const transporteViejo = { ...t, escucharHijos: (ruta, cb) => { dejarDeEscuchar = t.escucharHijos(ruta, cb); return dejarDeEscuchar; } };
  const viejo = crearAnfitrion({ transporte: transporteViejo, motor, codigo, semilla: 9 });
  await viejo.abrir();
  const fichas = fichasParaPartida(motor, 9, 3);
  const celulares = fichas.map((_, k) => crearCliente({ transporte: base.conectar(`celular-${k}`), motor, codigo }));
  const enCamino = new Set();
  celulares.forEach(c => ponerCabeza(c, { motor, enCamino }));
  await base.reposo();
  const asentar = () => base.reposo();
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Celular ${k + 1}`, ficha: fichas[k] });
  let sala = { anfitrion: viejo, celulares };
  for (let k = 0; k < 3; k++) await paso(sala, { asentar });
  viejo.accionPropia({ type: 'configurar', opciones: { meta: 4000 } });
  viejo.accionPropia({ type: 'empezar' });
  await paso(sala, { asentar });
  await paso(sala, { asentar });
  for (let k = 0; k < 40 && viejo.estado().fase === 'juego'; k++) {
    if (quienActua(viejo.estado()) === null) viejo.accionPropia({ type: 'cerrarSubasta' });
    await paso(sala, { asentar });
  }
  assert.equal(viejo.estado().fase, 'juego');
  const turnosAntes = viejo.estado().turnos;
  const publicacionesAntes = viejo.publicaciones();
  const acuseAntes = celulares.map(c => c.datos().vista.atendidas);
  assert.ok(acuseAntes.every(n => n > 0), 'cada celular ya tiene acciones atendidas');

  // La página del tablero se recarga: lo guardado es JSON, el tablero viejo desaparece y uno nuevo recupera la sala.
  const foto = JSON.parse(JSON.stringify(viejo.instantanea()));
  dejarDeEscuchar();
  await base.reposo();
  const nuevo = crearAnfitrion({ transporte: base.conectar('tablero'), motor, codigo, recuperar: foto });
  await nuevo.abrir();
  sala = { anfitrion: nuevo, celulares };
  await esperarHasta(() => celulares.every(c => c.datos().alDia && c.datos().n === nuevo.publicaciones()), 5000, 'los celulares no recibieron la publicación del tablero nuevo');
  assert.ok(nuevo.publicaciones() > publicacionesAntes, 'las publicaciones siguen contando hacia arriba, no empiezan de cero');
  assert.deepEqual(celulares.map(c => c.datos().vista.atendidas), acuseAntes, 'el acuse de cada celular sigue donde estaba');
  assert.deepEqual(nuevo.estado().turnos, turnosAntes);
  assert.deepEqual([...nuevo.jugadores()].sort(), [...viejo.jugadores()].sort(), 'cada celular sigue siendo el mismo jugador');

  // Siguen jugando: los celulares deciden con lo que ven y el tablero nuevo atiende y publica.
  for (let k = 0; k < 40 && nuevo.estado().fase === 'juego'; k++) {
    if (quienActua(nuevo.estado()) === null) nuevo.accionPropia({ type: 'cerrarSubasta' });
    await paso(sala, { asentar });
  }
  assert.ok(nuevo.estado().turnos > turnosAntes, 'la partida avanzó tras la recarga');
  comprobarEspejos(sala);
  celulares.forEach(c => c.cerrar());
  await Promise.allSettled([...enCamino]);
  await nuevo.cerrar();
});
