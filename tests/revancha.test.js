// El límite de tiempo y «jugar otra vez» en el motor (src/engine/juego.js): la opción limiteMinutos, el aviso de la última ronda
// (finPorTiempo) y la revancha, que devuelve la partida acabada a la sala con los mismos jugadores, fichas y opciones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { decidirBot, quienActua } from '../src/engine/bots.js';
import { crearMotor } from '../src/engine/index.js';
import { ACCIONES_DE_CELULAR } from '../src/net/protocolo.js';

const motor = crearMotor(await cargarDatos());
const FICHAS = ['rata', 'toro', 'oso'];

function aplicar(s, accion) {
  const r = motor.paso(s, accion);
  assert.equal(r.error, null, `${accion.type}: ${r.error?.mensaje}`);
  return r;
}

// Una sala con tres bots (con su ficha) y las opciones dadas, todavía sin empezar.
function sala(opciones = {}) {
  let s = motor.nuevaPartida({ sala: 'TEST', semilla: 17 });
  FICHAS.forEach((ficha, k) => { s = aplicar(s, { type: 'unirse', id: `j${k + 1}`, nombre: `Jugador ${k + 1}`, ficha, bot: k > 0 }).state; });
  return aplicar(s, { type: 'configurar', opciones }).state;
}

// Juega con los bots hasta que se cumpla la condición (o se acabe la partida). Devuelve el estado y todos los eventos.
function jugar(s, condicion = () => false, maximo = 30000) {
  const eventos = [];
  for (let i = 0; i < maximo && s.fase === 'juego' && !condicion(s); i++) {
    const quien = quienActua(s);
    const r = aplicar(s, quien === null ? { type: 'cerrarSubasta' } : decidirBot(motor.ctx, s, quien));
    s = r.state;
    eventos.push(...r.events);
  }
  return { s, eventos };
}

test('el límite de tiempo es una opción de la sala: minutos enteros o ninguno', () => {
  const s = sala();
  assert.equal(s.opciones.limiteMinutos, null, 'sin límite por defecto');
  assert.equal(aplicar(s, { type: 'configurar', opciones: { limiteMinutos: 45 } }).state.opciones.limiteMinutos, 45);
  assert.equal(aplicar(aplicar(s, { type: 'configurar', opciones: { limiteMinutos: 90 } }).state, { type: 'configurar', opciones: { limiteMinutos: null } }).state.opciones.limiteMinutos, null);
  for (const malo of [0, -5, 1.5, '60', 601, true, NaN]) {
    const r = motor.paso(s, { type: 'configurar', opciones: { limiteMinutos: malo } });
    assert.equal(r.error?.codigo, 'limite', `${String(malo)} no vale`);
    assert.equal(r.error.datos.maximo, 600);
  }
});

test('al acabarse el tiempo se anuncia la última ronda una sola vez, y la partida acaba al cerrarse esa ronda', () => {
  const { s: enMarcha } = jugar(aplicar(sala({ meta: null }), { type: 'empezar' }).state, e => e.turnos >= 12);
  assert.equal(enMarcha.fase, 'juego');
  assert.equal(enMarcha.ultimaRonda, false);
  const r = aplicar(enMarcha, { type: 'finPorTiempo' });
  assert.deepEqual(r.events, [{ type: 'ultimaRonda' }]);
  assert.equal(r.state.ultimaRonda, true);
  assert.deepEqual(aplicar(r.state, { type: 'finPorTiempo' }).events, [], 'repetirlo no hace nada');

  const rondaAlAnunciar = r.state.ronda;
  const { s: fin, eventos } = jugar(r.state);
  assert.equal(fin.fase, 'fin');
  assert.equal(fin.motivoFin, 'tiempo');
  assert.equal(fin.ronda, rondaAlAnunciar + 1, 'se juega la ronda en curso entera y ni un turno más');
  assert.ok(eventos.some(e => e.type === 'fin' && e.motivo === 'tiempo'));
});

test('el aviso de tiempo solo vale mientras se juega', () => {
  assert.equal(motor.paso(sala(), { type: 'finPorTiempo' }).error.codigo, 'fuera_de_juego');
});

test('la revancha solo vale cuando la partida ha terminado, y no es cosa de los celulares', () => {
  const enSala = sala();
  assert.equal(motor.paso(enSala, { type: 'revancha' }).error.codigo, 'no_ha_terminado');
  const { s: enMarcha } = jugar(aplicar(enSala, { type: 'empezar' }).state, e => e.turnos >= 5);
  assert.equal(motor.paso(enMarcha, { type: 'revancha' }).error.codigo, 'no_ha_terminado');
  assert.equal(ACCIONES_DE_CELULAR.has('revancha'), false);
  assert.equal(ACCIONES_DE_CELULAR.has('finPorTiempo'), false);
});

test('la revancha devuelve a la sala a los mismos jugadores, con sus fichas y las mismas opciones, y se puede jugar otra vez', () => {
  const opciones = { meta: 2500, mercado: false, subastas: true, habilidades: true, partidaRapida: true, limiteMinutos: 45 };
  let s = aplicar(sala(opciones), { type: 'empezar' }).state;
  s = jugar(s).s;
  assert.equal(s.fase, 'fin');
  const antes = { ids: [...s.ids], nombres: s.ids.map(id => s.jugadores[id].nombre), fichas: s.ids.map(id => s.jugadores[id].ficha), bots: s.ids.map(id => s.jugadores[id].bot === true), rng: s.rng };

  const r = aplicar(s, { type: 'revancha' });
  s = r.state;
  assert.deepEqual(r.events, []);
  assert.equal(s.fase, 'sala');
  assert.equal(s.sala, 'TEST', 'la misma sala');
  assert.deepEqual(s.ids, antes.ids);
  assert.deepEqual(s.ids.map(id => s.jugadores[id].nombre), antes.nombres);
  assert.deepEqual(s.ids.map(id => s.jugadores[id].ficha), antes.fichas);
  assert.deepEqual(s.ids.map(id => s.jugadores[id].bot === true), antes.bots);
  assert.deepEqual(s.opciones, { ...motor.OPCIONES, ...opciones }, 'las mismas opciones');
  assert.equal(s.rng, antes.rng, 'el azar sigue donde lo dejó la partida anterior (no se repite la misma partida)');
  // Todo lo demás, como una sala recién abierta (con los jugadores dentro): ni dinero, ni calles, ni turno, ni ganador.
  const limpia = motor.nuevaPartida({ sala: 'TEST', semilla: antes.rng });
  assert.deepEqual(Object.keys(s).sort(), Object.keys(limpia).sort(), 'ni una pieza de la partida anterior se queda');
  for (const id of s.ids) {
    const j = s.jugadores[id];
    assert.deepEqual([j.dinero, j.casilla, j.calabozo, j.quebrado, j.salvoconductos, j.acciones], [0, 0, null, false, 0, {}]);
  }
  assert.deepEqual([s.props, s.turno, s.ganador, s.motivoFin, s.ronda, s.turnos, s.ultimaRonda, s.deudas, s.tratos], [{}, null, null, null, 0, 0, false, [], {}]);
  assert.deepEqual(s.banco, limpia.banco, 'el banco vuelve a tener todo');

  // Se puede cambiar una opción y empezar otra partida, que se juega hasta el final, y otra revancha después.
  s = aplicar(s, { type: 'configurar', opciones: { meta: 1500, limiteMinutos: null } }).state;
  assert.equal(s.opciones.meta, 1500);
  s = aplicar(s, { type: 'empezar' }).state;
  assert.equal(s.fase, 'juego');
  assert.deepEqual([...s.orden].sort(), [...antes.ids].sort());
  s = jugar(s).s;
  assert.equal(s.fase, 'fin');
  assert.equal(aplicar(s, { type: 'revancha' }).state.fase, 'sala');
});

test('quien no estaba en la partida (alguien que se salió antes de empezar) no vuelve con la revancha', () => {
  let s = sala();
  s = aplicar(s, { type: 'unirse', id: 'j4', nombre: 'Otro', ficha: 'burbuja' }).state;
  s = aplicar(s, { type: 'salir', id: 'j4' }).state;
  s = jugar(aplicar(s, { type: 'empezar' }).state, () => false).s;
  const r = aplicar(s, { type: 'revancha' }).state;
  assert.deepEqual(r.ids, ['j1', 'j2', 'j3']);
  assert.equal(r.jugadores.j4, undefined);
});
