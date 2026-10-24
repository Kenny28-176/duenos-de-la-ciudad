// Partidas completas entre bots, de 2 a 8 jugadores y con distintas opciones de sala. En cada paso, el simulador
// comprueba las reglas que se cumplen siempre (el dinero de cada jugador cuadra con sus movimientos, nadie queda en
// negativo, no aparecen edificios ni acciones de la nada y quien quiebra no conserva nada) y falla si alguna se rompe.
// Además, los bots nunca piden una acción que el motor rechace y todas las partidas terminan con un ganador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { fichasParaPartida, simularPartida } from '../src/engine/simulador.js';

const motor = crearMotor(await cargarDatos());

const SALAS = {
  'la sala por defecto': {},
  'sin habilidades': { habilidades: false },
  'sin mercado vivo ni subastas': { mercado: false, subastas: false },
  'partida rápida con la meta corta': { partidaRapida: true, meta: motor.ctx.eco.metas.corta },
  'sin meta (hasta la bancarrota o el tiempo)': { meta: null },
};

for (const [nombre, sala] of Object.entries(SALAS)) {
  test(`partidas entre bots de 2 a 8 jugadores: ${nombre}`, () => {
    for (let jugadores = 2; jugadores <= 8; jugadores++) {
      for (let k = 0; k < 3; k++) {
        const semilla = 1000 * jugadores + k;
        const r = simularPartida(motor, { semilla, fichas: fichasParaPartida(motor, semilla, jugadores), sala });
        assert.deepEqual(r.erroresBots, [], `semilla ${semilla}`);
        assert.ok(r.ganador, `semilla ${semilla}: la partida terminó sin ganador`);
      }
    }
  });
}

test('la misma semilla da la misma partida', () => {
  const jugar = () => simularPartida(motor, { semilla: 4242, fichas: fichasParaPartida(motor, 4242, 4) });
  assert.deepEqual(jugar(), jugar());
});
