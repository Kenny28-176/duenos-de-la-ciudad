// Ayudas para las pruebas de la red (no es una prueba: no acaba en .test.js). Monta un tablero y varios celulares sobre el
// transporte que se les dé (la base en memoria o HTTP) y los hace jugar una partida con la cabeza de los bots, pero con lo
// que les llega por la red.
import assert from 'node:assert/strict';
import { decidirBot, quienActua } from '../src/engine/bots.js';
import { fichasParaPartida } from '../src/engine/simulador.js';
import { crearAnfitrion } from '../src/net/anfitrion.js';
import { crearCliente } from '../src/net/cliente.js';
import { codificar, sinSecretos } from '../src/net/codec.js';

export const espera = ms => new Promise(listo => setTimeout(listo, ms));

// Espera a que se cumpla una condición (mirándola a menudo) y falla con un mensaje si tarda demasiado.
export async function esperarHasta(condicion, ms = 5000, mensaje = 'no ocurrió a tiempo') {
  const fin = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > fin) throw new Error(mensaje);
    await espera(2);
  }
}

// Una promesa con límite de tiempo: si se cuelga, la prueba falla con un mensaje en vez de quedarse esperando.
export async function conLimite(promesa, ms, mensaje) {
  let reloj;
  try {
    return await Promise.race([promesa, new Promise((_, ko) => { reloj = setTimeout(() => ko(new Error(mensaje)), ms); })]);
  } finally {
    clearTimeout(reloj); // si no, el temporizador retiene el proceso hasta que se cumpla
  }
}

// Hace jugar a un celular con la cabeza de un bot, pero con lo que le llega por la red: cuando le toca, decide y manda la
// acción. «enCamino» recoge lo que ha mandado y aún no ha llegado; «alMandar» avisa de cada acción.
export function ponerCabeza(celular, { motor, enCamino = new Set(), alMandar = () => {} }) {
  const jugadas = new Map();
  return celular.alCambiar(({ estado, vista, alDia, miId, n }) => {
    if (!alDia || !miId || estado.fase !== 'juego' || jugadas.get(celular.uid) === n) return;
    if (quienActua(estado) !== miId) return;
    jugadas.set(celular.uid, n);
    const accion = decidirBot(motor.ctx, estado, miId);
    // Lo que quiere hacer tiene que estar entre sus botones (menos las que se piden con varios datos).
    if (!['usarHabilidad', 'proponerTrato'].includes(accion.type)) assert.ok(accion.type in vista.puede, `${miId} quiere «${accion.type}» y no lo tiene: ${JSON.stringify(vista.puede)}`);
    alMandar(accion);
    const envio = celular.enviar(accion).finally(() => enCamino.delete(envio));
    enCamino.add(envio);
  });
}

// conectar(uid) da un transporte para esa identidad.
export async function montarSala({ motor, conectar, jugadores = 4, semilla = 11, codigo = 'BCDF' }) {
  const anfitrion = crearAnfitrion({ transporte: conectar('tablero'), motor, codigo, semilla });
  await anfitrion.abrir();
  const fichas = fichasParaPartida(motor, semilla, jugadores);
  const celulares = fichas.map((ficha, k) => crearCliente({ transporte: conectar(`celular-${k}`), motor, codigo }));
  return { anfitrion, celulares, fichas, codigo };
}

// Publica lo que ha cambiado y espera a que todos los celulares lo hayan recibido (el estado y sus botones).
// asentar: lo que haga falta para que lleguen los mensajes (con la base en memoria, base.reposo()); por defecto, esperar.
export async function publicar({ anfitrion, celulares }, { asentar = null, unidos = true } = {}) {
  await anfitrion.publicar();
  if (asentar) await asentar();
  await esperarHasta(
    () => celulares.every(c => { const d = c.datos(); return d.estado !== null && d.n >= anfitrion.publicaciones() && (unidos ? d.alDia : d.miId === null || d.alDia); }),
    5000, 'los celulares no recibieron la publicación',
  );
}

// El tablero atiende lo que llegue: un paso, se publica y se espera a que todos lo reciban.
export async function paso(sala, opciones = {}) {
  const hecho = await conLimite(sala.anfitrion.siguientePaso(), 5000, 'el tablero esperó una acción que nunca llegó');
  await publicar(sala, { unidos: false, ...opciones });
  return hecho;
}

// Una partida entera (o hasta «maxPasos») entre un tablero y 4 celulares que juegan con la cabeza de un bot.
export async function jugarPorLaRed({ motor, conectar, asentar = null, jugadores = 4, semilla = 5, maxPasos = null, meta = 4000 }) {
  const { ctx } = motor;
  const sala = await montarSala({ motor, conectar, jugadores, semilla });
  const { anfitrion, celulares, fichas } = sala;
  const enCamino = new Set(); // lo que los celulares han mandado y aún no ha llegado
  let mandadas = 0;
  celulares.forEach(celular => ponerCabeza(celular, {
    motor, enCamino, alMandar: () => { mandadas++; },
  }));

  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Celular ${k + 1}`, ficha: fichas[k] });
  for (let k = 0; k < jugadores; k++) await paso(sala, { asentar });
  anfitrion.accionPropia({ type: 'configurar', opciones: { meta } });
  anfitrion.accionPropia({ type: 'empezar' });
  await paso(sala, { asentar });
  await paso(sala, { asentar });

  // El dinero de cada jugador tiene que cuadrar con los movimientos de dinero que anotó el tablero.
  const libro = {};
  const contar = e => {
    if (e.type !== 'dinero') return;
    if (e.de !== 'banco') libro[e.de] = (libro[e.de] ?? 0) - e.cantidad;
    if (e.a !== 'banco') libro[e.a] = (libro[e.a] ?? 0) + e.cantidad;
  };
  for (const id of anfitrion.estado().orden) libro[id] = ctx.eco.dineroInicial; // el reparto inicial ya pasó

  let pasos = 0;
  while (anfitrion.estado().fase === 'juego' && (maxPasos === null || pasos < maxPasos)) {
    if (++pasos > 20000) throw new Error('la partida no termina');
    // Si nadie puede pujar, el tablero cierra la subasta (lo que hará con su cuenta atrás).
    if (quienActua(anfitrion.estado()) === null) anfitrion.accionPropia({ type: 'cerrarSubasta' });
    const hecho = await paso(sala, { asentar });
    hecho.eventos.forEach(contar);
  }
  // Cierra con orden: los celulares dejan de reaccionar, se espera a lo que iba por el camino y el tablero cierra la sala.
  const cerrar = async () => {
    celulares.forEach(c => c.cerrar());
    await Promise.allSettled([...enCamino]);
    await anfitrion.cerrar();
  };
  return { ...sala, libro, pasos, mandadas, cerrar };
}

// Todos los celulares ven lo mismo que el tablero (menos los secretos).
export function comprobarEspejos({ anfitrion, celulares }) {
  const delTablero = codificar(sinSecretos(anfitrion.estado()));
  for (const celular of celulares) {
    const { estado, alDia } = celular.datos();
    assert.ok(alDia, `${celular.uid} está al día`);
    assert.deepEqual(codificar(estado), delTablero, `${celular.uid} ve lo mismo que el tablero`);
  }
}
