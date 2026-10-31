// «Jugar otra vez» por la red, sin Firebase: tras una partida entera entre un tablero y tres celulares, el tablero propone la
// revancha. Los celulares vuelven a la sala con el mismo jugador y la misma ficha (sin escribir nada ni escanear nada) y se juega
// otra partida entera, con todos viendo lo mismo que el tablero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { quienActua } from '../src/engine/bots.js';
import { crearMotor } from '../src/engine/index.js';
import { crearBaseDeDatos } from '../src/net/memoria.js';
import { comprobarEspejos, jugarPorLaRed, paso } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());

test('tras una partida, la revancha devuelve a los celulares a la sala con su ficha, y se juega otra partida entera', async () => {
  const base = crearBaseDeDatos();
  const asentar = () => base.reposo();
  const sala = await jugarPorLaRed({ motor, conectar: uid => base.conectar(uid), asentar, jugadores: 3, semilla: 8, meta: 1500 });
  const { anfitrion, celulares } = sala;
  try {
    assert.equal(anfitrion.estado().fase, 'fin');
    comprobarEspejos(sala);
    const quien = celulares.map(c => c.datos().miId);
    const fichas = anfitrion.estado().ids.map(id => anfitrion.estado().jugadores[id].ficha);
    assert.deepEqual(quien, ['j1', 'j2', 'j3']);

    // El tablero propone otra partida: todos vuelven a la sala, con el mismo jugador y la misma ficha.
    anfitrion.accionPropia({ type: 'revancha' });
    await paso(sala, { asentar });
    assert.equal(anfitrion.estado().fase, 'sala');
    comprobarEspejos(sala);
    assert.deepEqual(celulares.map(c => c.datos().miId), quien, 'cada celular sigue siendo el mismo jugador');
    assert.deepEqual(celulares.map(c => c.datos().estado.jugadores[c.datos().miId].ficha), fichas, 'con la misma ficha');
    assert.equal(celulares.every(c => c.datos().estado.fase === 'sala'), true);

    // Otra partida: se configura, se empieza y los celulares juegan solos hasta el final.
    anfitrion.accionPropia({ type: 'configurar', opciones: { meta: 1500 } });
    anfitrion.accionPropia({ type: 'empezar' });
    await paso(sala, { asentar });
    await paso(sala, { asentar });
    assert.equal(anfitrion.estado().fase, 'juego');
    let pasos = 0;
    while (anfitrion.estado().fase === 'juego') {
      if (++pasos > 20000) throw new Error('la segunda partida no termina');
      if (quienActua(anfitrion.estado()) === null) anfitrion.accionPropia({ type: 'cerrarSubasta' });
      await paso(sala, { asentar });
    }
    assert.equal(anfitrion.estado().fase, 'fin');
    assert.ok(pasos > 30, `se jugó de verdad (${pasos} pasos)`);
    comprobarEspejos(sala);
  } finally {
    await sala.cerrar();
  }
});
