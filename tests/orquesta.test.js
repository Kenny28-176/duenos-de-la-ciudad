// El organizador de la partida en red (src/net/orquesta.js): los bots de la sala juegan solos, las subastas se cierran y los
// celulares siguen siendo los que mandan en lo suyo. Se prueba con una sala mixta: dos bots y dos celulares.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { decidirBot, quienActua } from '../src/engine/bots.js';
import { crearAnfitrion } from '../src/net/anfitrion.js';
import { crearCliente } from '../src/net/cliente.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';
import { crearOrquesta } from '../src/net/orquesta.js';
import { comprobarEspejos, conLimite, esperarHasta } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());
const { ctx } = motor;

// Una sala con dos celulares y dos bots que se han unido por el tablero.
async function salaMixta({ semilla = 4 } = {}) {
  const base = crearBaseDeDatos();
  const anfitrion = crearAnfitrion({ transporte: base.conectar('tablero'), motor, codigo: 'BCDF', semilla });
  await anfitrion.abrir();
  const celulares = ['celular-0', 'celular-1'].map(uid => crearCliente({ transporte: base.conectar(uid), motor, codigo: 'BCDF' }));
  await base.reposo();
  const fichas = ['rata', 'toro', 'oso', 'burbuja'];
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Celular ${k}`, ficha: fichas[k] });
  await base.reposo();
  await anfitrion.siguientePaso();
  await anfitrion.siguientePaso();
  anfitrion.accionPropia({ type: 'unirse', id: 'b1', nombre: 'Bot 1', ficha: fichas[2], bot: true });
  anfitrion.accionPropia({ type: 'unirse', id: 'b2', nombre: 'Bot 2', ficha: fichas[3], bot: true });
  anfitrion.accionPropia({ type: 'configurar', opciones: { meta: 3000 } });
  anfitrion.accionPropia({ type: 'empezar' });
  for (let k = 0; k < 4; k++) await anfitrion.siguientePaso();
  await anfitrion.publicar();
  await base.reposo();
  return { base, anfitrion, celulares };
}

test('los bots juegan solos cuando les toca, y esperan a los celulares cuando les toca a ellos', async () => {
  const { base, anfitrion, celulares } = await salaMixta();
  const orquesta = crearOrquesta({ anfitrion, motor, velocidad: () => 1000 });
  // Cada celular decide con la cabeza de un bot, con lo que le llega por la red.
  const jugadas = new Map();
  celulares.forEach(c => c.alCambiar(({ estado, alDia, miId, n }) => {
    if (!alDia || !miId || estado.fase !== 'juego' || jugadas.get(c.uid) === n || quienActua(estado) !== miId) return;
    jugadas.set(c.uid, n);
    c.enviar(decidirBot(ctx, estado, miId));
  }));
  const quienes = { bots: 0, celulares: 0, propias: 0 };
  let pasos = 0;
  while (anfitrion.estado().fase === 'juego') {
    if (++pasos > 20000) throw new Error('la partida no termina');
    const hecho = await conLimite(orquesta.paso(), 5000, 'la partida se quedó parada');
    if (hecho.uid === 'tablero') quienes.propias++;
    else quienes.celulares++;
    if (/^b\d$/.test(hecho.accion.id) && hecho.uid === 'tablero') quienes.bots++;
    await anfitrion.publicar();
    await base.reposo();
  }
  assert.equal(anfitrion.estado().fase, 'fin');
  assert.ok(quienes.bots > 50 && quienes.celulares > 50, JSON.stringify(quienes));
  comprobarEspejos({ anfitrion, celulares });
});

test('una subasta entre personas en la que nadie puja se cierra sola, desierta', async () => {
  // Dos celulares y ningún bot: nadie más puede mover la partida.
  const base = crearBaseDeDatos();
  const anfitrion = crearAnfitrion({ transporte: base.conectar('tablero'), motor, codigo: 'BCDF', semilla: 3 });
  await anfitrion.abrir();
  const celulares = ['celular-0', 'celular-1'].map(uid => crearCliente({ transporte: base.conectar(uid), motor, codigo: 'BCDF' }));
  await base.reposo();
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Celular ${k}`, ficha: ['rata', 'toro'][k] });
  await base.reposo();
  await anfitrion.siguientePaso();
  await anfitrion.siguientePaso();
  anfitrion.accionPropia({ type: 'configurar', opciones: { dadosDePrueba: true } });
  anfitrion.accionPropia({ type: 'empezar' });
  await anfitrion.siguientePaso();
  await anfitrion.siguientePaso();
  await anfitrion.publicar();
  await base.reposo();

  // Quien tiene el turno cae en la calle 3 (libre) y, desde su celular, decide no comprarla.
  const turno = anfitrion.estado().turno.id;
  anfitrion.accionPropia({ type: 'tirar', id: turno, dados: [1, 2] });
  await anfitrion.siguientePaso();
  await anfitrion.publicar();
  await base.reposo();
  const celular = celulares.find(c => c.datos().miId === turno);
  await celular.enviar({ type: 'noComprar' });
  const orquesta = crearOrquesta({ anfitrion, motor, velocidad: () => 1000 }); // 10 s de subasta → 10 ms
  const noCompra = await conLimite(orquesta.paso(), 3000, 'no llegó el noComprar');
  assert.deepEqual(noCompra.eventos.map(e => e.type), ['noCompra', 'subasta']);
  assert.ok(anfitrion.estado().subasta, 'hay una subasta en marcha');

  // Nadie puja: la orquesta la cierra al acabarse el tiempo.
  const cierre = await conLimite(orquesta.paso(), 3000, 'la subasta no se cerró sola');
  assert.equal(cierre.accion.type, 'cerrarSubasta');
  assert.ok(cierre.eventos.some(e => e.type === 'subastaDesierta'));
  assert.equal(anfitrion.estado().subasta, null);
  assert.equal(anfitrion.estado().props[3].dueno, null, 'la calle sigue libre');
});

test('si alguien puja antes de tiempo, el cierre programado se descarta (el estado cambió)', async () => {
  const base = crearBaseDeDatos();
  const anfitrion = crearAnfitrion({ transporte: base.conectar('tablero'), motor, codigo: 'BCDF', semilla: 3 });
  await anfitrion.abrir();
  const celulares = ['celular-0', 'celular-1'].map(uid => crearCliente({ transporte: base.conectar(uid), motor, codigo: 'BCDF' }));
  await base.reposo();
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Celular ${k}`, ficha: ['rata', 'toro'][k] });
  await base.reposo();
  await anfitrion.siguientePaso();
  await anfitrion.siguientePaso();
  anfitrion.accionPropia({ type: 'configurar', opciones: { dadosDePrueba: true } });
  anfitrion.accionPropia({ type: 'empezar' });
  await anfitrion.siguientePaso();
  await anfitrion.siguientePaso();
  const turno = anfitrion.estado().turno.id;
  anfitrion.accionPropia({ type: 'tirar', id: turno, dados: [1, 2] });
  await anfitrion.siguientePaso();
  anfitrion.accionPropia({ type: 'noComprar', id: turno });
  await anfitrion.siguientePaso();
  assert.ok(anfitrion.estado().subasta);

  // Se programa el cierre (a los 10 s reales), pero antes llega una puja: el cierre ya no vale.
  const orquesta = crearOrquesta({ anfitrion, motor, velocidad: () => 1 });
  const espera = orquesta.paso();
  const otro = anfitrion.estado().orden.find(id => id !== turno);
  anfitrion.accionPropia({ type: 'pujar', id: otro, cantidad: 30 });
  const hecho = await conLimite(espera, 2000, 'no llegó la puja');
  assert.equal(hecho.accion.type, 'pujar');
  assert.equal(anfitrion.estado().subasta.puja, 30, 'la subasta sigue, con la puja');
  await new Promise(listo => setTimeout(listo, 50));
  assert.ok(anfitrion.estado().subasta, 'el cierre programado no llegó a aplicarse');
});

test('la orquesta no hace nada por su cuenta antes de empezar la partida ni cuando la sala se cierra', async () => {
  const base = crearBaseDeDatos();
  const anfitrion = crearAnfitrion({ transporte: base.conectar('tablero'), motor, codigo: 'BCDF', semilla: 1 });
  await anfitrion.abrir();
  const orquesta = crearOrquesta({ anfitrion, motor, velocidad: () => 1000 });
  const espera = orquesta.paso();
  await new Promise(listo => setTimeout(listo, 30));
  assert.equal(anfitrion.version(), 0, 'sin partida, no hace nada');
  await anfitrion.cerrar();
  assert.equal(await conLimite(espera, 1000, 'no terminó'), null);
  await esperarHasta(() => true);
});
