// El límite de tiempo y «jugar otra vez» en la página del tablero, en un Chrome de verdad: se elige un límite de 45 minutos en la sala,
// el reloj (acelerado con ?reloj=) se agota enseguida, el tablero anuncia la última ronda, la partida acaba por tiempo y ofrece jugar
// otra vez con los mismos jugadores, con las mismas opciones; se juega una segunda partida y se cierra la sala. Se salta si no hay Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';
import { crearServidor } from '../tools/serve.js';

const motivo = buscarChrome() === null ? 'no hay Chrome en este ordenador' : false;

// La pantalla final sale con el evento «fin»; el estado final llega al acabar ese paso, unos instantes después (más con la máquina cargada).
async function esperarEstadoFinal(pestana) {
  const fin = Date.now() + 10000;
  while (Date.now() < fin && (await pestana.eval(() => window.duenos.almacen.leer().estado.fase)) !== 'fin') await new Promise(listo => setTimeout(listo, 50));
  assert.equal(await pestana.eval(() => window.duenos.almacen.leer().estado.fase), 'fin', 'el estado final llegó a la pantalla');
}

test('con límite de tiempo, el tablero avisa de la última ronda, acaba por tiempo y ofrece jugar otra vez con los mismos jugadores', { skip: motivo, timeout: 150000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const pestana = await nav.abrir(`${base}/public/tablero.html?velocidad=10&sala=1&reloj=100000&depurar=1`, { ancho: 1366, alto: 800, idioma: 'es' });
    await pestana.esperarSelector('.vestibulo .codigo', 30000);
    // Lo que dice la cabecera a lo largo de la partida (la última ronda dura poco: se anota cada cambio).
    await pestana.eval(() => {
      window.__cabecera = new Set();
      const notar = () => window.__cabecera.add(document.querySelector('.cabecera p')?.textContent ?? '');
      new MutationObserver(notar).observe(document.querySelector('.cabecera'), { subtree: true, childList: true, characterData: true });
    });

    // Tres bots, y 45 minutos de partida (por defecto, sin límite).
    for (let k = 1; k <= 3; k++) {
      await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Añadir un bot')).click());
      await pestana.esperarSelector('.vestibulo .lista-jugadores li', 20000, k);
    }
    const selectorDeTiempo = () => pestana.eval(() => {
      const etiqueta = [...document.querySelectorAll('.opciones label.meta')].find(l => l.textContent.includes('Tiempo de la partida'));
      return etiqueta.querySelector('select').value;
    });
    assert.equal(await selectorDeTiempo(), 'null', 'sin límite por defecto');
    assert.deepEqual(
      await pestana.eval(() => [...[...document.querySelectorAll('.opciones label.meta')].find(l => l.textContent.includes('Tiempo de la partida')).querySelectorAll('option')].map(o => o.textContent)),
      ['Sin límite', '45 minutos', '60 minutos', '90 minutos'],
    );
    await pestana.eval(() => {
      const select = [...document.querySelectorAll('.opciones label.meta')].find(l => l.textContent.includes('Tiempo de la partida')).querySelector('select');
      select.value = '45';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await selectorDeTiempo(), '45');
    const nombres = await pestana.eval(() => [...document.querySelectorAll('.vestibulo .lista-jugadores .nombre')].map(e => e.textContent));
    assert.equal(nombres.length, 3);

    // Empieza: la cabecera dice cuánto queda, el reloj se agota enseguida y se anuncia la última ronda; la partida acaba por tiempo.
    await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Empezar')).click());
    await pestana.esperarSelector('.final', 90000);
    await esperarEstadoFinal(pestana);
    const cabeceras = await pestana.eval(() => [...window.__cabecera]);
    assert.ok(cabeceras.some(c => /Quedan 45 min/.test(c)), `la cabecera dice cuánto queda: ${JSON.stringify(cabeceras)}`);
    assert.ok(cabeceras.some(c => /Última ronda/.test(c)), `la cabecera anuncia la última ronda: ${JSON.stringify(cabeceras)}`);
    assert.ok(await pestana.eval(() => window.duenos.almacen.leer().registro.some(l => /última ronda/i.test(l.texto))), 'el narrador cuenta que se acabó el tiempo');
    assert.equal(await pestana.eval(() => window.duenos.almacen.leer().estado.motivoFin), 'tiempo');
    assert.match(await pestana.eval(() => document.querySelector('.final .etiqueta').textContent), /Se acabó el tiempo/);
    assert.deepEqual(await pestana.eval(() => [...document.querySelectorAll('.botones-final button')].map(b => b.textContent)), ['Jugar otra vez', 'Cerrar la sala']);

    // Jugar otra vez: el tablero vuelve a la sala con los mismos jugadores y con los 45 minutos elegidos.
    await pestana.eval(() => [...document.querySelectorAll('.botones-final button')].find(b => b.textContent === 'Jugar otra vez').click());
    await pestana.esperarSelector('.vestibulo .lista-jugadores li', 20000, 3);
    assert.equal(await pestana.eval(() => document.querySelector('.final') === null), true, 'ya no está la pantalla final');
    assert.deepEqual(await pestana.eval(() => [...document.querySelectorAll('.vestibulo .lista-jugadores .nombre')].map(e => e.textContent)), nombres);
    assert.equal(await selectorDeTiempo(), '45', 'las mismas opciones');
    assert.equal(await pestana.eval(() => window.duenos.almacen.leer().modo), 'sala');
    assert.equal(await pestana.eval(() => window.duenos.sala().anfitrion.estado().fase), 'sala');
    assert.equal(await pestana.eval(() => window.duenos.almacen.leer().registro.length), 0, 'el registro empieza de cero');

    // Y se juega otra partida entera.
    await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Empezar')).click());
    await pestana.esperarSelector('.final', 90000);
    await esperarEstadoFinal(pestana);
    assert.equal(await pestana.eval(() => window.duenos.almacen.leer().estado.motivoFin), 'tiempo');
    assert.equal(await pestana.eval(() => window.duenos.almacen.leer().estado.ronda > 1), true);

    // Cerrar la sala devuelve el tablero a la demostración.
    await pestana.eval(() => [...document.querySelectorAll('.botones-final button')].find(b => b.textContent === 'Cerrar la sala').click());
    const fin = Date.now() + 20000;
    while (Date.now() < fin && (await pestana.eval(() => window.duenos.almacen.leer().modo)) !== 'demo') await new Promise(listo => setTimeout(listo, 100));
    assert.equal(await pestana.eval(() => window.duenos.almacen.leer().modo), 'demo');
    assert.equal(await pestana.eval(() => document.querySelector('.final') === null && document.querySelector('.vestibulo') === null), true);
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
});
