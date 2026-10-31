// El modo TV y los atajos de teclado del tablero, en un Chrome de verdad, a 1920×1080 (una tele): letra más grande en el panel,
// controles escondidos hasta que se mueve el ratón, la tecla T y el botón TV, que se recuerda; y la revisión de accesibilidad.
// Se salta si no hay Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';
import { crearServidor } from '../tools/serve.js';
import { revisarAccesibilidad } from './ayuda-accesibilidad.js';

const motivo = buscarChrome() === null ? 'no hay Chrome en este ordenador' : false;
const espera = ms => new Promise(listo => setTimeout(listo, ms));

async function esperarQue(p, funcion, ms, mensaje, ...argumentos) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await p.eval(funcion, ...argumentos)) return;
    await espera(50);
  }
  throw new Error(mensaje);
}

test('el modo TV agranda el panel, esconde los controles hasta mover el ratón, y se pone y se quita con la tecla T o el botón', { skip: motivo, timeout: 90000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const p = await nav.abrir(`${base}/public/tablero.html?velocidad=4&jugadores=6&semilla=8&depurar=1&tv=1`, { ancho: 1920, alto: 1080, idioma: 'es' });
    await p.esperarSelector('.jugadores .jugador', 30000, 6);
    const tv = () => p.eval(() => document.documentElement.classList.contains('modo-tv'));
    const letra = () => p.eval(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const opacidad = () => p.eval(() => Number(getComputedStyle(document.querySelector('.controles')).opacity));
    assert.equal(await tv(), true, 'con ?tv=1 empieza en modo TV');
    assert.ok((await letra()) >= 21, `la letra del panel crece (${await letra()} px)`);
    assert.equal(await opacidad(), 0, 'sin ratón, los controles no se ven');
    assert.deepEqual(await revisarAccesibilidad(p), [], 'accesibilidad en modo TV');

    // Al mover el ratón salen los controles (y se esconden solos al rato).
    await p.eval(() => window.dispatchEvent(new MouseEvent('mousemove')));
    await esperarQue(p, () => Number(getComputedStyle(document.querySelector('.controles')).opacity) === 1, 3000, 'los controles no salieron');
    await esperarQue(p, () => Number(getComputedStyle(document.querySelector('.controles')).opacity) === 0, 6000, 'los controles no se escondieron');

    // La tecla T lo quita (y se recuerda); el botón TV lo vuelve a poner.
    await p.eval(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' })));
    await esperarQue(p, () => !document.documentElement.classList.contains('modo-tv'), 3000, 'la tecla T no quitó el modo TV');
    assert.equal(await letra(), 16, 'la letra vuelve a ser la de siempre');
    assert.equal(await p.eval(() => localStorage.getItem('duenos:tv')), 'no');
    assert.equal(await opacidad(), 1, 'fuera del modo TV, los controles siempre se ven');
    await p.eval(() => document.querySelector('.controles .tv').click());
    await esperarQue(p, () => document.documentElement.classList.contains('modo-tv'), 3000, 'el botón no puso el modo TV');
    assert.equal(await p.eval(() => document.querySelector('.controles .tv').getAttribute('aria-pressed')), 'true');
    assert.equal(await p.eval(() => localStorage.getItem('duenos:tv')), 'si');

    // La barra espaciadora pausa la partida y la sigue; M apaga y enciende el sonido.
    assert.equal(await p.eval(() => window.duenos.almacen.leer().pausado), false);
    await p.eval(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
    await esperarQue(p, () => window.duenos.almacen.leer().pausado === true, 3000, 'la barra espaciadora no pausó');
    await p.eval(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
    await esperarQue(p, () => window.duenos.almacen.leer().pausado === false, 3000, 'la barra espaciadora no siguió');
    const sonando = await p.eval(() => window.duenos.almacen.leer().sonido.efectos);
    await p.eval(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })));
    await esperarQue(p, s => window.duenos.almacen.leer().sonido.efectos === !s, 3000, 'la tecla M no cambió el sonido', sonando);
    await p.eval(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })));

    // Al volver a abrir el tablero (sin ?tv), se acuerda.
    await p.eval(() => setTimeout(() => { location.search = '?velocidad=4&jugadores=4&depurar=1'; }, 10));
    await espera(500);
    await p.esperarSelector('.jugadores .jugador', 30000, 4);
    assert.equal(await tv(), true, 'el modo TV se recuerda en este navegador');
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
});
