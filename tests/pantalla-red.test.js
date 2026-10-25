// La partida con celulares de punta a punta: el tablero (la página en Chrome sin ventana) abre una sala, entran celulares (por
// ahora, clientes de Node por HTTP), el tablero empieza la partida y los celulares juegan. Se salta si no hay Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearCliente } from '../src/net/cliente.js';
import { codificar, sinSecretos } from '../src/net/codec.js';
import { crearTransporteHttp } from '../src/net/http.js';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';
import { crearServidor } from '../tools/serve.js';
import { esperarHasta, ponerCabeza } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());
const motivo = buscarChrome() === null ? 'no hay Chrome en este ordenador' : false;
// Con DEPURAR=1 se imprime cuánto tarda cada fase (para ver dónde se va el tiempo).
const inicio = Date.now();
const marca = fase => { if (process.env.DEPURAR) console.log(`  [${((Date.now() - inicio) / 1000).toFixed(1)} s] ${fase}`); };

test('el tablero abre una sala, entran celulares, empieza la partida y juegan hasta que se ven las mismas cosas', { skip: motivo, timeout: 120000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  const celulares = [];
  try {
    const pestana = await nav.abrir(`${base}/public/tablero.html?velocidad=60&sala=1&depurar=1`, { ancho: 1366, alto: 800, idioma: 'es' });

    marca('página abierta');
    // El vestíbulo: el código de la sala y su QR.
    await pestana.esperarSelector('.vestibulo .codigo', 30000);
    marca('vestíbulo en pantalla');
    const codigo = await pestana.eval(() => document.querySelector('.vestibulo .codigo').textContent);
    assert.match(codigo, /^[BCDFGHJKLMNPRSTVWXZ]{4}$/);
    assert.ok(await pestana.eval(() => document.querySelector('.vestibulo .qr svg') !== null), 'hay un código QR');
    assert.match(await pestana.eval(() => document.querySelector('.vestibulo .ayuda').textContent), /jugador\.html/);
    // «Empezar» no se puede con menos de dos jugadores.
    assert.equal(await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Empezar')).disabled), true);

    // Entran dos celulares.
    const entrar = async (k, ficha) => {
      const transporte = crearTransporteHttp({ uid: `celular-${k}`, base, esperaReintento: 30 });
      const celular = crearCliente({ transporte, motor, codigo });
      celulares.push({ celular, transporte });
      await celular.enviar({ type: 'unirse', nombre: `Ana ${k}`, ficha });
      return celular;
    };
    await entrar(0, 'toro');
    await entrar(1, 'rata');
    marca('celulares enviaron unirse');
    await pestana.esperarSelector('.vestibulo .lista-jugadores li', 20000, 2);
    marca('el tablero ve 2 jugadores');
    assert.deepEqual(await pestana.eval(() => [...document.querySelectorAll('.vestibulo .lista-jugadores .nombre')].map(e => e.textContent)), ['Ana 0', 'Ana 1']);
    await esperarHasta(() => celulares.every(({ celular }) => celular.datos().miId !== null), 10000, 'los celulares no recibieron su jugador');
    marca('los celulares tienen su jugador');
    assert.deepEqual(celulares.map(({ celular }) => celular.datos().miId), ['j1', 'j2']);

    // Se añade un bot desde el tablero y se empieza.
    await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Añadir un bot')).click());
    await pestana.esperarSelector('.vestibulo .lista-jugadores li', 20000, 3);
    assert.equal(await pestana.eval(() => document.querySelectorAll('.vestibulo .etiqueta-bot').length), 1);
    // Un bot de más se quita con la × de su fila, y se puede volver a añadir.
    await pestana.eval(() => [...document.querySelectorAll('.vestibulo .lista-jugadores li')].find(li => li.querySelector('.etiqueta-bot')).querySelector('.quitar').click());
    await esperarHasta(() => celulares.every(({ celular }) => celular.datos().estado?.ids.length === 2), 10000, 'el bot no salió de la sala');
    await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Añadir un bot')).click());
    await pestana.esperarSelector('.vestibulo .lista-jugadores li', 20000, 3);
    assert.equal(await pestana.eval(() => document.querySelectorAll('.vestibulo .etiqueta-bot').length), 1);
    celulares.forEach(({ celular }) => ponerCabeza(celular, { motor }));
    await pestana.eval(() => [...document.querySelectorAll('.vestibulo button')].find(b => b.textContent.includes('Empezar')).click());

    // La partida: el panel con los 3 jugadores y el registro, y los celulares ya están en juego.
    await pestana.esperarSelector('.jugadores .jugador', 30000, 3);
    marca('empezó la partida en el tablero');
    assert.equal(await pestana.eval(() => document.querySelector('.vestibulo')), null, 'el vestíbulo desaparece');
    await pestana.esperarSelector('.registro li', 30000, 4);
    await esperarHasta(() => celulares.every(({ celular }) => celular.datos().estado?.fase === 'juego'), 15000, 'los celulares no ven la partida empezada');
    marca('los celulares ven la partida empezada');

    // El interruptor «que un bot juegue por esta persona»: solo en las personas (no en el bot), y se activa y se desactiva.
    assert.equal(await pestana.eval(() => document.querySelectorAll('.jugadores .delegar').length), 2, 'una por cada persona, ninguna para el bot');
    const delegados = () => pestana.eval(() => [...window.duenos.sala().delegados]);
    const interruptor = () => pestana.eval(() => document.querySelector('.jugadores .delegar').getAttribute('aria-pressed'));
    // La pantalla se repinta unos milisegundos después: se espera a que el botón muestre lo esperado.
    const verComo = async esperado => {
      const fin = Date.now() + 3000;
      while (Date.now() < fin && (await interruptor()) !== esperado) await new Promise(listo => setTimeout(listo, 30));
      assert.equal(await interruptor(), esperado);
    };
    await verComo('false');
    await pestana.eval(() => document.querySelector('.jugadores .delegar').click());
    assert.equal((await delegados()).length, 1);
    await verComo('true');
    await pestana.eval(() => document.querySelector('.jugadores .delegar').click());
    assert.deepEqual(await delegados(), [], 'se devuelve el control');
    await verComo('false');
    marca('interruptor del bot probado');

    // Se deja jugar un rato: el tablero anima, publica, y los celulares (con la cabeza de un bot) deciden con lo que les llega.
    await esperarHasta(() => celulares.every(({ celular }) => (celular.datos().estado?.turnos ?? 0) >= 6), 60000, 'la partida no avanza');
    marca('6 turnos jugados');
    await pestana.eval(() => window.duenos.almacen.cambiar({ pausado: true }));
    await new Promise(listo => setTimeout(listo, 600)); // acaba el paso que estuviera en marcha

    // Lo que ve cada celular es lo que hay en el tablero (menos los secretos), y el dinero cuadra.
    const delTablero = await pestana.eval(() => JSON.stringify(window.duenos.sala().anfitrion.estado()));
    const estadoTablero = JSON.parse(delTablero);
    await esperarHasta(() => celulares.every(({ celular }) => celular.datos().alDia && celular.datos().estado.turnos === estadoTablero.turnos), 15000, 'los celulares no están al día');
    for (const { celular } of celulares) assert.deepEqual(codificar(celular.datos().estado), codificar(sinSecretos(estadoTablero)));
    assert.ok(estadoTablero.fase === 'juego' || estadoTablero.fase === 'fin');
    assert.equal(estadoTablero.orden.length, 3);

    marca('estados comparados');
    // Cerrar la sala: los celulares se enteran y el tablero vuelve a la demostración.
    await pestana.eval(() => [...document.querySelectorAll('.controles button')].find(b => b.textContent.includes('Cerrar la sala')).click());
    await esperarHasta(() => celulares.every(({ celular }) => celular.datos().sala === false), 15000, 'los celulares no se enteraron del cierre');
    await pestana.esperarSelector('.controles .nueva', 20000);
    assert.deepEqual(nav.errores, [], 'sin errores de JavaScript');
  } finally {
    for (const { celular, transporte } of celulares) { celular.cerrar(); transporte.cerrar(); }
    nav.cerrar();
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
});
