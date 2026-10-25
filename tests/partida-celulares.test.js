// Partidas enteras jugadas por la interfaz real: celulares de Chrome (en español y en inglés) con un jugador «al azar» que pulsa lo
// que ve (tools/jugar-con-celulares.js), junto a bots y el tablero de siempre. Comprueba que ninguna se atasca (un estado en el que la
// mesa espera algo que el celular no deja hacer), que no hay errores de JavaScript y que al acabar todos ven el final. Se salta si no
// hay Chrome. Para jugar más partidas o más largas: node tools/jugar-con-celulares.js --partidas 6 --meta 14000
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jugarPartida } from '../tools/jugar-con-celulares.js';
import { buscarChrome } from '../tools/navegador.js';

const motivo = buscarChrome() === null ? 'no hay Chrome en este ordenador' : false;

for (const [semilla, celulares, bots] of [[5, 3, 1], [12, 2, 2]]) {
  test(`una partida entera por la interfaz de ${celulares} celulares y ${bots} bot${bots > 1 ? 's' : ''} (semilla ${semilla}) acaba sin atascos ni errores`, { skip: motivo, timeout: 240000 }, async () => {
    const { problemas, resumen, estado } = await jugarPartida({ celulares, bots, semilla, meta: 3000, maximo: 150, silencioso: true });
    assert.deepEqual(problemas, []);
    assert.equal(estado.fase, 'fin');
    assert.ok(resumen.clics > 50, `se hicieron ${resumen.clics} clics`);
  });
}
