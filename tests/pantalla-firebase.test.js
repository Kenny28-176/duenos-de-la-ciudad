// El modo «por internet» de punta a punta, en un Chrome de verdad: el tablero (su página) abre una sala en la imitación de Firebase
// (tools/firebase-falso.js, que aplica las reglas de database.rules.json), un celular (otra página) entra por el enlace del QR, elige
// ficha y juega, y otro celular es un cliente de Node con la cabeza de un bot. Usa lo mismo que con Firebase de verdad: el
// EventSource del navegador, el inicio de sesión anónimo y las reglas. Se salta si no hay Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarDatos } from '../src/data/cargar.js';
import { crearMotor } from '../src/engine/index.js';
import { crearCliente } from '../src/net/cliente.js';
import { codificar, sinSecretos } from '../src/net/codec.js';
import { crearTransporteFirebase } from '../src/net/firebase.js';
import { crearFirebaseFalso } from '../tools/firebase-falso.js';
import { FuenteDeEventos } from '../tools/fuente-de-eventos.js';
import { buscarChrome, iniciarNavegador } from '../tools/navegador.js';
import { crearServidor } from '../tools/serve.js';
import { esperarHasta, ponerCabeza } from './ayuda-red.js';

const motor = crearMotor(await cargarDatos());
const motivo = buscarChrome() === null ? 'no hay Chrome en este ordenador' : false;
const espera = ms => new Promise(listo => setTimeout(listo, ms));

const pulsar = (p, texto, ambito = 'button') => p.eval((t, a) => {
  const b = [...document.querySelectorAll(a)].find(x => x.textContent.includes(t) && !x.disabled);
  if (!b) return false;
  b.click();
  return true;
}, texto, ambito);

async function pulsarCuandoEste(p, texto, ambito = 'button', ms = 15000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await pulsar(p, texto, ambito)) return;
    await espera(40);
  }
  throw new Error(`No se pudo pulsar «${texto}». En pantalla: ${(await p.eval(() => document.body.innerText)).slice(0, 400)}`);
}

const escribir = (p, selector, valor) => p.eval((s, v) => {
  const campo = document.querySelector(s);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, v);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}, selector, valor);

async function esperarQue(p, funcion, ms, mensaje, ...argumentos) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await p.eval(funcion, ...argumentos)) return;
    await espera(50);
  }
  throw new Error(mensaje);
}

test('por Firebase: el tablero abre la sala, un celular entra por el QR y juega, y al cerrar la sala no queda nada', { skip: motivo, timeout: 150000 }, async () => {
  const servidor = crearServidor();
  await new Promise(listo => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const falso = crearFirebaseFalso();
  const direccionFalsa = await falso.arrancar();
  const nav = await iniciarNavegador({ puerto: 9400 + Math.floor(Math.random() * 400) });
  let otro = null;
  try {
    const tablero = await nav.abrir(`${base}/public/tablero.html?velocidad=60&sala=1&depurar=1&red=firebase&firebase=${encodeURIComponent(direccionFalsa)}`, { ancho: 1366, alto: 800, idioma: 'es' });
    await tablero.esperarSelector('.vestibulo .codigo', 30000);
    const codigo = await tablero.eval(() => document.querySelector('.vestibulo .codigo').textContent);
    assert.match(codigo, /^[BCDFGHJKLMNPRSTVWXZ]{4}$/);
    // La sala está en «Firebase», a nombre del uid anónimo del tablero.
    const meta = falso.datos().salas[codigo].meta;
    const uidTablero = await tablero.eval(() => JSON.parse(localStorage.getItem('duenos:firebase-tablero')).uid);
    assert.equal(meta.anfitrion, uidTablero);
    // El enlace del QR lleva al celular a la misma red.
    const enlace = await tablero.eval(() => window.duenos.almacen.leer().sala.url);
    assert.match(enlace, /\?sala=[A-Z]{4}&red=firebase&firebase=/);

    // Un celular de verdad entra por ese enlace (desde esta misma máquina), escribe su nombre y elige ficha.
    const ana = await nav.abrir(`${base}/public/jugador.html${new URL(enlace).search}&depurar=1`, { ancho: 390, alto: 844, idioma: 'es' });
    await ana.esperarSelector('.campo-nombre', 30000);
    await escribir(ana, '.campo-nombre', 'Ana');
    await pulsarCuandoEste(ana, 'Entrar a la sala');
    await ana.esperarSelector('.fichas-elegir', 15000);
    await ana.eval(() => [...document.querySelectorAll('.ficha-elegir')].find(b => b.textContent.includes('Toro')).click());

    // Otro celular: un cliente de Node, también por la imitación de Firebase, que juega con la cabeza de un bot.
    const datos = new Map();
    const transporte = await crearTransporteFirebase({
      config: falso.config(), almacen: { getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) },
      crearFuente: url => new FuenteDeEventos(url, { reintento: 30 }), esperaReintento: 30,
    });
    const beto = crearCliente({ transporte, motor, codigo });
    otro = { beto, transporte };
    await beto.enviar({ type: 'unirse', nombre: 'Beto', ficha: 'rata' });
    ponerCabeza(beto, { motor });
    await tablero.esperarSelector('.vestibulo .lista-jugadores li', 20000, 2);
    await esperarQue(tablero, () => window.duenos.sala().anfitrion.estado().jugadores.j1?.ficha === 'toro', 10000, 'el tablero no apuntó la ficha de Ana');
    await pulsarCuandoEste(tablero, 'Empezar', '.vestibulo button');

    // Empieza la partida: el celular de Ana la ve, y su dinero es el del tablero.
    await ana.esperarSelector('.partida', 20000);
    await esperarQue(ana, () => window.duenos.cliente().datos().alDia, 10000, 'el celular de Ana no está al día');
    const dineroTablero = await tablero.eval(() => window.duenos.sala().anfitrion.estado().jugadores.j1.dinero);
    await esperarQue(ana, d => Number(document.querySelector('.dinero-grande')?.textContent.replace(/\D/g, '')) === d, 10000, 'el dinero no coincide', dineroTablero);

    // Ana juega su turno con sus botones cuando le toque (tirar y lo que venga), y luego un bot juega por ella.
    const fin = Date.now() + 40000;
    let tiro = false;
    while (!tiro && Date.now() < fin) {
      tiro = await pulsar(ana, 'Tirar los dados', '.dock button');
      if (!tiro) await espera(100);
    }
    assert.ok(tiro, 'a Ana le tocó tirar y pudo hacerlo');
    await esperarQue(tablero, () => window.duenos.sala().anfitrion.estado().turno?.dados !== null || window.duenos.sala().anfitrion.estado().turnos > 1, 15000, 'la tirada de Ana no llegó al tablero');
    await tablero.eval(() => [...document.querySelectorAll('.jugadores .jugador')].find(j => j.textContent.includes('Ana')).querySelector('.delegar').click());
    assert.deepEqual(await tablero.eval(() => [...window.duenos.sala().delegados]), ['j1'], 'un bot juega por Ana');
    await esperarHasta(() => (beto.datos().estado?.turnos ?? 0) >= 6, 60000, 'la partida no avanza');

    // Lo que ven los dos celulares es lo que tiene el tablero.
    await tablero.eval(() => window.duenos.almacen.cambiar({ pausado: true }));
    await espera(800);
    const delTablero = JSON.parse(await tablero.eval(() => JSON.stringify(window.duenos.sala().anfitrion.estado())));
    await esperarHasta(() => beto.datos().alDia && beto.datos().estado.turnos === delTablero.turnos, 15000, 'Beto no está al día');
    assert.deepEqual(codificar(beto.datos().estado), codificar(sinSecretos(delTablero)));
    await esperarQue(ana, t => { const d = window.duenos.cliente().datos(); return d.alDia && d.estado.turnos === t; }, 15000, 'Ana no está al día', delTablero.turnos);
    // Ninguna petición fue rechazada por las reglas: el juego solo hace lo que las reglas permiten.
    const rechazadas = falso.registro.filter(p => p.estado >= 400);
    assert.deepEqual(rechazadas, [], 'peticiones rechazadas');

    // Cerrar la sala: los celulares se enteran y en la base de datos no queda nada de ella.
    const apuntadas = () => tablero.eval(() => JSON.parse(localStorage.getItem('duenos:salas') ?? '[]'));
    assert.deepEqual(await apuntadas(), [codigo], 'el tablero apunta la sala que abrió');
    await pulsarCuandoEste(tablero, 'Cerrar la sala', '.controles button');
    await ana.esperarSelector('[data-pantalla="cerrada"]', 15000);
    await esperarHasta(() => beto.datos().sala === false, 15000, 'Beto no se enteró del cierre');
    assert.equal(falso.datos()?.salas?.[codigo], undefined, 'la sala se borró');
    assert.deepEqual(await apuntadas(), []);

    // Las salas que el tablero dejó abiertas al cerrar la página se borran al volver a abrirlo, si ya tienen más de 12 horas (y no
    // se tocan las recientes, ni las de otros tableros).
    falso.poner('salas/XZTV/meta', { anfitrion: uidTablero, creada: Date.now() - 13 * 3600 * 1000, version: 1 });
    falso.poner('salas/XZTW/meta', { anfitrion: uidTablero, creada: Date.now() - 3600 * 1000, version: 1 });
    falso.poner('salas/XZTX/meta', { anfitrion: 'otro-tablero', creada: 1, version: 1 });
    await tablero.eval(() => localStorage.setItem('duenos:salas', JSON.stringify(['XZTV', 'XZTW', 'XZTX'])));
    // (sin «sala=1», para que al volver no abra otra sala)
    await tablero.eval(() => setTimeout(() => { location.search = location.search.replace('sala=1&', ''); }, 10));
    await esperarHasta(() => !falso.datos()?.salas?.XZTV, 20000, 'la sala vieja no se borró');
    assert.ok(falso.datos().salas.XZTW, 'la reciente sigue');
    assert.ok(falso.datos().salas.XZTX, 'la de otro tablero sigue');
    await esperarQue(tablero, () => JSON.parse(localStorage.getItem('duenos:salas') ?? '[]').join() === 'XZTW', 10000, 'la lista no quedó como debía');
    assert.deepEqual(nav.errores, [], 'sin errores de JavaScript');
  } finally {
    otro?.beto.cerrar();
    otro?.transporte.cerrar();
    nav.cerrar();
    await falso.cerrar();
    servidor.closeAllConnections();
    await new Promise(listo => servidor.close(listo));
  }
});
