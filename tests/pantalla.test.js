// La pantalla del tablero de verdad, en Chrome sin ventana (tools/navegador.js): arranca, dibuja las 40 casillas, juega una
// partida de demostración y se puede cambiar de idioma, todo sin errores de JavaScript. Si el ordenador no tiene Chrome,
// estas pruebas se saltan solas (en la integración continua de GitHub sí lo hay).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServidor } from '../tools/serve.js';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';

const hayChrome = buscarChrome() !== null;
const motivo = hayChrome ? false : 'no hay Chrome en este ordenador';

test('la pantalla del tablero arranca, juega una demostración y cambia de idioma sin errores', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/public/tablero.html?velocidad=16&semilla=3&jugadores=5&depurar=1`;
    const pestana = await nav.abrir(url, { ancho: 1366, alto: 768, idioma: 'es' });
    // Sin ?idioma=, la pantalla usa el idioma del navegador: se comprueba más abajo con la portada del navegador en español.

    // El tablero: 40 casillas, las fichas de los 5 jugadores y su panel.
    await pestana.esperarSelector('.tablero [data-casilla]', 30000, 40);
    await pestana.esperarSelector('.tablero .ficha', 30000, 5);
    await pestana.esperarSelector('.jugador', 30000, 5);
    assert.equal(await pestana.eval(() => document.querySelector('h1').textContent), 'Dueños de la Ciudad');
    assert.equal(await pestana.eval(() => document.title), 'Dueños de la Ciudad · Tablero');

    // La partida avanza: el registro se llena y se oyen dados, dinero y compras.
    await pestana.esperarSelector('.registro li', 30000, 4);
    await pestana.esperarSelector('.tablero .dueno', 60000);
    const dados = await pestana.eval(() => document.querySelectorAll('.dados .dado').length);
    assert.ok(dados >= 2, `se ven los dados (${dados})`);

    // Pausa: no se añaden líneas nuevas mientras tanto.
    await pestana.eval(() => [...document.querySelectorAll('.controles button')].find(b => b.textContent.trim() === 'Pausa').click());
    await new Promise(listo => setTimeout(listo, 700)); // deja acabar el paso en marcha
    const antes = await pestana.eval(() => document.querySelector('.registro ol').textContent);
    await new Promise(listo => setTimeout(listo, 600));
    assert.equal(await pestana.eval(() => document.querySelector('.registro ol').textContent), antes, 'en pausa, el registro no cambia');

    // Idioma: pasa a inglés, con las casillas y los controles traducidos.
    await pestana.eval(() => [...document.querySelectorAll('.idioma button')].find(b => b.textContent === 'EN').click());
    await pestana.esperarSelector('.cabecera h1');
    await new Promise(listo => setTimeout(listo, 300));
    assert.equal(await pestana.eval(() => document.querySelector('h1').textContent), 'City Owners');
    assert.equal(await pestana.eval(() => document.documentElement.lang), 'en');
    assert.ok(await pestana.eval(() => document.querySelector('[data-casilla="0"]').textContent.includes('Start')));
    assert.ok(await pestana.eval(() => document.querySelector('[data-casilla="20"]').textContent.includes('Stock Exchange')));
    assert.equal(await pestana.eval(() => document.querySelectorAll('.tablero [data-casilla]').length), 40);

    assert.deepEqual(nav.errores, [], 'sin errores de JavaScript');
  } finally {
    nav.cerrar();
    servidor.close();
  }
});

test('la pantalla se adapta a 8 jugadores y a una pantalla baja sin dejar los controles fuera', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const pestana = await nav.abrir(`http://127.0.0.1:${servidor.address().port}/public/tablero.html?velocidad=16&semilla=11&jugadores=8`, { ancho: 1366, alto: 768 });
    await pestana.esperarSelector('.jugador', 30000, 8);
    const medidas = await pestana.eval(() => {
      const caja = e => e.getBoundingClientRect();
      const botones = [...document.querySelectorAll('.controles button')];
      return {
        alto: window.innerHeight,
        ancho: window.innerWidth,
        abajoDelUltimoBoton: Math.max(...botones.map(b => caja(b).bottom)),
        desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tablero: caja(document.querySelector('.caja-tablero')).width,
        derechaDelTablero: caja(document.querySelector('.caja-tablero')).right,
        izquierdaDelPanel: caja(document.querySelector('.panel')).left,
      };
    });
    assert.ok(medidas.abajoDelUltimoBoton <= medidas.alto, `los controles caben (${medidas.abajoDelUltimoBoton} de ${medidas.alto})`);
    assert.equal(medidas.desborde, 0, 'no hay desplazamiento horizontal');
    assert.ok(medidas.derechaDelTablero <= medidas.izquierdaDelPanel + 1, 'el tablero no tapa el panel');
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.close();
  }
});

test('sin parámetro, la pantalla usa el idioma del navegador', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    for (const [idioma, titulo] of [['en', 'City Owners'], ['es', 'Dueños de la Ciudad']]) {
      const pestana = await nav.abrir(`http://127.0.0.1:${servidor.address().port}/public/tablero.html?velocidad=16`, { idioma });
      await pestana.esperarSelector('.cabecera h1', 30000);
      assert.equal(await pestana.eval(() => document.querySelector('h1').textContent), titulo, idioma);
    }
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.close();
  }
});

test('el sonido arranca con el primer toque, suena durante la partida, se apaga y se recuerda', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/public/tablero.html?velocidad=2&semilla=3&jugadores=4&depurar=1`;
    const pestana = await nav.abrir(url, { ancho: 1366, alto: 768 });
    await pestana.esperarSelector('.sonido button', 30000);
    const sonaron = () => pestana.eval(() => window.duenos.sonido.estado().sonaron);
    // Antes de que alguien toque la pantalla no hay audio, y la partida es muda.
    assert.deepEqual(await pestana.eval(() => ({ listo: window.duenos.sonido.estado().listo, pulsado: document.querySelector('.sonido button').getAttribute('aria-pressed') })), { listo: false, pulsado: 'true' });
    assert.equal(await sonaron(), 0);

    // El primer toque crea el audio (el Chrome de prueba no pide gesto) y desde ahí suenan los dados, los pasos, las monedas…
    await pestana.eval(() => document.dispatchEvent(new Event('pointerdown')));
    const fin = Date.now() + 30000;
    while (Date.now() < fin && (await sonaron()) < 12) await new Promise(listo => setTimeout(listo, 250));
    assert.ok((await sonaron()) >= 12, 'durante la partida suenan cosas');
    assert.equal(await pestana.eval(() => window.duenos.sonido.estado().listo), true);

    // Apagarlo: no suena nada más, el botón lo dice y se recuerda en el navegador.
    await pestana.eval(() => document.querySelector('.sonido button').click());
    await new Promise(listo => setTimeout(listo, 300));
    const apagado = await sonaron();
    await new Promise(listo => setTimeout(listo, 1500));
    assert.equal(await sonaron(), apagado, 'apagado, no suena');
    assert.equal(await pestana.eval(() => document.querySelector('.sonido button').getAttribute('aria-pressed')), 'false');
    assert.deepEqual(await pestana.eval(() => JSON.parse(localStorage.getItem('duenos:sonido'))), { efectos: false, voz: false });

    // Y al abrir la página otra vez, sigue apagado.
    await pestana.eval(() => location.reload());
    await pestana.esperarSelector('.sonido button', 30000);
    assert.equal(await pestana.eval(() => document.querySelector('.sonido button').getAttribute('aria-pressed')), 'false');
    assert.equal(await pestana.eval(() => window.duenos.sonido.estado().activo), false);

    // La voz del narrador se puede encender y apagar (si este navegador tiene síntesis de voz) y nunca da errores.
    if (await pestana.eval(() => window.duenos.voz.disponible)) {
      await pestana.eval(() => document.querySelectorAll('.sonido button')[1].click());
      assert.equal(await pestana.eval(() => window.duenos.voz.activa()), true);
      await pestana.eval(() => document.querySelectorAll('.sonido button')[1].click());
      assert.equal(await pestana.eval(() => window.duenos.voz.activa()), false);
    }
    assert.deepEqual(nav.errores, []);
  } finally {
    nav.cerrar();
    servidor.close();
  }
});
