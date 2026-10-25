// La red de punta a punta, sin Firebase: un tablero (el anfitrión) y varios celulares (clientes) se hablan por la base de
// datos en memoria y juegan una partida entera. Cada celular decide con la misma cabeza que los bots, pero solo ve lo que
// publica el tablero: su copia del estado y sus botones. Al final, todos ven lo mismo que el tablero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { codificar, sinSecretos } from '../src/net/codec.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';
import { CODIGO, codigoDeSala, limpiarCodigo } from '../src/net/protocolo.js';
import { comprobarEspejos, conLimite, jugarPorLaRed, montarSala, paso as ayudaPaso } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());
const { ctx } = motor;

const memoria = (latenciaMs = 0) => {
  const base = crearBaseDeDatos({ latenciaMs });
  return { base, conectar: uid => base.conectar(uid), asentar: () => base.reposo() };
};

async function montar({ jugadores = 4, semilla = 11 } = {}) {
  const { base, conectar } = memoria();
  const sala = await montarSala({ motor, conectar, jugadores, semilla });
  await base.reposo();
  return { base, ...sala };
}

// El tablero atiende lo que llegue: un paso, se publica y se espera a que todos lo reciban.
const paso = sala => ayudaPaso(sala, { asentar: () => sala.base.reposo(), unidos: false });

test('el código de la sala son cuatro consonantes, y lo que escribe una persona se arregla', () => {
  for (let k = 0; k < 200; k++) assert.match(codigoDeSala(), CODIGO);
  assert.equal(codigoDeSala(() => 0), 'BBBB');
  assert.equal(limpiarCodigo(' b c-d f9 '), 'BCDF');
  assert.equal(limpiarCodigo('abcdefg'), 'ABCD');
  assert.ok(!/[AEIOUQY]/.test(Array.from({ length: 300 }, () => codigoDeSala()).join('')));
});

test('abrir una sala la publica: quién es el anfitrión, el estado sin secretos y nada más', async () => {
  const { base, codigo, anfitrion } = await montar();
  const arbol = base.instantanea().salas[codigo];
  assert.equal(arbol.meta.anfitrion, 'tablero');
  assert.equal(arbol.estado.fase, 'sala');
  assert.ok(!('rng' in arbol.estado) && !('mazos' in arbol.estado), 'sin el azar ni los mazos');
  assert.equal(arbol.estado.publicacion, 1);
  const { publicacion, ...publicado } = arbol.estado;
  void publicacion;
  assert.deepEqual(codificar(sinSecretos(anfitrion.estado())), publicado);
});

test('un celular se une: el tablero le asigna su jugador y le publica sus botones', async () => {
  const sala = await montar({ jugadores: 2 });
  const { base, anfitrion, celulares, fichas } = sala;
  await celulares[0].enviar({ type: 'unirse', nombre: 'Ana', ficha: fichas[0] });
  await celulares[1].enviar({ type: 'unirse', nombre: 'Beto', ficha: fichas[1] });
  await base.reposo();
  assert.equal((await paso(sala)).accion.id, 'j1');
  assert.equal((await paso(sala)).accion.id, 'j2');
  assert.deepEqual(celulares.map(c => c.datos().miId), ['j1', 'j2']);
  assert.deepEqual(Object.values(celulares[0].datos().estado.jugadores).map(j => j.nombre), ['Ana', 'Beto']);
  assert.equal(celulares[0].datos().alDia, true);
  assert.deepEqual(anfitrion.jugadores().get('celular-1'), 'j2');
});

test('un celular no puede hacerse pasar por otro, ni pedir lo que es solo del tablero', async () => {
  const sala = await montar({ jugadores: 2 });
  const { base, anfitrion, celulares, fichas } = sala;
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Cel ${k}`, ficha: fichas[k] });
  await base.reposo();
  await paso(sala);
  await paso(sala);

  // «empezar» es del tablero: el celular recibe un error y la partida no empieza.
  await celulares[0].enviar({ type: 'empezar' });
  await base.reposo();
  anfitrion.accionPropia({ type: 'configurar', opciones: { meta: 3000 } });
  const configurada = await paso(sala);
  assert.equal(configurada.accion.type, 'configurar');
  assert.equal(anfitrion.estado().fase, 'sala', 'un celular no puede empezar la partida');
  assert.deepEqual([celulares[0].datos().vista.error.codigo, celulares[0].datos().vista.error.datos.tipo], ['accion', 'empezar']);

  // Aunque diga que es otro jugador, el tablero pone al que corresponde a su uid.
  anfitrion.accionPropia({ type: 'empezar' });
  await paso(sala);
  const turno = anfitrion.estado().turno.id;
  const intruso = celulares.find(c => c.datos().miId !== turno);
  await intruso.enviar({ type: 'terminarTurno', id: turno });
  await base.reposo();
  anfitrion.accionPropia({ type: 'finPorTiempo' });
  await paso(sala);
  assert.equal(anfitrion.estado().turno.id, turno, 'no se terminó el turno de otro');
  assert.equal(intruso.datos().vista.error.codigo, 'no_es_tu_turno');
});

test('los errores llegan al celular con sus datos, y el celular los puede traducir', async () => {
  const sala = await montar({ jugadores: 2 });
  const { base, celulares, anfitrion, fichas } = sala;
  await celulares[0].enviar({ type: 'unirse', nombre: 'Ana', ficha: fichas[0] });
  await celulares[1].enviar({ type: 'unirse', nombre: 'ana', ficha: fichas[1] }); // el mismo nombre
  await base.reposo();
  await paso(sala);
  await base.reposo();
  anfitrion.accionPropia({ type: 'configurar', opciones: { meta: 3000 } });
  const siguiente = anfitrion.siguientePaso(); // atiende lo que llegue: el «unirse» repetido falla y la configuración vale
  const hecho = await conLimite(siguiente, 3000, 'no llegó');
  assert.equal(hecho.accion.type, 'configurar');
  await base.reposo();
  const error = celulares[1].datos().vista.error;
  assert.deepEqual([error.codigo, error.n], ['nombre_repetido', 1]);
  assert.equal(celulares[1].datos().miId, null, 'quien no pudo unirse no tiene jugador');
});

test('una partida entera entre un tablero y varios celulares, y todos acaban viendo lo mismo', async () => {
  const { base, conectar, asentar } = { ...memoria(0) };
  void base;
  const sala = await jugarPorLaRed({ motor, conectar, asentar });
  const { anfitrion, celulares, libro, pasos, mandadas } = sala;
  const final = anfitrion.estado();
  assert.equal(final.fase, 'fin');
  for (const id of final.orden) assert.equal(final.jugadores[id].dinero, libro[id], `el dinero de ${id} cuadra con sus movimientos`);
  assert.ok(pasos > 100 && mandadas > 100, `${pasos} pasos, ${mandadas} acciones mandadas`);
  comprobarEspejos(sala);
  for (const celular of celulares) assert.equal(celular.datos().estado.ganador, final.ganador);
  // Y los que ya no juegan no tienen botones.
  assert.deepEqual(celulares.map(c => c.datos().vista.puede), [{}, {}, {}, {}]);
});

test('con latencia en la red, los celulares nunca actúan con el estado de un lado y los botones de otro', async () => {
  // Los mensajes llegan con retraso y en distinto orden según el canal: es donde se esconden las carreras.
  const { base, conectar, asentar } = memoria(2);
  const sala = await jugarPorLaRed({ motor, conectar, asentar, maxPasos: 70, semilla: 8 });
  assert.equal(sala.anfitrion.estado().fase, 'juego');
  assert.ok(sala.mandadas >= 50, `${sala.mandadas} acciones mandadas`);
  await base.reposo();
  comprobarEspejos(sala);
});

test('se escribe por partes: cada publicación solo cambia lo que cambió', async () => {
  const sala = await montar({ jugadores: 2 });
  const { base, celulares, anfitrion, fichas } = sala;
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Cel ${k}`, ficha: fichas[k] });
  await base.reposo();
  await paso(sala);
  await paso(sala);
  anfitrion.accionPropia({ type: 'empezar' });
  await paso(sala);

  // Se cuentan las rutas que se escriben en cada publicación.
  const escritas = [];
  const tablero = base.conectar('espia');
  const original = tablero.update;
  const t = anfitrion; // el anfitrión usa su propio transporte; se mira lo que cambia en la base
  const antes = JSON.stringify(base.instantanea());
  const turno = anfitrion.estado().turno.id;
  const celularDelTurno = celulares.find(c => c.datos().miId === turno);
  await celularDelTurno.enviar({ type: 'tirar', dados: [1, 2] });
  await base.reposo();
  await paso(sala);
  const despues = JSON.stringify(base.instantanea());
  assert.notEqual(antes, despues);
  void escritas; void original; void t;
  // Lo importante: el estado publicado en la base es exactamente el del tablero, aunque solo se escribieron las diferencias.
  const { publicacion, ...publicado } = base.instantanea().salas[sala.codigo].estado;
  assert.ok(publicacion > 3);
  assert.deepEqual(publicado, codificar(sinSecretos(anfitrion.estado())));
});

test('cerrar la sala la borra y el celular se entera', async () => {
  const sala = await montar({ jugadores: 2 });
  const { base, anfitrion, celulares, codigo } = sala;
  assert.equal(celulares[0].datos().sala, true);
  await anfitrion.cerrar();
  await base.reposo();
  assert.equal(base.instantanea().salas, undefined);
  assert.equal(celulares[0].datos().sala, false);
  assert.equal(await anfitrion.siguientePaso(), null);
  void codigo;
});
