// El acuse de recibo del tablero: cada celular sabe cuándo se ha atendido su acción (aplicada o rechazada) por un contador en su vista
// («atendidas»). No basta con ver llegar otra publicación: si el tablero estaba animando la jugada de otro, la mía todavía no se ha
// aplicado, y el celular volvería a ofrecer los botones con datos viejos (con «construir», eso permitiría repetir la acción).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';
import { montarSala, paso, publicar } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());

test('«atendidas» sube cuando el tablero atiende una acción, aplicada o rechazada, y no con las publicaciones de las de otros', async () => {
  const base = crearBaseDeDatos();
  const sala = await montarSala({ motor, conectar: uid => base.conectar(uid), jugadores: 2, semilla: 3 });
  const { anfitrion, celulares, fichas } = sala;
  const asentar = () => base.reposo();
  const atendidas = () => celulares.map(c => c.datos().vista.atendidas);

  // Entrar cuenta como una acción atendida.
  for (const [k, c] of celulares.entries()) await c.enviar({ type: 'unirse', nombre: `Celular ${k}`, ficha: fichas[k] });
  await paso(sala, { asentar });
  await paso(sala, { asentar });
  assert.deepEqual(atendidas(), [1, 1]);
  anfitrion.accionPropia({ type: 'configurar', opciones: {} });
  anfitrion.accionPropia({ type: 'empezar' });
  await paso(sala, { asentar });
  await paso(sala, { asentar });
  assert.deepEqual(atendidas(), [1, 1], 'lo que manda el propio tablero no es de ningún celular');

  // El celular del turno y el otro mandan «tirar»; al otro no le toca. Llegan primero la del que no tiene el turno y luego la buena.
  const turno = anfitrion.estado().turno.id;
  const [conTurno, sinTurno] = celulares[0].datos().miId === turno ? [celulares[0], celulares[1]] : [celulares[1], celulares[0]];
  await sinTurno.enviar({ type: 'tirar' });
  await conTurno.enviar({ type: 'tirar' });
  await base.reposo();

  // Se publica otra cosa (como al terminar de animar la jugada de alguien): nadie recibe acuse de lo que aún no se atendió.
  await publicar(sala, { asentar });
  assert.deepEqual(atendidas(), [1, 1], 'una publicación ajena no acusa recibo');

  // El tablero atiende: la del que no tiene el turno se rechaza (acuse y error, sin esperar a publicar) y la buena se aplica.
  const hecho = await paso(sala, { asentar });
  assert.equal(hecho.accion.type, 'tirar');
  assert.equal(conTurno.datos().vista.atendidas, 2, 'su acción se aplicó y ya se publicó');
  assert.equal(sinTurno.datos().vista.atendidas, 2, 'la rechazada también se atendió');
  assert.equal(sinTurno.datos().vista.error.codigo, 'no_es_tu_turno');
  assert.equal(conTurno.datos().vista.error, undefined);
  assert.ok(conTurno.datos().alDia && sinTurno.datos().alDia);
});
